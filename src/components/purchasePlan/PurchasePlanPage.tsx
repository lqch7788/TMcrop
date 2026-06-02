/**
 * 采购计划页面 - 主组件
 * 重构后使用独立组件
 */
import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart } from 'lucide-react';
import dayjs from 'dayjs';
import { Modal } from '../ui/Modal';
import { DeleteWarningModal } from './DeleteWarningModal';
import { ExportFormatModal } from '../common/ExportFormatModal';
import { submitPurchaseApproval } from '../../services/approvalSubmitService';
import type { Approval } from '../../types/approval';
import type { PurchasePlan, PurchasePlanItem } from '../../types/purchase';
import { calculateOverdueAlert, canDeletePurchasePlan, canEditPurchasePlan } from '../../types/purchase';
import { useUserStore, usePurchasePlanStore, useApprovalStore } from '../../stores';
import { showAlert } from '@/lib/dialogService';
import * as XLSX from 'xlsx';
import { getNextPurchaseApplicationCode } from '../../services/apiPurchasePlanService';

// 导入子组件
import { PurchasePlanFilters } from './PurchasePlanFilters';
import { PurchasePlanTable } from './PurchasePlanTable';
import { CreatePlanModal } from './CreatePlanModal';
import { PlanDetailModal } from './PlanDetailModal';
import { BatchEditModal } from './BatchEditModal';
import { AlertStats } from './AlertStats';

export function PurchasePlanPage() {
  // 权限控制 - 已取消，所有人可使用所有功能
  const canCreate = true;
  const canEdit = true;
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
  const approvalVersion = useApprovalStore((s: any) => s.approvals?.length ?? 0);
  const lastApprovalStatusSum = useApprovalStore((s: any) => {
    const arr = s.approvals || [];
    return arr.reduce((sum: number, a: any) => sum + (a.status === 'approved' ? 1 : 0) + (a.status === 'rejected' ? 1 : 0), 0);
  });
  useEffect(() => {
    // 跳过首次挂载（已有 useEffect 加载）
    if (approvalVersion === 0) return;
    fetchPlans();
  }, [approvalVersion, lastApprovalStatusSum]);

  // 进入采购计划页面时主动加载审批列表（用于详情弹窗显示审批记录）
  const fetchApprovals = useApprovalStore((s: any) => s.fetchApprovals);
  useEffect(() => {
    if (fetchApprovals) fetchApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 筛选状态
  const [relatedBatchCode, setRelatedBatchCode] = useState('');
  const [purchaseType, setPurchaseType] = useState('all');
  const [status, setStatus] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [applicant, setApplicant] = useState('');
  const [applicantDepartment, setApplicantDepartment] = useState('');
  const [priority, setPriority] = useState('all');
  const [requiredStartDate, setRequiredStartDate] = useState('');
  const [requiredEndDate, setRequiredEndDate] = useState('');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 模式状态
  const [exportMode, setExportMode] = useState(false);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);

  // 选中状态
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');

  // 弹窗状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showEditItemsExpanded, setShowEditItemsExpanded] = useState(false);
  const [batchSelectOpen, setBatchSelectOpen] = useState(false);

  // 详情选中
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<PurchasePlan | null>(null);
  const [selectedPlanApprovals, setSelectedPlanApprovals] = useState<Approval[]>([]);

  // 本地时间生成 YYYY-MM-DD（避免 UTC 跨天导致日期错位）
  const todayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

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
    priority: '',
    requiredDate: '',
    remark: '',
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
  const lastItemsRef = useRef<typeof batchEditItems | null>(null);
  useEffect(() => {
    if (!selectedPlanCode) {
      lastItemsRef.current = null;
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
  const filteredAndSortedData = purchasePlansData
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

  // 打开创建弹窗
  // 优化：弹窗立即显示，编号后台异步获取（避免等待 API 往返延迟）
  const handleOpenCreateModal = () => {
    // 先生成临时占位编号（兜底规则）
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const placeholder = `PA${ym}____`; // 占位，下划线提示用户等待

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
      } catch (err) {
        // 后端失败时用兜底编号（PA+年月+4位随机）
        const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        const fallback = `PA${ym}${random}`;
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

        const approvalResult = await submitPurchaseApproval({
          purchaseId: result.id,
          purchaseCode: result.purchaseApplicationCode || createForm.purchaseApplicationCode,
          purchaseName: result.planTitle || `${createForm.purchaseType} - ${createForm.purchaseApplicationCode}`,
          amount: approvalAmount,
          applicantId: result.applicantId || planData.applicantId,
          applicantName: result.applicant,
          department: result.applicantDepartment,
        });

        if (!approvalResult.success) {
          // 审批提交失败，回滚：删除已创建的采购计划
          try {
            await deletePlan(result.id);
            await showAlert('审批提交失败: ' + approvalResult.message + '（采购计划已自动删除）');
          } catch (deleteError) {
            // 回滚失败：明确告知用户残留数据
            await showAlert(
              '审批提交失败: ' + approvalResult.message +
              '；自动回滚也失败，请手动删除 ID 为 ' + result.id + ' 的采购计划'
            );
          }
          return;
        }

        if (approvalResult.autoApprove) {
          await showAlert('采购计划已创建，金额在免审批阈值内，已自动通过');
        } else {
          await showAlert('采购计划已创建并提交审批');
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
    setSelectedRows([]);
  };

  // 全选
  const handleSelectAll = () => {
    if (selectedRows.length === filteredAndSortedData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredAndSortedData.map(p => p.id));
    }
  };

  // 选择行
  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 确认导出
  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  // 执行导出（使用 xlsx 库真正生成 Excel；Word 仍走 HTML 兼容方案；CSV 用 RFC4180）
  const handleDoExport = async () => {
    const selectedData = purchasePlansData.filter(p => selectedRows.includes(p.purchaseApplicationCode));
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
      setSelectedRows([]);
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
    setSelectedRows([]);
  };

  // 进入批量编辑模式（显示复选框）
  const handleEnterBatchEditMode = () => {
    setBatchEditMode(true);
  };

  // 进入批量删除模式（显示复选框）
  const handleEnterBatchDeleteMode = () => {
    setBatchDeleteMode(true);
  };

  // 删除点击（批量删除模式下确认删除）
  const handleDeleteClick = () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要删除的数据');
      return;
    }
    setShowDeleteModal(true);
  };

  // 删除确认（开发测试阶段：可删除所有状态）
  const handleDeleteConfirm = async () => {
    try {
      // selectedRows 存的是 plan.id（统一后端主键）
      // 防御：万一历史值是 purchaseApplicationCode，做一次映射
      const codeSet = new Set(purchasePlansData.map(p => p.purchaseApplicationCode));
      const selectedIds = selectedRows.map(v => (codeSet.has(v)
        ? (purchasePlansData.find(p => p.purchaseApplicationCode === v)?.id ?? v)
        : v));

      const result = await deletePlans(selectedIds);

      setShowDeleteModal(false);
      setBatchDeleteMode(false);
      setSelectedRows([]);

      const skipMsg = result.skipped.length > 0 ? `，${result.skipped.length} 个被跳过` : '';
      await showAlert(`已删除 ${result.deleted} 个采购计划${skipMsg}`);
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

  const handleViewDetail = async (plan: PurchasePlan) => {
    setSelectedPlanDetail(plan);
    setShowDetailModal(true);
    setSelectedPlanApprovals([]);

    try {
      // 1. 先尝试从 store 缓存拿
      let matched: Approval[] = useApprovalStore.getState().approvals.filter((a: Approval) => {
        const link = a.businessLink as any;
        if (!link) return false;
        return link.type === 'purchase' && (
          link.requestId === plan.id ||
          link.requestCode === plan.purchaseApplicationCode ||
          link.requestId === plan.planCode
        );
      });

      // 2. 缓存里没有 → 直接从 API 拉取所有审批单
      if (matched.length === 0) {
        try {
          const { enhancedApiClient } = await import('../../lib/apiClient');
          const allApprovals = await enhancedApiClient.get<any[]>('/approvals');
          if (Array.isArray(allApprovals)) {
            matched = allApprovals.filter((a: any) => {
              const link = a.businessLink || a.business_link;
              if (!link) return false;
              const linkObj = typeof link === 'string' ? JSON.parse(link) : link;
              return linkObj.type === 'purchase' && (
                linkObj.requestId === plan.id ||
                linkObj.requestCode === plan.purchaseApplicationCode ||
                linkObj.requestId === plan.planCode
              );
            });
            // 规范化 businessLink 字段
            matched = matched.map((a: any) => ({
              ...a,
              businessLink: typeof a.businessLink === 'string' ? JSON.parse(a.businessLink) : a.businessLink,
              records: typeof a.records === 'string' ? JSON.parse(a.records) : a.records,
            }));
          }
        } catch (apiErr) {
          console.warn('API 拉取审批单失败:', apiErr);
        }
      }

      // 3. 如果还是没审批单，但 plan.status 已是 approved（说明自动通过的）
      if (matched.length === 0 && (plan.status === 'approved' || plan.status === 'completed' || plan.status === 'purchasing')) {
        const syntheticRecord: any = {
          approverId: 'system',
          approverName: '系统',
          action: 'approve',
          comment: '金额在免审批阈值内，已自动通过',
          actionTime: (plan as any).updatedAt || (plan as any).createdAt || new Date().toISOString(),
        };
        setSelectedPlanApprovals([{ records: [syntheticRecord] } as any]);
      } else {
        setSelectedPlanApprovals(matched);
      }
    } catch (err) {
      console.error('加载采购计划审批记录失败:', err);
    }
  };

  // 单条编辑处理
  const handleSingleEdit = (plan: PurchasePlan) => {
    // 统一使用 canEditPurchasePlan 规则
    if (!canEditPurchasePlan(plan)) {
      showAlert('该采购计划已归档，无法编辑');
      return;
    }
    // 设置选中的plan并打开批量编辑弹窗（复用它）
    setSelectedPlanCode(plan.purchaseApplicationCode);
    setCurrentEditingPlan(plan);
    setBatchEditData({
      purchaseType: plan.purchaseType,
      priority: plan.priority,
      requiredDate: plan.requiredDate || '',
      remark: plan.remark || '',
    });
    setBatchEditItems(plan.items || []);
    setEditedPlanCodes([]);
    setEditedPlans({});
    setSelectedRows([plan.purchaseApplicationCode]);
    setShowBatchEditModal(true);
  };

  // 单条删除处理（开发测试阶段：可删除所有状态）
  const handleSingleDelete = async (plan: PurchasePlan) => {
    try {
      await deletePlan(plan.id);
      await showAlert('删除成功');
    } catch (error) {
      await showAlert('删除失败: ' + (error as Error).message);
    }
  };

  // 批量编辑确认
  const handleBatchEditConfirm = () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要编辑的数据');
      return;
    }
    const selectedPlansData = purchasePlansData.filter(p => selectedRows.includes(p.purchaseApplicationCode));
    if (selectedPlansData.length > 0) {
      setSelectedPlanCode(selectedPlansData[0].purchaseApplicationCode);
      setCurrentEditingPlan(selectedPlansData[0]);
      setBatchEditData({
        purchaseType: selectedPlansData[0].purchaseType,
        priority: selectedPlansData[0].priority,
        requiredDate: selectedPlansData[0].requiredDate || '',
        remark: selectedPlansData[0].remark || '',
      });
      setBatchEditItems(selectedPlansData[0].items || []);
    }
    setEditedPlanCodes([]);
    setEditedPlans({});
    setShowBatchEditModal(true);
  };

  // 批量编辑取消
  const handleBatchEditCancel = () => {
    setBatchEditMode(false);
    setSelectedRows([]);
  };

  // 批量删除取消
  const handleBatchDeleteCancel = () => {
    setBatchDeleteMode(false);
    setSelectedRows([]);
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
        relatedBatchCode: currentEditingPlan.relatedBatchCode,
        purchaseType: batchEditData.purchaseType,
        priority: batchEditData.priority,
        requiredDate: batchEditData.requiredDate,
        remark: batchEditData.remark,
        applicantId: currentEditingPlan.applicantId,
        applicantName,
        applicantDepartment: currentEditingPlan.applicantDepartment,
        items: batchEditItems,
      });

      // 2. 把当前 planCode 标记为已编辑
      const currentCode = currentEditingPlan.purchaseApplicationCode;
      const remainingCodes = selectedRows.filter(code => code !== currentCode);

      if (remainingCodes.length === 0) {
        // 已是最后一个，关闭弹窗
        await showAlert('所有计划已保存');
        setShowBatchEditModal(false);
        setBatchEditMode(false);
        setSelectedRows([]);
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
        priority: nextPlan.priority,
        requiredDate: nextPlan.requiredDate || '',
        remark: nextPlan.remark || '',
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
        relatedBatchCode: currentEditingPlan.relatedBatchCode,
        purchaseType: batchEditData.purchaseType,
        priority: batchEditData.priority,
        requiredDate: batchEditData.requiredDate,
        remark: batchEditData.remark,
        applicantId: currentEditingPlan.applicantId,
        applicantName: applicantName,
        applicantDepartment: currentEditingPlan.applicantDepartment,
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
      setSelectedRows([]);
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
        selectedRows={selectedRows}
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
        canEdit={canEdit}
        canDelete={canDelete}
        canExport={canExport}
        onCreate={handleOpenCreateModal}
        onBatchEdit={handleEnterBatchEditMode}
        onBatchDelete={handleEnterBatchDeleteMode}
        onExport={handleExportClick}
        onExportConfirm={handleConfirmExport}
        onExportCancel={handleCancelExport}
        onBatchEditConfirm={handleBatchEditConfirm}
        onBatchEditCancel={handleBatchEditCancel}
        onBatchDeleteConfirm={handleDeleteConfirm}
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
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* 批量编辑弹窗 */}
      <BatchEditModal
        isOpen={showBatchEditModal}
        onClose={() => {
          setShowBatchEditModal(false);
          setBatchEditMode(false);
          setSelectedRows([]);
          setEditedPlanCodes([]);
          setEditedPlans({});
          setSelectedPlanCode('');
          setCurrentEditingPlan(null);
          setBatchEditItems([]);
        }}
        selectedRows={selectedRows}
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
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onConfirm={handleDoExport}
      />
    </div>
  );
}

export default PurchasePlanPage;
