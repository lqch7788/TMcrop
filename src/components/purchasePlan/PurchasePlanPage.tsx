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
import type { PurchasePlan, PurchasePlanItem } from '../../types/purchase';
import { calculateOverdueAlert } from '../../types/purchase';
import { useUserStore, usePurchasePlanStore } from '../../stores';
import { showAlert } from '@/lib/dialogService';

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
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // 筛选状态
  const [relatedBatchCode, setRelatedBatchCode] = useState('');
  const [purchaseType, setPurchaseType] = useState('全部');
  const [status, setStatus] = useState('全部');
  const [alertFilter, setAlertFilter] = useState('全部');
  const [applicant, setApplicant] = useState('');
  const [applicantDepartment, setApplicantDepartment] = useState('');
  const [priority, setPriority] = useState('全部');
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

  // 批次号下拉框ref
  const batchSelectRef = useRef<HTMLDivElement>(null);

  // 创建表单状态
  const [createForm, setCreateForm] = useState({
    purchaseApplicationCode: '',
    relatedBatchCode: '',
    purchaseType: '生产物资采购',
    applicant: localStorage.getItem('username') || '陆启闯',
    applicantDepartment: '生产部',
    applyDate: new Date().toISOString().split('T')[0],
    requiredDate: '',
    priority: '中',
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
  useEffect(() => {
    if (selectedPlanCode && batchEditItems.length > 0) {
      const originalItems = currentEditingPlan?.items || [];
      const isItemsChanged = JSON.stringify(batchEditItems) !== JSON.stringify(originalItems);
      if (isItemsChanged) {
        setEditedPlans(prev => ({ ...prev, [selectedPlanCode]: { ...(prev[selectedPlanCode] || {}), items: batchEditItems } }));
      }
    }
  }, [batchEditItems, selectedPlanCode, currentEditingPlan]);

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
      if (purchaseType !== '全部' && plan.purchaseTypeName !== purchaseType) return false;
      if (status !== '全部' && plan.statusText !== status) return false;
      if (applicant && !plan.applicant.toLowerCase().includes(applicant.toLowerCase())) return false;
      if (applicantDepartment && !plan.applicantDepartment.toLowerCase().includes(applicantDepartment.toLowerCase())) return false;
      if (priority !== '全部' && plan.priorityText !== priority) return false;
      if (requiredStartDate && plan.requiredDate < requiredStartDate) return false;
      if (requiredEndDate && plan.requiredDate > requiredEndDate) return false;
      // 预警筛选
      if (alertFilter !== '全部') {
        const alert = calculateOverdueAlert(plan);
        if (alertFilter === '已逾期' && alert.level !== 'overdue') return false;
        if (alertFilter === '即将到期' && alert.level !== 'warning') return false;
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
  const handleOpenCreateModal = () => {
    setCreateForm({
      purchaseApplicationCode: `PA${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      relatedBatchCode: '',
      purchaseType: '生产物资采购',
      applicant: localStorage.getItem('username') || '陆启闯',
      applicantDepartment: '生产部',
      applyDate: new Date().toISOString().split('T')[0],
      requiredDate: '',
      priority: '中',
      remark: '',
      otherBatchReason: '',
      approvalPerson: '',
    });
    setCreateItems([]);
    setShowCreateModal(true);
  };

  // 创建表单字段更新
  const handleCreateFormChange = (field: string, value: any) => {
    setCreateForm(prev => ({ ...prev, [field]: value }));
  };

  // 创建提交（走 Zustand Store → enhancedApiClient 数据流）
  const handleCreateSubmit = async () => {
    try {
      const totalAmount = createItems.reduce((sum, item) => sum + (item.estimatedTotalPrice || 0), 0);

      // 显示名称 → 编码映射
      const priorityMap: Record<string, string> = {
        '紧急': 'urgent',
        '高': 'high',
        '中': 'normal',
        '低': 'low',
      };
      const purchaseTypeReverseMap: Record<string, string> = {
        '生产物资采购': 'production',
        '紧急采购': 'urgent',
        '常规采购': 'routine',
        '劳保用品': 'safety',
        '通用物资': 'material',
        '设备采购': 'equipment',
        '其他': 'other',
      };

      const planData = {
        purchaseApplicationCode: createForm.purchaseApplicationCode,
        relatedBatchCode: createForm.relatedBatchCode,
        purchaseType: purchaseTypeReverseMap[createForm.purchaseType] || 'production',
        applicant: createForm.applicant,
        applicantId: localStorage.getItem('userId') || '',
        applicantDepartment: createForm.applicantDepartment,
        applyDate: createForm.applyDate,
        requiredDate: createForm.requiredDate,
        priority: priorityMap[createForm.priority] || 'normal',
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

        console.log('【创建采购计划】提交审批，金额:', approvalAmount);

        const approvalResult = await submitPurchaseApproval({
          purchaseId: result.id,
          purchaseCode: result.purchaseApplicationCode || createForm.purchaseApplicationCode,
          purchaseName: result.planTitle || `${createForm.purchaseType} - ${createForm.purchaseApplicationCode}`,
          amount: approvalAmount,
          applicantId: result.applicantId || planData.applicantId,
          applicantName: result.applicant,
          department: result.applicantDepartment,
        });

        console.log('【创建采购计划】审批提交结果:', approvalResult);

        if (!approvalResult.success) {
          // 审批提交失败，回滚：删除已创建的采购计划
          console.log('【创建采购计划】审批提交失败，执行回滚删除计划:', result.id);
          try {
            await deletePlan(result.id);
            console.log('【创建采购计划】回滚删除成功');
          } catch (deleteError) {
            console.error('【创建采购计划】回滚删除失败:', deleteError);
          }
          await showAlert('审批提交失败: ' + approvalResult.message + '（采购计划已自动删除）');
          return;
        }

        if (approvalResult.autoApprove) {
          await showAlert('采购计划已创建，金额在免审批阈值内，已自动通过');
        } else {
          await showAlert('采购计划已创建并提交审批');
        }
      }
    } catch (error) {
      console.error('创建采购计划失败:', error);
      await showAlert('创建采购计划失败，请重试');
    } finally {
      setShowCreateModal(false);
    }
  };

  // 重置筛选
  const handleReset = () => {
    setRelatedBatchCode('');
    setPurchaseType('全部');
    setStatus('全部');
    setAlertFilter('全部');
    setApplicant('');
    setApplicantDepartment('');
    setPriority('全部');
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
      setSelectedRows(filteredAndSortedData.map(p => p.purchaseApplicationCode));
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

  // 执行导出（修复 XSS 漏洞，使用文本转义）
  const handleDoExport = async () => {
    // 统一使用 purchaseApplicationCode 作为选择键
    const selectedData = purchasePlansData.filter(p => selectedRows.includes(p.purchaseApplicationCode));
    const headers = ['计划编号', '计划名称', '类型', '申请人', '申请日期', '总金额', '供应商', '交货日期', '优先级', '状态'];

    // HTML 转义函数，防止 XSS 攻击
    const escapeHtml = (str: string | number | undefined | null): string => {
      if (str === undefined || str === null) return '';
      const text = String(str);
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    };

    const exportData = selectedData.map(row => ({
      '计划编号': row.purchaseApplicationCode,
      '计划名称': row.planTitle,
      '类型': row.purchaseTypeName,
      '申请人': row.applicant,
      '申请日期': row.applyDate,
      '总金额': row.totalAmount,
      '供应商': row.supplierName,
      '交货日期': row.requiredDate,
      '优先级': row.priorityText,
      '状态': row.statusText
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${escapeHtml(row[h]).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${escapeHtml(row[h])}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${escapeHtml(row[h])}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    // 使用 dayjs 格式化日期
    const fileName = `采购计划_${dayjs().format('YYYY-MM-DD')}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: exportFormat.toUpperCase() + ' Files',
            accept: { [mimeType]: ['.' + extension] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
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

  // 删除确认
  const handleDeleteConfirm = async () => {
    try {
      // 只删除草稿、待审批和审批被拒绝状态的采购计划
      const deletablePlans = purchasePlansData
        .filter(p => selectedRows.includes(p.purchaseApplicationCode))
        .filter(p => p.status === 'draft' || p.status === 'pending' || p.approvalStatus === 'rejected');

      if (deletablePlans.length === 0) {
        await showAlert('没有可删除的采购计划（只能删除草稿、待审批和审批被拒绝状态）');
        return;
      }

      const selectedIds = deletablePlans.map(p => p.id);

      await deletePlans(selectedIds);

      setShowDeleteModal(false);
      setBatchDeleteMode(false);
      setSelectedRows([]);
      await showAlert(`已删除 ${selectedIds.length} 个采购计划`);
    } catch (error) {
      console.error('删除采购计划失败:', error);
      await showAlert('删除失败，请重试');
    }
  };

  // 查看详情
  const handleViewDetail = (plan: PurchasePlan) => {
    setSelectedPlanDetail(plan);
    setShowDetailModal(true);
  };

  // 单条编辑处理
  const handleSingleEdit = (plan: PurchasePlan) => {
    // 已完成或采购中状态不可编辑
    if (plan.status === 'completed' || plan.status === 'purchasing') {
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

  // 单条删除处理
  const handleSingleDelete = async (plan: PurchasePlan) => {
    console.log('【删除采购计划】开始删除, plan:', plan.id, plan.purchaseApplicationCode, 'status:', plan.status, 'approvalStatus:', plan.approvalStatus);
    // 草稿、待审批或审批被拒绝的计划可以删除
    if (plan.status !== 'draft' && plan.status !== 'pending' && plan.approvalStatus !== 'rejected') {
      await showAlert('只有草稿、待审批和审批被拒绝的采购计划才能删除');
      return;
    }
    try {
      await deletePlan(plan.id);
      await showAlert('删除成功');
    } catch (error) {
      console.error('删除采购计划失败:', error);
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

  // 批量编辑下一步/确认
  const handleBatchEditNext = () => {
    setShowBatchEditModal(false);
    setBatchEditMode(false);
    setSelectedRows([]);
    setEditedPlanCodes([]);
    setEditedPlans({});
    setSelectedPlanCode('');
    setCurrentEditingPlan(null);
    setBatchEditItems([]);
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

      console.log('[保存采购计划] currentEditingPlan:', currentEditingPlan);
      console.log('[保存采购计划] batchEditItems:', batchEditItems);
      console.log('[保存采购计划] 发送数据:', {
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
          console.error(`[保存采购计划] 保存 ${planCode} 失败:`, editError);
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
      console.error('保存失败:', error);
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
        }}
        selectedPlanDetail={selectedPlanDetail}
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
