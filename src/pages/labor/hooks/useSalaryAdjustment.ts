/**
 * 调薪申请数据管理 Hook（V2.0 改造）
 * 使用 Zustand Store 替代 React Query
 * 保留所有业务逻辑，替换数据源为 useSalaryAdjustmentStore
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSalaryAdjustmentStore } from '@/stores';
import type { SalaryAdjustmentData } from '@/stores';
import { showAlert } from '@/lib/dialogService';
import type {
  SalaryAdjustmentFilters,
  SalaryAdjustmentFormData,
  SalaryAdjustmentPagination,
} from '../types/salaryAdjustment.types';

/** API 数据转换为组件内部格式（Store 已处理 normalize，此处做状态标签映射） */
function mapStatusLabel(item: SalaryAdjustmentData): SalaryAdjustmentData {
  const statusMap: Record<string, string> = {
    'pending': '待审批',
    'approved': '已通过',
    'rejected': '已拒绝',
    'cancelled': '已取消',
    'PENDING': '待审批',
    'APPROVED': '已通过',
    'REJECTED': '已拒绝',
    'CANCELLED': '已取消',
  };
  return {
    ...item,
    statusLabel: statusMap[item.status] || item.statusLabel || item.status,
  };
}

export interface UseSalaryAdjustmentReturn {
  // 状态
  filters: SalaryAdjustmentFilters;
  setFilters: React.Dispatch<React.SetStateAction<SalaryAdjustmentFilters>>;
  pagination: SalaryAdjustmentPagination;
  setPagination: React.Dispatch<React.SetStateAction<SalaryAdjustmentPagination>>;
  records: SalaryAdjustmentData[];
  formData: SalaryAdjustmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<SalaryAdjustmentFormData>>;
  selectedRecord: SalaryAdjustmentData | null;
  setSelectedRecord: React.Dispatch<React.SetStateAction<SalaryAdjustmentData | null>>;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
  batchMode: 'none' | 'approve' | 'reject' | 'export';

  // 弹窗状态
  isFormModalOpen: boolean;
  setIsFormModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // 过滤后的数据
  filteredData: SalaryAdjustmentData[];
  departmentOptions: { value: string; label: string }[];

  // 计算属性
  displayAmount: number;
  displayRatio: number;

  // 事件处理
  handleFilterChange: (field: keyof SalaryAdjustmentFilters, value: string) => void;
  handleResetFilters: () => void;
  handleSearch: () => void;
  handleOpenFormModal: () => void;
  handleOpenDetailModal: (record: SalaryAdjustmentData) => void;
  handleStaffChange: (employeeId: string, employeeName: string, department: string, position: string, currentSalary: number) => void;
  handleProposedSalaryChange: (value: number) => void;
  handleSubmit: () => Promise<void>;
  handleApprove: (record: SalaryAdjustmentData) => Promise<void>;
  handleReject: (record: SalaryAdjustmentData) => Promise<void>;
  handleBatchApprove: () => void;
  handleBatchReject: () => void;
  handleExport: () => void;
  setBatchMode: React.Dispatch<React.SetStateAction<'none' | 'approve' | 'reject' | 'export'>>;
}

/** 计算调整金额和比例 */
function calculateAdjustment(current: number, proposed: number) {
  const amount = proposed - current;
  const ratio = current > 0 ? (amount / current) * 100 : 0;
  return { amount, ratio };
}

export function useSalaryAdjustment(
  workers: { workerId: string; name: string; department: string; position: string; wagesType?: string; salary?: number }[]
): UseSalaryAdjustmentReturn {
  // ========== 从 Store 获取数据和方法 ==========
  const storeItems = useSalaryAdjustmentStore((s) => s.items);
  const fetchItems = useSalaryAdjustmentStore((s) => s.fetchItems);
  const createItem = useSalaryAdjustmentStore((s) => s.createItem);
  const approveItemStore = useSalaryAdjustmentStore((s) => s.approveItem);
  const rejectItemStore = useSalaryAdjustmentStore((s) => s.rejectItem);

  // ========== 组件挂载时加载数据 ==========
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ========== 状态定义 ==========

  const [filters, setFilters] = useState<SalaryAdjustmentFilters>({
    employeeName: '',
    department: '',
    adjustmentType: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const [pagination, setPagination] = useState<SalaryAdjustmentPagination>({ current: 1, pageSize: 10, total: 0 });

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<SalaryAdjustmentData | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [formData, setFormData] = useState<SalaryAdjustmentFormData>({
    employeeId: '',
    employeeName: '',
    department: '',
    position: '',
    currentSalary: 0,
    proposedSalary: 0,
    adjustmentType: '年度调薪',
    effectiveDate: '',
    reason: '',
    remarks: '',
  });

  const [batchMode, setBatchMode] = useState<'none' | 'approve' | 'reject' | 'export'>('none');

  // ========== 数据处理 ==========

  /** Store 数据映射状态标签 */
  const records: SalaryAdjustmentData[] = useMemo(() => {
    return storeItems.map(mapStatusLabel);
  }, [storeItems]);

  /** 更新分页总数 */
  useEffect(() => {
    setPagination(prev => ({ ...prev, total: records.length }));
  }, [records.length]);

  /** 过滤后的数据 */
  const filteredData = useMemo(() => {
    return records.filter(record => {
      if (filters.employeeName && !record.employeeName.includes(filters.employeeName)) return false;
      if (filters.department && record.department !== filters.department) return false;
      if (filters.adjustmentType && record.adjustmentType !== filters.adjustmentType) return false;
      if (filters.status && record.statusLabel !== filters.status) return false;
      if (filters.startDate && record.effectiveDate < filters.startDate) return false;
      if (filters.endDate && record.effectiveDate > filters.endDate) return false;
      return true;
    });
  }, [records, filters]);

  /** 部门选项 */
  const departmentOptions = useMemo(() => {
    const depts = [...new Set(workers.map(w => w.department))];
    return [{ value: '', label: '全部' }, ...depts.map(d => ({ value: d, label: d }))];
  }, [workers]);

  /** 计算调整金额和比例 */
  const { amount: displayAmount, ratio: displayRatio } = useMemo(() => {
    return calculateAdjustment(formData.currentSalary, formData.proposedSalary);
  }, [formData.currentSalary, formData.proposedSalary]);

  // ========== 事件处理 ==========

  const handleFilterChange = useCallback((field: keyof SalaryAdjustmentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({ employeeName: '', department: '', adjustmentType: '', status: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleOpenFormModal = useCallback(() => {
    setSelectedRecord(null);
    setFormData({
      employeeId: '',
      employeeName: '',
      department: '',
      position: '',
      currentSalary: 0,
      proposedSalary: 0,
      adjustmentType: '年度调薪',
      effectiveDate: '',
      reason: '',
      remarks: '',
    });
    setIsFormModalOpen(true);
  }, []);

  const handleOpenDetailModal = useCallback((record: SalaryAdjustmentData) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  const handleStaffChange = useCallback((
    employeeId: string,
    employeeName: string,
    department: string,
    position: string,
    currentSalary: number
  ) => {
    setFormData(prev => ({
      ...prev,
      employeeId,
      employeeName,
      department,
      position,
      currentSalary,
      proposedSalary: 0,
    }));
  }, []);

  const handleProposedSalaryChange = useCallback((value: number) => {
    setFormData(prev => ({ ...prev, proposedSalary: value }));
  }, []);

  /** 提交调薪申请 */
  const handleSubmit = useCallback(async () => {
    if (!formData.employeeId || !formData.proposedSalary || !formData.effectiveDate || !formData.reason) {
      await showAlert('请填写完整信息');
      return;
    }

    if (formData.proposedSalary <= formData.currentSalary) {
      await showAlert('申请工资必须大于当前工资');
      return;
    }

    const result = await createItem({
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      department: formData.department,
      position: formData.position,
      currentSalary: formData.currentSalary,
      proposedSalary: formData.proposedSalary,
      adjustmentType: formData.adjustmentType,
      effectiveDate: formData.effectiveDate,
      reason: formData.reason,
      remarks: formData.remarks,
    });

    if (result) {
      setIsFormModalOpen(false);
      await showAlert('提交成功！');
    } else {
      await showAlert('提交失败，请重试');
    }
  }, [formData, createItem]);

  /** 审批通过 */
  const handleApprove = useCallback(async (record: SalaryAdjustmentData) => {
    await approveItemStore(record.id);
  }, [approveItemStore]);

  /** 审批驳回 */
  const handleReject = useCallback(async (record: SalaryAdjustmentData) => {
    await rejectItemStore(record.id);
  }, [rejectItemStore]);

  /** 批量审批通过 */
  const handleBatchApprove = useCallback(() => {
    selectedRowKeys.forEach(key => {
      const record = records.find(r => r.id === key);
      if (record) handleApprove(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, records, handleApprove]);

  /** 批量审批驳回 */
  const handleBatchReject = useCallback(() => {
    selectedRowKeys.forEach(key => {
      const record = records.find(r => r.id === key);
      if (record) handleReject(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, records, handleReject]);

  /** 导出功能 */
  const handleExport = useCallback(() => {
    const dataToExport = selectedRowKeys.length > 0
      ? filteredData.filter(r => selectedRowKeys.includes(r.id))
      : filteredData;

    const headers = ['员工姓名', '部门', '岗位', '当前薪资', '申请薪资', '调整金额', '调整比例', '调整类型', '生效日期', '状态', '审批人', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.employeeName,
      '部门': row.department,
      '岗位': row.position,
      '当前薪资': `¥${row.currentSalary.toLocaleString()}`,
      '申请薪资': `¥${row.proposedSalary.toLocaleString()}`,
      '调整金额': `¥${row.adjustmentAmount.toLocaleString()}`,
      '调整比例': `${row.adjustmentRatio.toFixed(1)}%`,
      '调整类型': row.adjustmentType,
      '生效日期': row.effectiveDate,
      '状态': row.statusLabel || row.status,
      '审批人': row.approver || '',
      '备注': row.remarks || '',
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `调薪记录_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, filteredData]);

  return {
    filters, setFilters,
    pagination, setPagination,
    records,
    formData, setFormData,
    selectedRecord, setSelectedRecord,
    selectedRowKeys, setSelectedRowKeys,
    batchMode,
    isFormModalOpen, setIsFormModalOpen,
    isDetailModalOpen, setIsDetailModalOpen,
    filteredData,
    departmentOptions,
    displayAmount,
    displayRatio,
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleStaffChange,
    handleProposedSalaryChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
    setBatchMode,
  };
}
