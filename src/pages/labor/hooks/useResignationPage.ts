/**
 * 离职申请页面 Hook
 * 封装状态管理、API调用和数据处理逻辑
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useUsers } from '../../../components/common/settings';
import { useApprovalContext } from '../../../contexts/ApprovalContext';
import { Approval, ApprovalType, ApprovalStatus } from '../../../types/approval';
import { useApprovalLevel } from '../../../hooks/useApprovalLevel';
import {
  ResignationRecord,
  ResignationFilters,
  ResignationFormData,
  BatchMode,
  PaginationState,
  mapResignationStatus,
  ResignationType,
} from '../types/resignationPage.types';

// 默认筛选条件
const DEFAULT_FILTERS: ResignationFilters = {
  workerName: '',
  resignationType: '',
  status: '',
  startDate: '',
  endDate: '',
};

// 默认表单数据
const DEFAULT_FORM_DATA: ResignationFormData = {
  workerId: '',
  workerName: '',
  resignationType: '主动离职',
  reason: '',
  expectedLastDay: '',
  handoverUserId: '',
  handoverUserName: '',
  handoverNote: '',
};

/**
 * 离职申请页面 Hook
 */
export function useResignationPage() {
  const { workers } = useUsers();
  const { addApproval, approve, reject, approvals } = useApprovalContext();
  const { generateApprovers } = useApprovalLevel();

  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<ResignationFilters>(DEFAULT_FILTERS);

  /** 分页状态 */
  const [pagination, setPagination] = useState<PaginationState>({ current: 1, pageSize: 10, total: 0 });

  /** 弹窗状态 */
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  /** 选中记录 */
  const [selectedRecord, setSelectedRecord] = useState<ResignationRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState<ResignationFormData>(DEFAULT_FORM_DATA);

  /** 批量操作模式 */
  const [batchMode, setBatchMode] = useState<BatchMode>('none');

  /** 离职记录数据 */
  const [resignationRecords, setResignationRecords] = useState<ResignationRecord[]>([]);

  // ============================================================
  // 数据处理
  // ============================================================

  /** 初始化加载数据 */
  useEffect(() => {
    // 从ApprovalContext中筛选离职类型的审批记录
    const resignationApprovals = approvals.filter(a => a.type === ApprovalType.RESIGNATION);

    // 转换为ResignationRecord格式
    const records: ResignationRecord[] = resignationApprovals.map(approval => {
      const businessData = approval.businessLink as {
        resignationId?: string;
        resignationType?: string;
        expectedResignDate?: string;
        reason?: string;
        handoverNotes?: string;
        handoverUserId?: string;
        handoverUserName?: string;
      } | null;

      return {
        id: approval.id,
        resignationCode: approval.code,
        workerId: approval.applicantId,
        workerName: approval.applicantName,
        resignationType: (businessData?.resignationType as ResignationType) || '主动离职',
        reason: businessData?.reason || '',
        expectedLastDay: businessData?.expectedResignDate || approval.applyDate,
        handoverNote: businessData?.handoverNotes || '',
        handoverUserId: businessData?.handoverUserId || '',
        handoverUserName: businessData?.handoverUserName || '',
        status: mapResignationStatus(approval.status),
        createTime: approval.applyDate,
      };
    });

    // 按创建时间倒序排列
    records.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());

    setResignationRecords(records);
    setPagination(prev => ({ ...prev, total: records.length }));
  }, [approvals]);

  /** 过滤后的数据 */
  const filteredData = useMemo(() => {
    return resignationRecords.filter(record => {
      if (filters.workerName && !record.workerName.includes(filters.workerName)) return false;
      if (filters.resignationType && record.resignationType !== filters.resignationType) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.createTime < filters.startDate) return false;
      if (filters.endDate && record.createTime > filters.endDate) return false;
      return true;
    });
  }, [resignationRecords, filters]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = useCallback((field: keyof ResignationFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 重置筛选 */
  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 搜索 */
  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 打开新增弹窗 */
  const handleOpenFormModal = useCallback(() => {
    setSelectedRecord(null);
    setFormData(DEFAULT_FORM_DATA);
    setIsFormModalOpen(true);
  }, []);

  /** 打开详情弹窗 */
  const handleOpenDetailModal = useCallback((record: ResignationRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  /** 员工选择变化 */
  const handleWorkerChange = useCallback((workerId: string) => {
    const worker = workers.find(w => w.workerId === workerId);
    if (worker) {
      setFormData(prev => ({ ...prev, workerId, workerName: worker.name }));
    }
  }, [workers]);

  /** 交接人选择变化 */
  const handleHandoverUserChange = useCallback((userId: string) => {
    const worker = workers.find(w => w.workerId === userId);
    if (worker) {
      setFormData(prev => ({ ...prev, handoverUserId: userId, handoverUserName: worker.name }));
    }
  }, [workers]);

  /** 离职类型变化 - 清空原因 */
  const handleResignationTypeChange = useCallback((type: ResignationType) => {
    setFormData(prev => ({ ...prev, resignationType: type, reason: '' }));
  }, []);

  /** 提交离职申请 */
  const handleSubmit = useCallback(() => {
    if (!formData.workerId || !formData.expectedLastDay || !formData.reason) {
      alert('请填写完整信息');
      return;
    }

    // 检查预计离职日期是否提前30天通知
    const today = new Date();
    const lastDay = new Date(formData.expectedLastDay);
    const daysDiff = Math.ceil((lastDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 30 && daysDiff >= 0) {
      const confirmSubmit = window.confirm(`温馨提示：您选择的预计离职日期距离今天不足30天，是否确认提交？`);
      if (!confirmSubmit) return;
    } else if (daysDiff < 0) {
      alert('预计离职日期不能早于今天，请重新选择');
      return;
    }

    // 生成新记录
    const newRecord: ResignationRecord = {
      id: `RSG${Date.now()}`,
      resignationCode: `LZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      workerId: formData.workerId,
      workerName: formData.workerName,
      resignationType: formData.resignationType,
      reason: formData.reason,
      expectedLastDay: formData.expectedLastDay,
      handoverNote: formData.handoverNote,
      handoverUserId: formData.handoverUserId,
      handoverUserName: formData.handoverUserName,
      status: '待审批',
      createTime: new Date().toISOString().slice(0, 10),
    };

    // 创建审批记录 - 使用分级审批动态生成审批人配置（离职强制严格审批）
    const approvalLevelResult = generateApprovers(ApprovalType.RESIGNATION, 0);

    const approval: Approval = {
      id: `APR-${Date.now()}`,
      code: newRecord.resignationCode,
      type: ApprovalType.RESIGNATION,
      typeName: '离职申请',
      category: 'hr',
      title: `${formData.workerName}申请离职（${formData.resignationType}）`,
      description: `${formData.resignationType}：${formData.reason}`,
      applicantId: formData.workerId,
      applicantName: formData.workerName,
      applicantDepartment: workers.find(w => w.workerId === formData.workerId)?.department || '生产部',
      applyDate: new Date().toISOString().slice(0, 10),
      applyTime: new Date().toISOString().slice(11, 19),
      priority: 'normal',
      status: ApprovalStatus.PENDING,
      currentStep: 1,
      totalSteps: approvalLevelResult.totalSteps,
      approvers: approvalLevelResult.approvers,
      records: [],
      reminderCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notificationSent: true,
      businessLink: {
        type: 'resign',
        requestId: newRecord.id,
        requestCode: newRecord.resignationCode,
        resignationType: formData.resignationType,
        expectedResignDate: formData.expectedLastDay,
        reason: formData.reason,
        handoverNotes: formData.handoverNote,
        handoverUserId: formData.handoverUserId,
        handoverUserName: formData.handoverUserName,
      },
    };

    // 添加到Context
    addApproval(approval);

    // 更新本地状态
    setResignationRecords(prev => [newRecord, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));

    setIsFormModalOpen(false);
    alert('提交成功！');
  }, [formData, workers, addApproval, generateApprovers]);

  /** 审批通过 */
  const handleApprove = useCallback((record: ResignationRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      approve(approval.id, '同意');
      setResignationRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已通过' as const } : r)
      );
    }
  }, [approvals, approve]);

  /** 审批驳回 */
  const handleReject = useCallback((record: ResignationRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      reject(approval.id, '不符合条件');
      setResignationRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as const } : r)
      );
    }
  }, [approvals, reject]);

  /** 批量审批通过 */
  const handleBatchApprove = useCallback(() => {
    selectedRowKeys.forEach(key => {
      const record = resignationRecords.find(r => r.id === key);
      if (record) handleApprove(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, resignationRecords, handleApprove]);

  /** 批量审批驳回 */
  const handleBatchReject = useCallback(() => {
    selectedRowKeys.forEach(key => {
      const record = resignationRecords.find(r => r.id === key);
      if (record) handleReject(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, resignationRecords, handleReject]);

  /** 导出功能 */
  const handleExport = useCallback(() => {
    const dataToExport = selectedRowKeys.length > 0
      ? filteredData.filter(r => selectedRowKeys.includes(r.id))
      : filteredData;

    const headers = ['离职编号', '申请人', '离职类型', '离职原因', '预计最后工作日', '交接人', '交接说明', '状态', '申请时间'];
    const exportData = dataToExport.map(row => ({
      '离职编号': row.resignationCode,
      '申请人': row.workerName,
      '离职类型': row.resignationType,
      '离职原因': row.reason,
      '预计最后工作日': row.expectedLastDay,
      '交接人': row.handoverUserName,
      '交接说明': row.handoverNote,
      '状态': row.status,
      '申请时间': row.createTime,
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `离职记录_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, filteredData]);

  // ============================================================
  // 返回值
  // ============================================================

  return {
    // 状态
    filters,
    pagination,
    isFormModalOpen,
    isDetailModalOpen,
    selectedRecord,
    selectedRowKeys,
    formData,
    batchMode,
    resignationRecords,
    filteredData,
    // 方法
    setFilters,
    setPagination,
    setIsFormModalOpen,
    setIsDetailModalOpen,
    setSelectedRecord,
    setSelectedRowKeys,
    setFormData,
    setBatchMode,
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleWorkerChange,
    handleHandoverUserChange,
    handleResignationTypeChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
  };
}
