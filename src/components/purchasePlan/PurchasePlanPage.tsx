/**
 * 采购计划页面 - 主组件
 * 重构后使用独立组件
 */
import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { DeleteWarningModal } from './DeleteWarningModal';
import { ExportFormatModal } from '../common/ExportFormatModal';
import { getPurchasePlansWithStatus, getPurchasePlansWithStatusAsync, subscribeToStatusChanges } from '../../hooks/usePurchasePlanStore';
import { apiClient, USE_API } from '../../services/apiClient';
import { submitPurchaseApproval } from '../../services/approvalSubmitService';
import type { PurchasePlan, PurchasePlanItem } from '../../types/purchase';
import { calculateOverdueAlert } from '../../types/purchase';
import { useUserStore } from '../../stores';

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

  // 采购计划数据状态（支持审批联动更新）
  const [purchasePlansData, setPurchasePlansData] = useState<PurchasePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载采购计划数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await getPurchasePlansWithStatusAsync();
        setPurchasePlansData(data);
      } catch (error) {
        console.error('加载采购计划数据失败，使用同步版本:', error);
        setPurchasePlansData(getPurchasePlansWithStatus());
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // 订阅采购计划状态变化事件
  useEffect(() => {
    const unsubscribe = subscribeToStatusChanges(() => {
      // 状态更新时刷新数据
      setPurchasePlansData(getPurchasePlansWithStatus());
    });
    return unsubscribe;
  }, []);

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
      if (relatedBatchCode && !plan.relatedBatchCode.toLowerCase().includes(relatedBatchCode.toLowerCase())) return false;
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

  // 创建提交
  const handleCreateSubmit = async () => {
    try {
      const totalAmount = createItems.reduce((sum, item) => sum + (item.estimatedTotalPrice || 0), 0);

      const planData = {
        plan_code: createForm.purchaseApplicationCode,
        plan_title: `${createForm.purchaseType} - ${createForm.purchaseApplicationCode}`,
        plan_type: createForm.purchaseType,
        department_id: '',
        department_name: createForm.applicantDepartment,
        applicant_id: localStorage.getItem('userId') || '',
        applicant_name: createForm.applicant,
        apply_date: createForm.applyDate,
        expected_date: createForm.requiredDate,
        supplier_id: '',
        supplier_name: '',
        total_amount: totalAmount,
        priority: createForm.priority === '紧急' ? 'urgent' :
                 createForm.priority === '高' ? 'high' :
                 createForm.priority === '中' ? 'normal' : 'low',
        status: 'pending',
        approval_status: 'pending',
        remarks: createForm.remark,
        attachments: [],
        items: createItems,
        create_by: createForm.applicant,
      };

      const result = await apiClient.post<{ id: string; plan_code: string }>('/purchase-plans', planData);

      if (result && result.id) {
        const approvalAmount = totalAmount;

        console.log('【创建采购计划】提交审批，金额:', approvalAmount);

        const approvalResult = await submitPurchaseApproval({
          purchaseId: result.id,
          purchaseCode: result.plan_code || createForm.purchaseApplicationCode,
          purchaseName: planData.plan_title,
          amount: approvalAmount,
          applicantId: planData.applicant_id,
          applicantName: planData.applicant_name,
          department: planData.department_name,
        });

        console.log('【创建采购计划】审批提交结果:', approvalResult);

        if (!approvalResult.success) {
          alert('审批提交失败: ' + approvalResult.message);
          return;
        }

        if (approvalResult.autoApprove) {
          alert('采购计划已创建，金额在免审批阈值内，已自动通过');
        } else {
          alert('采购计划已创建并提交审批');
        }

        const data = await getPurchasePlansWithStatusAsync();
        setPurchasePlansData(data);
      }
    } catch (error) {
      console.error('创建采购计划失败:', error);
      alert('创建采购计划失败，请重试');
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
      alert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  // 执行导出
  const handleDoExport = async () => {
    const selectedData = purchasePlansData.filter(p => selectedRows.includes(p.id));
    const headers = ['计划编号', '计划名称', '类型', '申请人', '申请日期', '总金额', '供应商', '交货日期', '优先级', '状态'];
    const exportData = selectedData.map(row => ({
      '计划编号': row.code,
      '计划名称': row.name,
      '类型': row.type,
      '申请人': row.applicant,
      '申请日期': row.applyDate,
      '总金额': row.totalAmount,
      '供应商': row.supplier,
      '交货日期': row.deliveryDate,
      '优先级': row.priority,
      '状态': row.status
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `采购计划_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
      alert('请先选择要删除的数据');
      return;
    }
    setShowDeleteModal(true);
  };

  // 删除确认
  const handleDeleteConfirm = async () => {
    try {
      // 只删除草稿和已作废状态的采购计划
      const deletablePlans = purchasePlansData
        .filter(p => selectedRows.includes(p.purchaseApplicationCode))
        .filter(p => p.status === 'draft' || p.approvalStatus === 'rejected');

      if (deletablePlans.length === 0) {
        alert('没有可删除的采购计划（只能删除草稿和审批被拒绝状态）');
        return;
      }

      const selectedIds = deletablePlans.map(p => p.id);

      if (USE_API) {
        for (const id of selectedIds) {
          await apiClient.delete(`/purchase-plans/${id}`);
        }
      }

      const data = await getPurchasePlansWithStatusAsync();
      setPurchasePlansData(data);
      setShowDeleteModal(false);
      setBatchDeleteMode(false);
      setSelectedRows([]);
      alert(`已删除 ${selectedIds.length} 个采购计划`);
    } catch (error) {
      console.error('删除采购计划失败:', error);
      alert('删除失败，请重试');
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
      alert('该采购计划已归档，无法编辑');
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
    // 只有草稿或审批被拒绝的计划可以删除
    if (plan.status !== 'draft' && plan.approvalStatus !== 'rejected') {
      alert('只有草稿和审批被拒绝的采购计划才能删除');
      return;
    }
    try {
      if (USE_API) {
        const result = await apiClient.delete<{ success: boolean; error?: string }>(`/purchase-plans/${plan.id}`);
        console.log('【删除采购计划】API返回:', result);
      }
      const data = await getPurchasePlansWithStatusAsync();
      setPurchasePlansData(data);
      alert('删除成功');
    } catch (error) {
      console.error('删除采购计划失败:', error);
      alert('删除失败: ' + (error as Error).message);
    }
  };

  // 批量编辑确认
  const handleBatchEditConfirm = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要编辑的数据');
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
      alert('请先选择一个采购计划');
      return;
    }
    try {
      if (USE_API) {
        // 根据 applicantId 获取申请人姓名
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
        await apiClient.put(`/purchase-plans/${currentEditingPlan.id}`, {
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
      }
      const data = await getPurchasePlansWithStatusAsync();
      setPurchasePlansData(data);
      setShowBatchEditModal(false);
      setBatchEditMode(false);
      setSelectedRows([]);
      setBatchEditItems([]);
      alert('保存成功');
    } catch (error) {
      console.error('保存失败:', error);
      alert(`保存失败: ${error instanceof Error ? error.message : '请重试'}`);
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
