/**
 * 请假申请数据管理 Hook
 * 封装状态管理、数据处理和业务逻辑
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApprovalContext } from '../../../contexts/ApprovalContext';
import { useApprovalLevel } from '../../../hooks/useApprovalLevel';
import { Approval, ApprovalType, ApprovalStatus } from '../../../types/approval';
import { LeaveType, LeaveStatus, LeaveRecord, LeaveFilters, LeaveQuota } from '../../../components/labor/leave/types';
import { leaveQuotaService } from '../../../services/leaveQuotaService';

export interface UseLeaveReturn {
  // 状态
  filters: LeaveFilters;
  setFilters: React.Dispatch<React.SetStateAction<LeaveFilters>>;
  pagination: { current: number; pageSize: number; total: number };
  setPagination: React.Dispatch<React.SetStateAction<{ current: number; pageSize: number; total: number }>>;
  leaveRecords: LeaveRecord[];
  formData: {
    staffId: string;
    staffName: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    remarks: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    staffId: string;
    staffName: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    remarks: string;
  }>>;
  currentQuota: LeaveQuota | null;
  setCurrentQuota: React.Dispatch<React.SetStateAction<LeaveQuota | null>>;
  selectedRecord: LeaveRecord | null;
  setSelectedRecord: React.Dispatch<React.SetStateAction<LeaveRecord | null>>;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
  batchMode: 'none' | 'approve' | 'reject' | 'export';
  withdrawRecord: LeaveRecord | null;
  isWithdrawModalOpen: boolean;

  // 弹窗状态
  isFormModalOpen: boolean;
  setIsFormModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // 过滤后的数据
  filteredData: LeaveRecord[];

  // 事件处理
  handleFilterChange: (field: keyof LeaveFilters, value: string) => void;
  handleResetFilters: () => void;
  handleSearch: () => void;
  handleOpenFormModal: () => void;
  handleOpenDetailModal: (record: LeaveRecord) => void;
  handleStaffChange: (staffId: string, staffName: string) => void;
  handleDateChange: (field: 'startDate' | 'endDate', value: string) => void;
  handleSubmit: () => Promise<void>;
  handleApprove: (record: LeaveRecord) => Promise<void>;
  handleReject: (record: LeaveRecord) => Promise<void>;
  handleOpenWithdrawModal: (record: LeaveRecord) => void;
  handleWithdraw: () => Promise<void>;
  handleBatchApprove: () => void;
  handleBatchReject: () => void;
  handleExport: () => void;
  setBatchMode: React.Dispatch<React.SetStateAction<'none' | 'approve' | 'reject' | 'export'>>;
  setIsWithdrawModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setWithdrawRecord: React.Dispatch<React.SetStateAction<LeaveRecord | null>>;
}

/** 请假类型选项 */
export const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: '年假', label: '年假' },
  { value: '病假', label: '病假' },
  { value: '事假', label: '事假' },
  { value: '婚假', label: '婚假' },
  { value: '产假', label: '产假' },
  { value: '陪产假', label: '陪产假' },
  { value: '丧假', label: '丧假' },
  { value: '工伤假', label: '工伤假' },
];

/** 状态选项 */
export const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '待审批', label: '待审批' },
  { value: '已通过', label: '已通过' },
  { value: '已拒绝', label: '已拒绝' },
  { value: '已撤回', label: '已撤回' },
  { value: '已取消', label: '已取消' },
] as const;

/** 模拟请假余额数据 */
function getLeaveQuota(staffId: string): LeaveQuota {
  const quotaMap: Record<string, LeaveQuota> = {
    'EMP20240001': { staffId: 'EMP20240001', staffName: '张伟民', year: 2026, annualLeaveTotal: 15, annualLeaveUsed: 3, annualLeaveRemaining: 12, sickLeaveTotal: 10, sickLeaveUsed: 1, sickLeaveRemaining: 9, otherLeaveTotal: 5, otherLeaveUsed: 0, otherLeaveRemaining: 5 },
    'EMP20240002': { staffId: 'EMP20240002', staffName: '李秀英', year: 2026, annualLeaveTotal: 15, annualLeaveUsed: 5, annualLeaveRemaining: 10, sickLeaveTotal: 10, sickLeaveUsed: 2, sickLeaveRemaining: 8, otherLeaveTotal: 5, otherLeaveUsed: 1, otherLeaveRemaining: 4 },
    'EMP20240003': { staffId: 'EMP20240003', staffName: '王建国', year: 2026, annualLeaveTotal: 20, annualLeaveUsed: 7, annualLeaveRemaining: 13, sickLeaveTotal: 10, sickLeaveUsed: 0, sickLeaveRemaining: 10, otherLeaveTotal: 5, otherLeaveUsed: 0, otherLeaveRemaining: 5 },
  };
  return quotaMap[staffId] || { staffId, staffName: '', year: 2026, annualLeaveTotal: 15, annualLeaveUsed: 0, annualLeaveRemaining: 15, sickLeaveTotal: 10, sickLeaveUsed: 0, sickLeaveRemaining: 10, otherLeaveTotal: 5, otherLeaveUsed: 0, otherLeaveRemaining: 5 };
}

/** 获取某类型的可用余额 */
function getAvailableDays(quota: LeaveQuota, leaveType: LeaveType): number {
  switch (leaveType) {
    case '年假':
      return quota.annualLeaveRemaining;
    case '病假':
      return quota.sickLeaveRemaining;
    default:
      return quota.otherLeaveRemaining;
  }
}

/** 计算请假天数 */
function calculateDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (endDate < startDate) return 0;
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/** 状态映射 */
function mapApprovalStatus(status: ApprovalStatus): LeaveStatus {
  switch (status) {
    case ApprovalStatus.PENDING: return '待审批';
    case ApprovalStatus.APPROVED: return '已通过';
    case ApprovalStatus.REJECTED: return '已拒绝';
    case ApprovalStatus.CANCELLED: return '已取消';
    default: return '待审批';
  }
}

export function useLeave(
  workers: { workerId: string; name: string; department: string }[]
): UseLeaveReturn {
  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<LeaveFilters>({
    staffName: '',
    leaveType: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  /** 分页状态 */
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  /** 弹窗状态 */
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  /** 选中记录 */
  const [selectedRecord, setSelectedRecord] = useState<LeaveRecord | null>(null);
  const [withdrawRecord, setWithdrawRecord] = useState<LeaveRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState({
    staffId: '',
    staffName: '',
    leaveType: '事假' as LeaveType,
    startDate: '',
    endDate: '',
    days: 0,
    reason: '',
    remarks: '',
  });

  /** 当前余额信息 */
  const [currentQuota, setCurrentQuota] = useState<LeaveQuota | null>(null);

  /** 批量操作模式 */
  const [batchMode, setBatchMode] = useState<'none' | 'approve' | 'reject' | 'export'>('none');

  // ============================================================
  // Context & Hooks
  // ============================================================

  const { addApproval, approve, reject, approvals } = useApprovalContext();
  const { generateApprovers } = useApprovalLevel();

  // ============================================================
  // 数据处理
  // ============================================================

  /** 请假记录数据 */
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);

  /** 初始化加载数据 */
  useEffect(() => {
    // 从ApprovalContext中筛选请假类型的审批记录
    const leaveApprovals = approvals.filter(a => a.type === ApprovalType.LEAVE);

    // 转换为LeaveRecord格式
    const records: LeaveRecord[] = leaveApprovals.map(approval => {
      const businessData = approval.businessLink as {
        leaveId?: string;
        leaveType?: string;
        startDate?: string;
        endDate?: string;
        totalDays?: number;
        reason?: string;
      } | null;
      return {
        id: approval.id,
        staffId: approval.applicantId,
        staffName: approval.applicantName,
        leaveType: (businessData?.leaveType || '事假') as LeaveType,
        startDate: businessData?.startDate || approval.applyDate,
        endDate: businessData?.endDate || approval.applyDate,
        days: businessData?.totalDays || 0,
        reason: businessData?.reason || '',
        status: mapApprovalStatus(approval.status),
        approver: approval.approvers[0]?.userName,
        approveTime: approval.approvers[0]?.actionTime,
        remarks: approval.remark,
      };
    });

    setLeaveRecords(records);
    setPagination(prev => ({ ...prev, total: records.length }));
  }, [approvals]);

  /** 过滤后的数据 */
  const filteredData = useMemo(() => {
    return leaveRecords.filter(record => {
      if (filters.staffName && !record.staffName.includes(filters.staffName)) return false;
      if (filters.leaveType && record.leaveType !== filters.leaveType) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.startDate < filters.startDate) return false;
      if (filters.endDate && record.endDate > filters.endDate) return false;
      return true;
    });
  }, [leaveRecords, filters]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = useCallback((field: keyof LeaveFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 重置筛选 */
  const handleResetFilters = useCallback(() => {
    setFilters({ staffName: '', leaveType: '', status: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 搜索 */
  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 打开新增弹窗 */
  const handleOpenFormModal = useCallback(() => {
    setSelectedRecord(null);
    setFormData({
      staffId: '',
      staffName: '',
      leaveType: '事假',
      startDate: '',
      endDate: '',
      days: 0,
      reason: '',
      remarks: '',
    });
    setCurrentQuota(null);
    setIsFormModalOpen(true);
  }, []);

  /** 打开详情弹窗 */
  const handleOpenDetailModal = useCallback((record: LeaveRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  /** 员工选择变化 */
  const handleStaffChange = useCallback((staffId: string, staffName: string) => {
    const quota = getLeaveQuota(staffId);
    setCurrentQuota(quota);
    setFormData(prev => ({ ...prev, staffId, staffName }));
  }, []);

  /** 日期变化 */
  const handleDateChange = useCallback((field: 'startDate' | 'endDate', value: string) => {
    const newFormData = { ...formData, [field]: value };

    // 重新计算天数
    if (field === 'startDate') {
      newFormData.days = calculateDays(value, formData.endDate);
    } else {
      newFormData.days = calculateDays(formData.startDate, value);
    }

    setFormData(newFormData);
  }, [formData]);

  /** 提交请假申请 */
  const handleSubmit = useCallback(async () => {
    if (!formData.staffId || !formData.startDate || !formData.endDate || !formData.reason) {
      alert('请填写完整信息');
      return;
    }

    // 余额校验
    if (currentQuota) {
      const available = getAvailableDays(currentQuota, formData.leaveType);
      if (formData.days > available) {
        alert(`余额不足！当前可用天数: ${available}天，申请天数: ${formData.days}天`);
        return;
      }
    }

    // 生成新记录
    const newRecord: LeaveRecord = {
      id: `LV${Date.now()}`,
      staffId: formData.staffId,
      staffName: formData.staffName,
      leaveType: formData.leaveType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      days: formData.days,
      reason: formData.reason,
      status: '待审批',
      remarks: formData.remarks,
    };

    // 创建审批记录
    const approvalLevelResult = generateApprovers(ApprovalType.LEAVE, 0, { leaveDays: formData.days });

    const approval: Approval = {
      id: `APR-${Date.now()}`,
      code: `SP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      type: ApprovalType.LEAVE,
      typeName: '请假申请',
      category: 'hr',
      title: `${formData.staffName}申请${formData.leaveType}${formData.days}天`,
      description: formData.reason,
      applicantId: formData.staffId,
      applicantName: formData.staffName,
      applicantDepartment: workers.find(w => w.workerId === formData.staffId)?.department || '生产部',
      applyDate: new Date().toISOString().slice(0, 10),
      applyTime: new Date().toISOString().slice(11, 19),
      priority: 'normal',
      status: ApprovalStatus.PENDING,
      currentStep: 1,
      totalSteps: approvalLevelResult.totalSteps,
      approvers: approvalLevelResult.approvers,
      records: [],
      remark: formData.remarks,
      reminderCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notificationSent: true,
      businessLink: {
        type: 'leave',
        requestId: newRecord.id,
        leaveId: newRecord.id,
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalDays: formData.days,
        reason: formData.reason,
      },
    };

    try {
      await addApproval(approval);
    } catch (error) {
      console.error('添加审批记录失败:', error);
      alert('提交失败，请重试');
      return;
    }

    // 冻结请假余额
    leaveQuotaService.freezeQuota(formData.staffId, formData.leaveType, formData.days);

    // 更新本地状态
    setLeaveRecords(prev => [newRecord, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));

    setIsFormModalOpen(false);
    alert('提交成功！');
  }, [formData, currentQuota, addApproval, generateApprovers, workers]);

  /** 审批通过 */
  const handleApprove = useCallback(async (record: LeaveRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      try {
        await approve(approval.id, '同意');
        leaveQuotaService.deductQuota(record.staffId, record.leaveType, record.days);
        setLeaveRecords(prev =>
          prev.map(r => r.id === record.id ? { ...r, status: '已通过' as LeaveStatus } : r)
        );
      } catch (error) {
        console.error('审批通过失败:', error);
        alert('审批失败，请重试');
      }
    }
  }, [approve, approvals]);

  /** 审批驳回 */
  const handleReject = useCallback(async (record: LeaveRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      try {
        await reject(approval.id, '不符合条件');
        leaveQuotaService.releaseQuota(record.staffId, record.leaveType, record.days);
        setLeaveRecords(prev =>
          prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as LeaveStatus } : r)
        );
      } catch (error) {
        console.error('审批驳回失败:', error);
        alert('操作失败，请重试');
      }
    }
  }, [reject, approvals]);

  /** 打开撤回确认弹窗 */
  const handleOpenWithdrawModal = useCallback((record: LeaveRecord) => {
    setWithdrawRecord(record);
    setIsWithdrawModalOpen(true);
  }, []);

  /** 撤回请假申请 */
  const handleWithdraw = useCallback(async () => {
    if (!withdrawRecord) return;

    const approval = approvals.find(a => a.id === withdrawRecord.id);
    if (approval) {
      try {
        await reject(approval.id, '用户撤回申请');
        leaveQuotaService.releaseQuota(withdrawRecord.staffId, withdrawRecord.leaveType, withdrawRecord.days);
        setLeaveRecords(prev =>
          prev.map(r => r.id === withdrawRecord.id ? { ...r, status: '已撤回' as LeaveStatus } : r)
        );
      } catch (error) {
        console.error('撤回申请失败:', error);
        alert('撤回失败，请重试');
        setIsWithdrawModalOpen(false);
        setWithdrawRecord(null);
        return;
      }
    }

    setIsWithdrawModalOpen(false);
    setWithdrawRecord(null);
    alert('请假申请已撤回');
  }, [withdrawRecord, reject, approvals]);

  /** 批量审批通过 */
  const handleBatchApprove = useCallback(() => {
    selectedRowKeys.forEach(key => {
      const record = leaveRecords.find(r => r.id === key);
      if (record) handleApprove(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, leaveRecords, handleApprove]);

  /** 批量审批驳回 */
  const handleBatchReject = useCallback(() => {
    selectedRowKeys.forEach(key => {
      const record = leaveRecords.find(r => r.id === key);
      if (record) handleReject(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, leaveRecords, handleReject]);

  /** 导出功能 */
  const handleExport = useCallback(() => {
    const dataToExport = selectedRowKeys.length > 0
      ? filteredData.filter(r => selectedRowKeys.includes(r.id))
      : filteredData;

    const headers = ['员工姓名', '请假类型', '开始日期', '结束日期', '天数', '状态', '请假原因', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.staffName,
      '请假类型': row.leaveType,
      '开始日期': row.startDate,
      '结束日期': row.endDate,
      '天数': row.days,
      '状态': row.status,
      '请假原因': row.reason,
      '备注': row.remarks || '',
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `请假记录_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, filteredData]);

  return {
    // 状态
    filters,
    setFilters,
    pagination,
    setPagination,
    leaveRecords,
    formData,
    setFormData,
    currentQuota,
    setCurrentQuota,
    selectedRecord,
    setSelectedRecord,
    selectedRowKeys,
    setSelectedRowKeys,
    batchMode,
    withdrawRecord,
    isWithdrawModalOpen,

    // 弹窗状态
    isFormModalOpen,
    setIsFormModalOpen,
    isDetailModalOpen,
    setIsDetailModalOpen,

    // 数据
    filteredData,

    // 事件处理
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleStaffChange,
    handleDateChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleOpenWithdrawModal,
    handleWithdraw,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
    setBatchMode,
    setIsWithdrawModalOpen,
    setWithdrawRecord,
  };
}
