/**
 * 请假申请数据管理 Hook (V2.0 架构改造)
 *
 * 数据流：useLeaveStore → Hook → 组件
 * 不再使用 React Query，改为直接与 Zustand Store 交互
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLeaveStore } from '@/stores/leaveStore';
import type { LeaveRecord as StoreLeaveRecord, LeaveType as StoreLeaveType, LeaveStatus as StoreLeaveStatus, LeaveFilters as StoreLeaveFilters } from '@/stores/leaveStore';
import { showAlert } from '@/lib/dialogService';
import type { LeaveType, LeaveStatus, LeaveFilters } from '../../../components/labor/leave/types';

// ==================== 类型定义 ====================

/** 组件内部使用的请假记录格式 */
interface LeaveRecord {
  id: string;
  staffId: string;
  staffName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approver?: string;
  approveTime?: string;
  remarks?: string;
}

/**
 * 英文枚举值 → 中文标签映射
 */
const LEAVE_TYPE_EN_TO_CN: Record<string, LeaveType> = {
  annual: '年假',
  sick: '病假',
  personal: '事假',
  marriage: '婚假',
  maternity: '产假',
  paternity: '陪产假',
  bereavement: '丧假',
  work_injury: '工伤假',
};

const LEAVE_STATUS_EN_TO_CN: Record<string, LeaveStatus> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  cancelled: '已取消',
  withdrawn: '已撤回',
};

/** 中文标签 → 英文枚举值 */
const LEAVE_TYPE_CN_TO_EN: Record<string, string> = {};
for (const [en, cn] of Object.entries(LEAVE_TYPE_EN_TO_CN)) {
  LEAVE_TYPE_CN_TO_EN[cn] = en;
}
const LEAVE_STATUS_CN_TO_EN: Record<string, string> = {};
for (const [en, cn] of Object.entries(LEAVE_STATUS_EN_TO_CN)) {
  LEAVE_STATUS_CN_TO_EN[cn] = en;
}

/**
 * Store 格式 → 组件内部格式
 */
function mapStoreToComponent(record: StoreLeaveRecord): LeaveRecord {
  return {
    id: record.id,
    staffId: record.workerId,
    staffName: record.workerName,
    leaveType: (LEAVE_TYPE_EN_TO_CN[record.leaveType] || record.leaveType) as LeaveType,
    startDate: record.startDate,
    endDate: record.endDate,
    days: record.days,
    reason: record.reason,
    status: (LEAVE_STATUS_EN_TO_CN[record.status] || record.status) as LeaveStatus,
    approver: record.approver,
    approveTime: record.approveTime,
    remarks: record.remarks,
  };
}

// ==================== Hook 返回类型 ====================

export interface UseLeaveReturn {
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
  currentQuota: { staffId: string; staffName: string; year: number; annualLeaveTotal: number; annualLeaveUsed: number; annualLeaveRemaining: number; sickLeaveTotal: number; sickLeaveUsed: number; sickLeaveRemaining: number; otherLeaveTotal: number; otherLeaveUsed: number; otherLeaveRemaining: number } | null;
  setCurrentQuota: React.Dispatch<React.SetStateAction<{ staffId: string; staffName: string; year: number; annualLeaveTotal: number; annualLeaveUsed: number; annualLeaveRemaining: number; sickLeaveTotal: number; sickLeaveUsed: number; sickLeaveRemaining: number; otherLeaveTotal: number; otherLeaveUsed: number; otherLeaveRemaining: number } | null>>;
  selectedRecord: LeaveRecord | null;
  setSelectedRecord: React.Dispatch<React.SetStateAction<LeaveRecord | null>>;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
  batchMode: 'none' | 'approve' | 'reject' | 'export';
  withdrawRecord: LeaveRecord | null;
  isWithdrawModalOpen: boolean;
  isFormModalOpen: boolean;
  setIsFormModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  filteredData: LeaveRecord[];
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

// ==================== 常量 ====================

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

export const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '待审批', label: '待审批' },
  { value: '已通过', label: '已通过' },
  { value: '已拒绝', label: '已拒绝' },
  { value: '已撤回', label: '已撤回' },
  { value: '已取消', label: '已取消' },
] as const;

/** 计算请假天数 */
function calculateDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (endDate < startDate) return 0;
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// ==================== Hook 实现 ====================

export function useLeave(
  _workers: { workerId: string; name: string; department: string }[]
): UseLeaveReturn {
  // ========== 从 Store 获取数据和方法 ==========
  const storeRecords = useLeaveStore((s) => s.leaveRecords);
  const fetchItems = useLeaveStore((s) => s.fetchItems);
  const createItem = useLeaveStore((s) => s.createItem);
  const updateItem = useLeaveStore((s) => s.updateItem);
  const approveLeave = useLeaveStore((s) => s.approveLeave);
  const rejectLeave = useLeaveStore((s) => s.rejectLeave);

  // ========== 挂载时加载数据 ==========
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ========== 筛选条件 ==========
  const [filters, setFilters] = useState<LeaveFilters>({
    staffName: '',
    leaveType: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  // ========== 分页状态 ==========
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // ========== 弹窗状态 ==========
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // ========== 选中记录 ==========
  const [selectedRecord, setSelectedRecord] = useState<LeaveRecord | null>(null);
  const [withdrawRecord, setWithdrawRecord] = useState<LeaveRecord | null>(null);

  // ========== 批量选择 ==========
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // ========== 表单数据 ==========
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

  // ========== 当前余额信息 ==========
  const [currentQuota, setCurrentQuota] = useState<UseLeaveReturn['currentQuota']>(null);

  // ========== 批量操作模式 ==========
  const [batchMode, setBatchMode] = useState<'none' | 'approve' | 'reject' | 'export'>('none');

  // ========== Store数据 → 组件格式 ==========
  const leaveRecords: LeaveRecord[] = useMemo(() => {
    return storeRecords.map(mapStoreToComponent);
  }, [storeRecords]);

  // ========== 更新分页总数 ==========
  useMemo(() => {
    setPagination(prev => ({ ...prev, total: leaveRecords.length }));
  }, [leaveRecords.length]);

  // ========== 筛选（纯前端计算）==========
  const filteredData = useMemo(() => {
    return leaveRecords.filter((record) => {
      if (filters.staffName && !record.staffName.includes(filters.staffName)) return false;
      if (filters.leaveType && record.leaveType !== filters.leaveType) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.startDate < filters.startDate) return false;
      if (filters.endDate && record.endDate > filters.endDate) return false;
      return true;
    });
  }, [leaveRecords, filters]);

  // ========== 筛选条件变化 ==========
  const handleFilterChange = useCallback((field: keyof LeaveFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  // ========== 重置筛选 ==========
  const handleResetFilters = useCallback(() => {
    setFilters({ staffName: '', leaveType: '', status: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  // ========== 搜索 ==========
  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  // ========== 打开新增弹窗 ==========
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

  // ========== 打开详情弹窗 ==========
  const handleOpenDetailModal = useCallback((record: LeaveRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  // ========== 员工选择变化 ==========
  const handleStaffChange = useCallback((staffId: string, staffName: string) => {
    setFormData(prev => ({ ...prev, staffId, staffName }));
  }, []);

  // ========== 日期变化 ==========
  const handleDateChange = useCallback((field: 'startDate' | 'endDate', value: string) => {
    setFormData(prev => {
      const newFormData = { ...prev, [field]: value };
      if (field === 'startDate') {
        newFormData.days = calculateDays(value, prev.endDate);
      } else {
        newFormData.days = calculateDays(prev.startDate, value);
      }
      return newFormData;
    });
  }, []);

  // ========== 提交请假申请 ==========
  const handleSubmit = useCallback(async () => {
    if (!formData.staffId || !formData.startDate || !formData.endDate || !formData.reason) {
      await showAlert('请填写完整信息');
      return;
    }

    try {
      // 中文标签转英文枚举（Store使用英文枚举）
      const engType = LEAVE_TYPE_CN_TO_EN[formData.leaveType] || 'personal';
      await createItem({
        workerId: formData.staffId,
        workerName: formData.staffName,
        leaveType: engType as StoreLeaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days: formData.days,
        reason: formData.reason,
        remarks: formData.remarks,
        status: 'pending' as StoreLeaveStatus,
      });

      setIsFormModalOpen(false);
      // 重新拉取确保数据同步
      fetchItems();
      await showAlert('提交成功！');
    } catch (error) {
      console.error('提交请假申请失败:', error);
      await showAlert('提交失败，请重试');
    }
  }, [formData, createItem, fetchItems]);

  // ========== 审批通过 ==========
  const handleApprove = useCallback(async (record: LeaveRecord) => {
    try {
      await approveLeave(record.id, record.approver);
      fetchItems();
    } catch (error) {
      console.error('审批通过失败:', error);
      await showAlert('审批失败，请重试');
    }
  }, [approveLeave, fetchItems]);

  // ========== 审批驳回 ==========
  const handleReject = useCallback(async (record: LeaveRecord) => {
    try {
      await rejectLeave(record.id, '审批驳回');
      fetchItems();
    } catch (error) {
      console.error('审批驳回失败:', error);
      await showAlert('操作失败，请重试');
    }
  }, [rejectLeave, fetchItems]);

  // ========== 打开撤回确认弹窗 ==========
  const handleOpenWithdrawModal = useCallback((record: LeaveRecord) => {
    setWithdrawRecord(record);
    setIsWithdrawModalOpen(true);
  }, []);

  // ========== 撤回请假申请 ==========
  const handleWithdraw = useCallback(async () => {
    if (!withdrawRecord) return;

    try {
      await updateItem(withdrawRecord.id, {
        status: 'withdrawn' as StoreLeaveStatus,
      });

      setIsWithdrawModalOpen(false);
      setWithdrawRecord(null);
      fetchItems();
      await showAlert('请假申请已撤回');
    } catch (error) {
      console.error('撤回申请失败:', error);
      await showAlert('撤回失败，请重试');
      setIsWithdrawModalOpen(false);
      setWithdrawRecord(null);
    }
  }, [withdrawRecord, updateItem, fetchItems]);

  // ========== 批量审批通过 ==========
  const handleBatchApprove = useCallback(() => {
    selectedRowKeys.forEach(key => {
      const record = leaveRecords.find(r => r.id === key);
      if (record) handleApprove(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, leaveRecords, handleApprove]);

  // ========== 批量审批驳回 ==========
  const handleBatchReject = useCallback(() => {
    selectedRowKeys.forEach(key => {
      const record = leaveRecords.find(r => r.id === key);
      if (record) handleReject(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, leaveRecords, handleReject]);

  // ========== 导出功能 ==========
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
    isFormModalOpen,
    setIsFormModalOpen,
    isDetailModalOpen,
    setIsDetailModalOpen,
    filteredData,
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
