/**
 * 采购计划页面 - 主组件
 * 重构后使用独立组件
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { DeleteWarningModal } from './DeleteWarningModal';
import { ExportFormatModal } from '../common/ExportFormatModal';
import { submitPurchaseApproval } from '../../services/approvalSubmitService';
import type { Approval } from '../../types/approval';
import type { PurchasePlan, PurchasePlanItem } from '../../types/purchase';
import { calculateOverdueAlert } from '../../types/purchase';
import { useUserStore, usePurchasePlanStore, useApprovalStore } from '../../stores';
import { showAlert, showToast } from '@/lib/dialogService';
import { logger } from '@/lib/logger';
import * as XLSX from 'xlsx';
import { getNextPurchaseApplicationCode } from '../../services/apiPurchasePlanService';
import { todayLocal } from '@/lib/dateUtils';

// 导入子组件
import { PurchasePlanFilters } from './PurchasePlanFilters';
import { PurchasePlanTable } from './PurchasePlanTable';
import { CreatePlanModal } from './CreatePlanModal';
import { PlanDetailModal } from './PlanDetailModal';
import { BatchEditModal } from './BatchEditModal';
import { AlertStats } from './AlertStats';
import { usePurchasePlanPageState } from './usePurchasePlanPageState';
import { buildPlaceholderCode } from './codeGenerator';

export function PurchasePlanPage() {
  // 权限控制 - 已取消，所有人可使用所有功能
  const canCreate = true;
  const canDelete = true;
  const canExport = true;

  // 用户列表（用于编辑时获取申请人姓名）
  const users = useUserStore((state) => state.users);
  const loadUsers = useUserStore((state) => state.loadUsers);

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
  }, [users.length, loadUsers]);

  // 从 Zustand Store 获取采购计划数据和操作方法
  const {
    plans: rawPlans,
    isLoading,
    fetchPlans,
    addPlan,
    updatePlan,
    deletePlan,
    deletePlans,
    getPlansWithStatus,
    statusUpdates,
  } = usePurchasePlanStore();

  // 合并 API 数据与审批状态更新
  const purchasePlansData = getPlansWithStatus();

  // 加载采购计划数据
  // 用 mounted ref 避免组件卸载后 setState 警告（P2-4）
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    fetchPlans();
    return () => {
      mountedRef.current = false;
    };
    // fetchPlans 是 zustand 解构的稳定引用，无需加入依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 监听审批状态变化，自动重拉采购计划（确保审批通过/拒绝后采购列表状态即时更新）
  // P1 修复：合并双依赖 (approvalVersion + lastApprovalStatusSum) 为单一字符串签名
  //   原实现 useShallow 包裹 number selector 是误用（useShallow 对 primitive 无意义）
  const approvalSig = useApprovalStore(
    (s) => (s.approvals || []).map(a => `${a.id}:${a.status}`).join('|')
  );
  useEffect(() => {
    // P1 修复：依赖 approvalSig（合并版签名）替代原双依赖
    if (!approvalSig) return; // 首次挂载（approvals 空数组）跳过
    fetchPlans();
  }, [approvalSig]);

  // 进入采购计划页面时主动加载审批列表（用于详情弹窗显示审批记录）
  // M-1: 强类型 selector（直接读 function reference，无需 any）
  const fetchApprovals = useApprovalStore((s) => s.fetchApprovals);
  useEffect(() => {
    if (fetchApprovals) fetchApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // H-1: 30 行 UI 状态（筛选/分页/模式/选中/弹窗）抽到独立 hook
  const pageState = usePurchasePlanPageState();
  const {
    relatedBatchCode, setRelatedBatchCode,
    purchaseType, setPurchaseType,
    status, setStatus,
    alertFilter, setAlertFilter,
    applicant, setApplicant,
    applicantDepartment, setApplicantDepartment,
    priority, setPriority,
    requiredStartDate, setRequiredStartDate,
    requiredEndDate, setRequiredEndDate,
    currentPage, setCurrentPage,
    pageSize, setPageSize,
    exportMode, setExportMode,
    batchEditMode, setBatchEditMode,
    batchDeleteMode, setBatchDeleteMode,
    selectedRows: selectedCodes, setSelectedRows: setSelectedCodes,
    exportFormat, setExportFormat,
    showDeleteModal, setShowDeleteModal,
    showExportModal, setShowExportModal,
    showCreateModal, setShowCreateModal,
    showDetailModal, setShowDetailModal,
    showBatchEditModal, setShowBatchEditModal,
    showEditItemsExpanded, setShowEditItemsExpanded,
    batchSelectOpen, setBatchSelectOpen,
  } = pageState;

  // 详情选中（保留在 Page，因为和 selectedPlanApprovals 强绑定）
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<PurchasePlan | null>(null);
  const [selectedPlanApprovals, setSelectedPlanApprovals] = useState<Approval[]>([]);

  // L-3/L-4: todayLocal 改从 src/lib/dateUtils 导入，Page 不再内联

  // 批次号下拉框ref
  const batchSelectRef = useRef<HTMLDivElement>(null);

  // 创建表单状态
  const [createForm, setCreateForm] = useState({
    purchaseApplicationCode: '',
    relatedBatchCode: '',
    purchaseType: 'production',
    applicant: localStorage.getItem('username') || '',
    applicantDepartment: localStorage.getItem('departmentName') || '生产部',
    applyDate: todayLocal(),
    requiredDate: '',
    priority: 'normal',
    remark: '',
    otherBatchReason: '',
    approvalPerson: '',
  });
  const [createItems, setCreateItems] = useState<PurchasePlanItem[]>([]);

  // 批量编辑相关状态
  const [editedPlanCodes, setEditedPlanCodes] = useState<string[]>([]);
  const [editedPlans, setEditedPlans] = useState<Record<string, Partial<PurchasePlan>>>({});
  const [selectedPlanCode, setSelectedPlanCode] = useState('');
  const [currentEditingPlan, setCurrentEditingPlan] = useState<PurchasePlan | null>(null);
  const [batchEditData, setBatchEditData] = useState({
    purchaseType: '',
    relatedBatchCode: '',
    otherBatchReason: '',
    applicant: '',
    applicantDepartment: '',
    applyDate: '',
    requiredDate: '',
    priority: '',
    remark: '',
    executionStatus: '',
  });
  const [batchEditItems, setBatchEditItems] = useState<PurchasePlanItem[]>([]);

  // 展开行状态
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // 排序状态
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);

  // 展开/折叠行切换
  const toggleExpandRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 监听物料明细变化，标记批次号为已编辑
  // 性能优化：用 ref 跟踪上次 items 引用，避免 JSON.stringify 全量比较
  // 2026-06-10 修复：select 触发的 onBatchEditItemsChange(plan.items) 不能算"已编辑"，
  // 用 lastPlanCodeRef 区分"切换 plan 的初始化"和"同 plan 内的用户编辑"
  const lastItemsRef = useRef<typeof batchEditItems | null>(null);
  const lastPlanCodeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedPlanCode) {
      lastItemsRef.current = null;
      lastPlanCodeRef.current = null;
      return;
    }
    // 切换到新 plan（含首次 select、handleBatchEditNext 切下一个）：
    // 只记录新 items 引用，不写入 editedPlans，避免下拉项误显"已编辑"
    if (lastPlanCodeRef.current !== selectedPlanCode) {
      lastItemsRef.current = batchEditItems;
      lastPlanCodeRef.current = selectedPlanCode;
      return;
    }
    if (lastItemsRef.current === batchEditItems) return; // 引用未变，跳过
    lastItemsRef.current = batchEditItems;
    setEditedPlans(prev => ({
      ...prev,
      [selectedPlanCode]: { ...(prev[selectedPlanCode] || {}), items: batchEditItems },
    }));
  }, [batchEditItems, selectedPlanCode]);

  // 排序处理
  const handleSortChange = (field: string) => {
    setSortConfig(prev => {
      if (prev?.field !== field) {
        return { field, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { field, direction: 'desc' };
      }
      return null;
    });
  };

  // 过滤和排序后的数据
  // H-3: 加 useMemo 缓存，避免每次 render 都重算（依赖 7 个 state + purchasePlansData + sortConfig）
  const filteredAndSortedData = useMemo(() => {
    return purchasePlansData
      .filter(plan => {
        // 添加空值保护，防止 relatedBatchCode 为 null/undefined 时崩溃
        if (relatedBatchCode && !(plan.relatedBatchCode || '').toLowerCase().includes(relatedBatchCode.toLowerCase())) return false;
        if (purchaseType !== 'all' && plan.purchaseType !== purchaseType) return false;
        if (status !== 'all' && plan.status !== status) return false;
        if (applicant && !plan.applicant.toLowerCase().includes(applicant.toLowerCase())) return false;
        if (applicantDepartment && !plan.applicantDepartment.toLowerCase().includes(applicantDepartment.toLowerCase())) return false;
        if (priority !== 'all' && plan.priority !== priority) return false;
        if (requiredStartDate && plan.requiredDate < requiredStartDate) return false;
        if (requiredEndDate && plan.requiredDate > requiredEndDate) return false;
        // 预警筛选
        if (alertFilter !== 'all') {
          const alert = calculateOverdueAlert(plan);
          if (alertFilter === 'overdue' && alert.level !== 'overdue') return false;
          if (alertFilter === 'warning' && alert.level !== 'warning') return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (!sortConfig) return 0;
        const { field, direction } = sortConfig;
        const aValue: any = a[field as keyof typeof a];
        const bValue: any = b[field as keyof typeof b];
        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [purchasePlansData, relatedBatchCode, purchaseType, status, alertFilter, applicant, applicantDepartment, priority, requiredStartDate, requiredEndDate, sortConfig]);

  // 打开创建弹窗
  // 优化：弹窗立即显示，编号后台异步获取（避免等待 API 往返延迟）
  // H-2: 用 codeGenerator 统一占位 / 真实编号 / 兜底逻辑
  const handleOpenCreateModal = () => {
    // 先生成临时占位编号（兜底规则）
    const placeholder = buildPlaceholderCode();

    setCreateForm({
      purchaseApplicationCode: placeholder,
      relatedBatchCode: '',
      purchaseType: 'production',
      applicant: localStorage.getItem('username') || '',
      applicantDepartment: localStorage.getItem('departmentName') || '生产部',
      applyDate: todayLocal(),
      requiredDate: '',
      priority: 'normal',
      remark: '',
      otherBatchReason: '',
      approvalPerson: '',
    });
    setCreateItems([]);
    // 立即打开弹窗
    setShowCreateModal(true);

    // 后台异步获取真实编号并替换占位
    void (async () => {
      try {
        const realCode = await getNextPurchaseApplicationCode();
        if (realCode) {
          setCreateForm(prev => prev.purchaseApplicationCode === placeholder
            ? { ...prev, purchaseApplicationCode: realCode }
            : prev
          );
        }
      } catch {
        // 后端失败时用兜底编号（PA+年月+4位随机）
        const fallback = buildPlaceholderCode().replace('____', String(Math.floor(Math.random() * 10000)).padStart(4, '0'));
        setCreateForm(prev => prev.purchaseApplicationCode === placeholder
          ? { ...prev, purchaseApplicationCode: fallback }
          : prev
        );
      }
    })();
  };

  // 创建表单字段更新
  const handleCreateFormChange = (field: string, value: any) => {
    setCreateForm(prev => ({ ...prev, [field]: value }));
  };

  // 创建提交（走 Zustand Store → enhancedApiClient 数据流）
  const handleCreateSubmit = async () => {
    try {
      const totalAmount = createItems.reduce((sum, item) => sum + (item.estimatedTotalPrice || 0), 0);

      // 表单已是英文编码，直接提交无需映射
      const planData = {
        purchaseApplicationCode: createForm.purchaseApplicationCode,
        relatedBatchCode: createForm.relatedBatchCode,
        purchaseType: createForm.purchaseType,
        applicant: createForm.applicant,
        applicantId: localStorage.getItem('userId') || '',
        applicantDepartment: createForm.applicantDepartment,
        applyDate: createForm.applyDate,
        requiredDate: createForm.requiredDate,
        priority: createForm.priority,
        status: 'pending' as const,
        approvalStatus: 'pending' as const,
        remarks: createForm.remark,
        approvalPerson: createForm.approvalPerson,
        items: createItems,
        totalAmount,
        attachments: [],
      };

      const result = await addPlan(planData);

      if (result && result.id) {
        const approvalAmount = totalAmount;

        // P0-3 修复：审批提交失败不自动回滚（避免回滚失败导致数据更乱）。
        // 策略：保留已创建的采购单，让用户重试或到审批中心手动提交。
        let approvalResult: { success: boolean; message: string; autoApprove?: boolean } | null = null;
        try {
          approvalResult = await submitPurchaseApproval({
            purchaseId: result.id,
            purchaseCode: result.purchaseApplicationCode || createForm.purchaseApplicationCode,
            purchaseName: result.planTitle || `${createForm.purchaseType} - ${createForm.purchaseApplicationCode}`,
            amount: approvalAmount,
            applicantId: result.applicantId || planData.applicantId,
            applicantName: result.applicant,
            department: result.applicantDepartment,
          });
        } catch (approvalError) {
          // 审批提交抛错：仅 log + 提示用户手动处理，保留采购单
          logger.error('[PurchasePlanPage] 审批提交异常', { error: approvalError });
          await showAlert(
            '采购计划已创建（单号 ' + (result.purchaseApplicationCode || result.id) +
            '），但审批提交失败，请到审批中心手动提交'
          );
        }

        if (approvalResult) {
          if (!approvalResult.success) {
            await showAlert(
              '采购计划已创建（单号 ' + (result.purchaseApplicationCode || result.id) +
              '），但审批提交失败: ' + approvalResult.message + '，请到审批中心手动提交'
            );
          } else if (approvalResult.autoApprove) {
            await showAlert('采购计划已创建，金额在免审批阈值内，已自动通过');
          } else {
            await showAlert('采购计划已创建并提交审批');
          }
        }

        // 创建后重新拉取列表（确保自动审批/普通审批的状态即时反映）
        await fetchPlans();
      }
    } catch (error) {
      await showAlert('创建采购计划失败，请重试');
    } finally {
      setShowCreateModal(false);
    }
  };

  // 重置筛选
  const handleReset = () => {
    setRelatedBatchCode('');
    setPurchaseType('all');
    setStatus('all');
    setAlertFilter('all');
    setApplicant('');
    setApplicantDepartment('');
    setPriority('all');
    setRequiredStartDate('');
    setRequiredEndDate('');
    setCurrentPage(1);
  };

  // 搜索
  const handleSearch = () => {
    setCurrentPage(1);
  };

  // 导出点击
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedCodes([]);
  };

  // 全选：selectedRows 统一存 purchaseApplicationCode（与行 checkbox onCheckedChange、
  // BatchEditModal 下拉过滤、handleDoExport 过滤、handleBatchEditConfirm 过滤完全一致）
  // 2026-06-10 修复：之前用 p.id 导致全选写进去的 id 与行渲染时查的 code 不匹配，
  // 表现为"全选点了行不勾选"（表头数量对得上所以自身显勾选态，造成假象）
  const handleSelectAll = () => {
    if (selectedCodes.length === filteredAndSortedData.length) {
      setSelectedCodes([]);
    } else {
      setSelectedCodes(filteredAndSortedData.map(p => p.purchaseApplicationCode));
    }
  };

  // 选择行（C3 修复 1: 参数名 code 而非 id——PurchasePlanTable line 338 已传 purchaseApplicationCode）
  const handleSelectRow = (code: string) => {
    if (selectedCodes.includes(code)) {
      setSelectedCodes(selectedCodes.filter(c => c !== code));
    } else {
      setSelectedCodes([...selectedCodes, code]);
    }
  };

  // 确认导出
  const handleConfirmExport = () => {
    if (selectedCodes.length === 0) {
      showAlert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  // 执行导出（使用 xlsx 库真正生成 Excel；Word 仍走 HTML 兼容方案；CSV 用 RFC4180）
  const handleDoExport = async () => {
    const selectedData = purchasePlansData.filter(p => selectedCodes.includes(p.purchaseApplicationCode));
    const headers = [
      { key: 'purchaseApplicationCode', label: '计划编号' },
      { key: 'planTitle', label: '计划名称' },
      { key: 'purchaseTypeName', label: '类型' },
      { key: 'applicant', label: '申请人' },
      { key: 'applyDate', label: '申请日期' },
      { key: 'totalAmount', label: '总金额' },
      { key: 'supplierName', label: '供应商' },
      { key: 'requiredDate', label: '交货日期' },
      { key: 'priorityText', label: '优先级' },
      { key: 'statusText', label: '状态' },
    ];

    // RFC4180 CSV 转义：包含 , " \n 的字段用双引号包裹并把 " 替换为 ""
    const csvEscape = (v: unknown): string => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const fileNameBase = `采购计划_${dayjs().format('YYYY-MM-DD')}`;

    try {
      if (exportFormat === 'csv') {
        const lines = [
          headers.map(h => h.label).join(','),
          ...selectedData.map(row => headers.map(h => csvEscape((row as any)[h.key])).join(',')),
        ];
        const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        downloadBlob(blob, `${fileNameBase}.csv`);
      } else if (exportFormat === 'excel') {
        // 真正用 xlsx 库生成 .xlsx
        const wsData = [
          headers.map(h => h.label),
          ...selectedData.map(row => headers.map(h => (row as any)[h.key] ?? '')),
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        // 设置列宽
        ws['!cols'] = headers.map(h => ({ wch: Math.max(12, h.label.length * 2) }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '采购计划');
        XLSX.writeFile(wb, `${fileNameBase}.xlsx`);
      } else if (exportFormat === 'word') {
        // Word 走 HTML 兼容方案（无 xlsx 替代品）
        const escapeHtml = (s: unknown): string => String(s ?? '')
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${escapeHtml(h.label)}</th>`).join('')}</tr>${selectedData.map(row => `<tr>${headers.map(h => `<td>${escapeHtml((row as any)[h.key])}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-word;charset=utf-8' });
        downloadBlob(blob, `${fileNameBase}.doc`);
      }

      setExportMode(false);
      setSelectedCodes([]);
      setShowExportModal(false);
    } catch (err) {
      await showAlert('导出失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  /** 通用下载方法：尝试用 showSaveFilePicker，否则降级到 a[download] */
  const downloadBlob = async (blob: Blob, fileName: string) => {
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: fileName.split('.').pop()?.toUpperCase() || 'File', accept: { [blob.type]: [`.${fileName.split('.').pop()}`] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch {
        // 用户取消或不支持，回退
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 取消导出
  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedCodes([]);
  };

  // 进入批量删除模式（显示复选框）
  const handleEnterBatchDeleteMode = () => {
    setBatchDeleteMode(true);
  };

  // 删除点击（批量删除模式下确认删除）
  const handleDeleteClick = () => {
    if (selectedCodes.length === 0) {
      showAlert('请先选择要删除的数据');
      return;
    }
    setShowDeleteModal(true);
  };

  // 删除确认（开发测试阶段：可删除所有状态）
  // C3 修复 3: selectedCodes 已统一存 purchaseApplicationCode（与全选/单条编辑/单条删除/批量编辑一致）
  // deletePlans 入参是 id（C3 未改 store 签名），用 code→id 单行翻译替代原防御性映射
  const handleDeleteConfirm = async () => {
    try {
      const codeToId = new Map(purchasePlansData.map(p => [p.purchaseApplicationCode, p.id]));
      const selectedIds = selectedCodes
        .map(code => codeToId.get(code))
        .filter((id): id is string => Boolean(id));

      const result = await deletePlans(selectedIds);

      setShowDeleteModal(false);
      setBatchDeleteMode(false);
      setSelectedCodes([]);

      const skipMsg = result.skipped.length > 0 ? `，${result.skipped.length} 个被跳过` : '';
      // M-10: 弹窗列出具体被跳过的编号，方便用户知道哪些没被删
      const skippedDetail = result.skipped.length > 0
        ? `\n\n被跳过的：\n${result.skipped.map(s => `• ${s.id}（${s.reason}）`).join('\n')}`
        : '';
      await showAlert(`已删除 ${result.deleted} 个采购计划${skipMsg}${skippedDetail}`);
    } catch (error) {
      await showAlert('删除失败，请重试');
    }
  };

  // 查看详情：异步拉取关联的审批单 + 自动审批的占位记录
  // 合并多个审批单的 records，按 actionTime 升序排序
  const extractAllRecords = (approvals: Approval[]) => {
    const all: any[] = [];
    approvals.forEach(a => {
      const records = (a as any).records || [];
      if (Array.isArray(records)) {
        all.push(...records);
      }
    });
    return all.sort((x, y) => String(x.actionTime || '').localeCompare(String(y.actionTime || '')));
  };

  // M-11: 提取"按 plan 匹配审批单"为局部 helper，统一走 store 读规范化后的数据
  const findApprovalsForPlan = (approvals: Approval[], plan: PurchasePlan): Approval[] => {
    return approvals.filter((a) => {
      const link = a.businessLink;
      if (!link || typeof link !== 'object') return false;
      const businessLink = link as { type?: string; requestId?: string; requestCode?: string };
      return businessLink.type === 'purchase' && (
        businessLink.requestId === plan.id ||
        businessLink.requestCode === plan.purchaseApplicationCode ||
        businessLink.requestId === plan.planCode
      );
    });
  };

  const handleViewDetail = async (plan: PurchasePlan) => {
    setSelectedPlanDetail(plan);
    setShowDetailModal(true);
    setSelectedPlanApprovals([]);

    try {
      // 1. 先尝试从 store 缓存拿
      let matched = findApprovalsForPlan(useApprovalStore.getState().approvals, plan);

      // 2. 缓存里没有 → 走 useApprovalStore.fetchApprovals() 让 store 复用
      // P0-5 修复：不再用动态 import 单独 GET /approvals 全量拉（避免重复网络请求 + 数据双轨）
      if (matched.length === 0) {
        try {
          await useApprovalStore.getState().fetchApprovals();
          matched = findApprovalsForPlan(useApprovalStore.getState().approvals, plan);
        } catch (apiErr) {
          // M-2: 改用 showToast 显式提示，不再静默吞错
          showToast('加载审批记录失败：' + (apiErr instanceof Error ? apiErr.message : '未知错误'), 'warning');
        }
      }

      // 3. 如果还是没审批单，但 plan.status 已是 approved（说明自动通过的）
      if (matched.length === 0 && plan.status === 'approved') {
        const syntheticRecord = {
          approverId: 'system',
          approverName: '系统',
          action: 'approve',
          comment: '金额在免审批阈值内，已自动通过',
          actionTime: plan.updatedAt || plan.createdAt || new Date().toISOString(),
        };
        setSelectedPlanApprovals([{ records: [syntheticRecord] } as unknown as Approval]);
      } else {
        setSelectedPlanApprovals(matched);
      }
    } catch (err) {
      // M-2: 改用 showToast 显式提示
      showToast('加载采购计划审批记录失败：' + (err instanceof Error ? err.message : '未知错误'), 'error');
    }
  };

  // 单条编辑处理
  const handleSingleEdit = (plan: PurchasePlan) => {
    // 按执行状态判断：completed/cancelled 视为归档
    if (plan.executionStatus === 'completed' || plan.executionStatus === 'cancelled') {
      showAlert('该采购计划已归档，无法编辑');
      return;
    }
    // 设置选中的plan并打开批量编辑弹窗（复用它）
    setSelectedPlanCode(plan.purchaseApplicationCode);
    setCurrentEditingPlan(plan);
    setBatchEditData({
      purchaseType: plan.purchaseType,
      relatedBatchCode: plan.relatedBatchCode || '',
      otherBatchReason: (plan as any).otherBatchReason || '',
      applicant: plan.applicant || '',
      applicantDepartment: plan.applicantDepartment || '',
      applyDate: plan.applyDate || '',
      requiredDate: plan.requiredDate || '',
      priority: plan.priority,
      remark: plan.remark || '',
      executionStatus: plan.executionStatus || 'pending_execution',
    });
    setBatchEditItems(plan.items || []);
    setEditedPlanCodes([]);
    setEditedPlans({});
    setSelectedCodes([plan.purchaseApplicationCode]);
    setShowBatchEditModal(true);
  };

  // 单行 + 批量共用 DeleteWarningModal，与生产计划页面 UI 一致
  // C3 修复 2: 改存 plan.purchaseApplicationCode（与全选/单条编辑一致）
  const handleSingleDelete = (plan: PurchasePlan) => {
    setSelectedCodes([plan.purchaseApplicationCode]);
    setShowDeleteModal(true);
  };

  // 批量删除取消
  const handleBatchDeleteCancel = () => {
    setBatchDeleteMode(false);
    setSelectedCodes([]);
  };

  // 批量编辑"下一个"：保存当前编辑 → 自动切到下一个未编辑的 plan
  // 若已是最后一个，则关闭弹窗
  const handleBatchEditNext = async () => {
    if (!currentEditingPlan) {
      // 没有正在编辑的，直接关闭
      handleBatchEditCancel();
      return;
    }

    try {
      // 1. 保存当前编辑
      const selectedUser = users.find(u => u.id === currentEditingPlan.applicantId);
      const applicantName = selectedUser?.realName || selectedUser?.name || currentEditingPlan.applicant || '';
      await updatePlan(currentEditingPlan.id, {
        relatedBatchCode: batchEditData.relatedBatchCode || currentEditingPlan.relatedBatchCode,
        purchaseType: batchEditData.purchaseType,
        priority: batchEditData.priority,
        requiredDate: batchEditData.requiredDate,
        remark: batchEditData.remark,
        executionStatus: batchEditData.executionStatus,
        applicantId: currentEditingPlan.applicantId,
        applicantName: batchEditData.applicant || applicantName,
        applicantDepartment: batchEditData.applicantDepartment || currentEditingPlan.applicantDepartment,
        applyDate: batchEditData.applyDate,
        items: batchEditItems,
      });

      // 2. 把当前 planCode 标记为已编辑
      const currentCode = currentEditingPlan.purchaseApplicationCode;
      const remainingCodes = selectedCodes.filter(code => code !== currentCode);

      if (remainingCodes.length === 0) {
        // 已是最后一个，关闭弹窗
        await showAlert('所有计划已保存');
        setShowBatchEditModal(false);
        setBatchEditMode(false);
        setSelectedCodes([]);
        setEditedPlanCodes([]);
        setEditedPlans({});
        setSelectedPlanCode('');
        setCurrentEditingPlan(null);
        setBatchEditItems([]);
        return;
      }

      // 3. 切到下一个未编辑的
      const nextCode = remainingCodes[0];
      const nextPlan = purchasePlansData.find(p => p.purchaseApplicationCode === nextCode);
      if (!nextPlan) {
        await showAlert('未找到下一个计划');
        return;
      }
      setSelectedPlanCode(nextCode);
      setCurrentEditingPlan(nextPlan);
      setBatchEditData({
        purchaseType: nextPlan.purchaseType,
        relatedBatchCode: nextPlan.relatedBatchCode || '',
        otherBatchReason: (nextPlan as any).otherBatchReason || '',
        applicant: nextPlan.applicant || '',
        applicantDepartment: nextPlan.applicantDepartment || '',
        applyDate: nextPlan.applyDate || '',
        requiredDate: nextPlan.requiredDate || '',
        priority: nextPlan.priority,
        remark: nextPlan.remark || '',
        executionStatus: nextPlan.executionStatus || 'pending_execution',
      });
      setBatchEditItems(nextPlan.items || []);
      await showAlert(`已保存 ${currentCode}，已切到 ${nextCode}`);
    } catch (error) {
      await showAlert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 批量编辑保存
  const handleBatchEditSave = async () => {
    if (!currentEditingPlan) {
      await showAlert('请先选择一个采购计划');
      return;
    }
    try {
      let savedCount = 0;
      const errors: string[] = [];

      // 1. 保存当前正在编辑的计划
      const selectedUser = users.find(u => u.id === currentEditingPlan.applicantId);
      const applicantName = selectedUser?.realName || selectedUser?.name || currentEditingPlan.applicant || '';

      // logger.info('[保存采购计划] currentEditingPlan:', currentEditingPlan);
      // logger.info('[保存采购计划] batchEditItems:', batchEditItems);

      await updatePlan(currentEditingPlan.id, {
        relatedBatchCode: batchEditData.relatedBatchCode || currentEditingPlan.relatedBatchCode,
        purchaseType: batchEditData.purchaseType,
        priority: batchEditData.priority,
        requiredDate: batchEditData.requiredDate,
        remark: batchEditData.remark,
        executionStatus: batchEditData.executionStatus,
        applicantId: currentEditingPlan.applicantId,
        applicantName: batchEditData.applicant || applicantName,
        applicantDepartment: batchEditData.applicantDepartment || currentEditingPlan.applicantDepartment,
        applyDate: batchEditData.applyDate,
        items: batchEditItems,
      });
      savedCount++;

      // 2. 保存 editedPlans 中累积的其他修改
      const editedPlanCodes = Object.keys(editedPlans);
      for (const planCode of editedPlanCodes) {
        // 跳过当前正在编辑的计划（已在上方保存）
        if (planCode === currentEditingPlan.purchaseApplicationCode) {
          continue;
        }

        const editData = editedPlans[planCode];
        // 找到对应的原始计划
        const originalPlan = purchasePlansData.find(p => p.purchaseApplicationCode === planCode);
        if (!originalPlan) {
          continue;
        }

        try {
          const userForEdit = users.find(u => u.id === (editData.applicantId || originalPlan.applicantId));
          const editApplicantName = userForEdit?.realName || userForEdit?.name || editData.applicant || originalPlan.applicant || '';

          await updatePlan(originalPlan.id, {
            ...editData,
            applicantName: editApplicantName,
            applicantId: editData.applicantId || originalPlan.applicantId,
            applicantDepartment: editData.applicantDepartment || originalPlan.applicantDepartment,
          });
          savedCount++;
        } catch (editError) {
          // logger.error(`[保存采购计划] 保存 ${planCode} 失败:`, editError);
          errors.push(`${planCode}: ${editError instanceof Error ? editError.message : '未知错误'}`);
        }
      }

      if (errors.length > 0) {
        await showAlert(`部分计划保存失败: ${errors.join(', ')}`);
      } else {
        await showAlert(`成功保存 ${savedCount} 个采购计划`);
      }

      setShowBatchEditModal(false);
      setBatchEditMode(false);
      setSelectedCodes([]);
      setEditedPlans({});
      setBatchEditItems([]);
    } catch (error) {
      // logger.error('保存失败:', error);
      await showAlert(`保存失败: ${error instanceof Error ? error.message : '请重试'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* 预警统计头部 */}
      <AlertStats purchasePlansData={purchasePlansData} />

      {/* 筛选表单 */}
      <PurchasePlanFilters
        relatedBatchCode={relatedBatchCode}
        purchaseType={purchaseType}
        status={status}
        alertFilter={alertFilter}
        applicant={applicant}
        applicantDepartment={applicantDepartment}
        priority={priority}
        requiredStartDate={requiredStartDate}
        requiredEndDate={requiredEndDate}
        onRelatedBatchCodeChange={setRelatedBatchCode}
        onPurchaseTypeChange={setPurchaseType}
        onStatusChange={setStatus}
        onAlertFilterChange={setAlertFilter}
        onApplicantChange={setApplicant}
        onApplicantDepartmentChange={setApplicantDepartment}
        onPriorityChange={setPriority}
        onRequiredStartDateChange={setRequiredStartDate}
        onRequiredEndDateChange={setRequiredEndDate}
        onReset={handleReset}
        onSearch={handleSearch}
      />

      {/* 数据表格 */}
      <PurchasePlanTable
        data={filteredAndSortedData}
        currentPage={currentPage}
        pageSize={pageSize}
        selectedRows={selectedCodes}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        batchDeleteMode={batchDeleteMode}
        sortConfig={sortConfig}
        expandedRows={expandedRows}
        onToggleExpand={toggleExpandRow}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onSortChange={handleSortChange}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        onViewDetail={handleViewDetail}
        onEdit={handleSingleEdit}
        onDelete={handleSingleDelete}
        filteredAndSortedData={filteredAndSortedData}
        canCreate={canCreate}
        canDelete={canDelete}
        canExport={canExport}
        onCreate={handleOpenCreateModal}
        onBatchDelete={handleEnterBatchDeleteMode}
        onExport={handleExportClick}
        onExportConfirm={handleConfirmExport}
        onExportCancel={handleCancelExport}
        onBatchDeleteConfirm={() => setShowDeleteModal(true)}
        onBatchDeleteCancel={handleBatchDeleteCancel}
      />

      {/* 创建弹窗 */}
      <CreatePlanModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        createForm={createForm}
        createItems={createItems}
        purchasePlansData={purchasePlansData}
        onFormChange={handleCreateFormChange}
        onItemsChange={setCreateItems}
        onSubmit={handleCreateSubmit}
      />

      {/* 详情弹窗 */}
      <PlanDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedPlanDetail(null);
          setSelectedPlanApprovals([]);
        }}
        selectedPlanDetail={selectedPlanDetail}
        approvalRecords={extractAllRecords(selectedPlanApprovals)}
        onExecutionStatusChanged={(updated) => {
          // 详情里改了执行状态 → 同步更新列表里的 selectedPlanDetail + 触发 fetchPlans
          setSelectedPlanDetail(updated);
          fetchPlans();
        }}
      />

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteModal}
        selectedCount={selectedCodes.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* 批量编辑弹窗 */}
      <BatchEditModal
        isOpen={showBatchEditModal}
        onClose={() => {
          setShowBatchEditModal(false);
          setBatchEditMode(false);
          setSelectedCodes([]);
          setEditedPlanCodes([]);
          setEditedPlans({});
          setSelectedPlanCode('');
          setCurrentEditingPlan(null);
          setBatchEditItems([]);
        }}
        selectedRows={selectedCodes}
        selectedPlanCode={selectedPlanCode}
        currentEditingPlan={currentEditingPlan}
        batchEditData={batchEditData}
        batchEditItems={batchEditItems}
        batchSelectOpen={batchSelectOpen}
        editedPlans={editedPlans}
        purchasePlansData={purchasePlansData}
        showEditItemsExpanded={showEditItemsExpanded}
        onBatchSelectOpenChange={setBatchSelectOpen}
        onSelectedPlanCodeChange={setSelectedPlanCode}
        onBatchEditDataChange={(field, value) => setBatchEditData(prev => ({ ...prev, [field]: value }))}
        onBatchEditItemsChange={setBatchEditItems}
        onShowEditItemsExpandedChange={setShowEditItemsExpanded}
        onCurrentEditingPlanChange={setCurrentEditingPlan}
        onEditedPlansChange={setEditedPlans}
        onSubmit={handleBatchEditSave}
        onNext={handleBatchEditNext}
      />

      {/* 导出格式弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportFormat={exportFormat}
        selectedCount={selectedCodes.length}
        onFormatChange={setExportFormat}
        onConfirm={handleDoExport}
      />
    </div>
  );
}

export default PurchasePlanPage;
