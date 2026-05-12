/**
 * 调薪申请数据管理 Hook
 * 封装状态管理、数据处理和业务逻辑
 * 使用 React Query 和 API 服务，移除 useApprovalContext 依赖
 */
import { useState, useMemo, useCallback } from 'react';
import {
  useSalaryAdjustmentRecords,
  useCreateSalaryAdjustment,
  useUpdateSalaryAdjustment,
  useUpdateSalaryAdjustmentStatus,
} from '@/hooks/useSalaryAdjustmentQueries';
import type { SalaryAdjustmentRecord as ApiSalaryAdjustmentRecord } from '@/services/apiSalaryAdjustmentService';
import type {
  SalaryAdjustmentRecord,
  SalaryAdjustmentFilters,
  SalaryAdjustmentFormData,
  SalaryAdjustmentPagination,
  SalaryAdjustmentStatus,
} from '../types/salaryAdjustment.types';

/**
 * API 数据转换为组件内部格式
 */
function mapApiToComponent(apiRecord: ApiSalaryAdjustmentRecord): SalaryAdjustmentRecord {
  return {
    id: apiRecord.id,
    employeeId: apiRecord.workerId,
    employeeName: apiRecord.workerName,
    department: apiRecord.department,
    position: apiRecord.position,
    currentSalary: apiRecord.currentSalary,
    proposedSalary: apiRecord.proposedSalary,
    adjustmentAmount: apiRecord.adjustmentAmount,
    adjustmentRatio: apiRecord.adjustmentRatio,
    adjustmentType: apiRecord.adjustmentType,
    effectiveDate: apiRecord.effectiveDate,
    reason: apiRecord.reason,
    status: apiRecord.statusLabel as SalaryAdjustmentStatus,
    approver: apiRecord.approver,
    approveTime: apiRecord.approveTime,
    remarks: apiRecord.remarks,
  };
}

export interface UseSalaryAdjustmentReturn {
  // 状态
  filters: SalaryAdjustmentFilters;
  setFilters: React.Dispatch<React.SetStateAction<SalaryAdjustmentFilters>>;
  pagination: SalaryAdjustmentPagination;
  setPagination: React.Dispatch<React.SetStateAction<SalaryAdjustmentPagination>>;
  records: SalaryAdjustmentRecord[];
  formData: SalaryAdjustmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<SalaryAdjustmentFormData>>;
  selectedRecord: SalaryAdjustmentRecord | null;
  setSelectedRecord: React.Dispatch<React.SetStateAction<SalaryAdjustmentRecord | null>>;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
  batchMode: 'none' | 'approve' | 'reject' | 'export';

  // 弹窗状态
  isFormModalOpen: boolean;
  setIsFormModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // 过滤后的数据
  filteredData: SalaryAdjustmentRecord[];
  departmentOptions: { value: string; label: string }[];

  // 计算属性
  displayAmount: number;
  displayRatio: number;

  // 事件处理
  handleFilterChange: (field: keyof SalaryAdjustmentFilters, value: string) => void;
  handleResetFilters: () => void;
  handleSearch: () => void;
  handleOpenFormModal: () => void;
  handleOpenDetailModal: (record: SalaryAdjustmentRecord) => void;
  handleStaffChange: (employeeId: string, employeeName: string, department: string, position: string, currentSalary: number) => void;
  handleProposedSalaryChange: (value: number) => void;
  handleSubmit: () => Promise<void>;
  handleApprove: (record: SalaryAdjustmentRecord) => Promise<void>;
  handleReject: (record: SalaryAdjustmentRecord) => Promise<void>;
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
  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<SalaryAdjustmentFilters>({
    employeeName: '',
    department: '',
    adjustmentType: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  /** 分页状态 */
  const [pagination, setPagination] = useState<SalaryAdjustmentPagination>({ current: 1, pageSize: 10, total: 0 });

  /** 弹窗状态 */
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  /** 选中记录 */
  const [selectedRecord, setSelectedRecord] = useState<SalaryAdjustmentRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
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

  /** 批量操作模式 */
  const [batchMode, setBatchMode] = useState<'none' | 'approve' | 'reject' | 'export'>('none');

  // ============================================================
  // 构建查询参数
  // ============================================================

  const queryFilters = useMemo(() => ({
    keyword: filters.employeeName || undefined,
    status: filters.status || undefined,
    department: filters.department || undefined,
  }), [filters]);

  const queryPagination = useMemo(() => ({
    page: pagination.current,
    limit: pagination.pageSize,
  }), [pagination]);

  // ============================================================
  // 使用 React Query 获取数据
  // ============================================================

  const { data: apiData, refetch } = useSalaryAdjustmentRecords(queryFilters, queryPagination);

  // 转换 API 数据
  const records: SalaryAdjustmentRecord[] = useMemo(() => {
    return (apiData?.records || []).map(mapApiToComponent);
  }, [apiData]);

  // 更新分页信息
  useMemo(() => {
    if (apiData?.pagination) {
      setPagination(prev => ({
        ...prev,
        total: apiData.pagination.total || 0,
      }));
    }
  }, [apiData?.pagination]);

  // ============================================================
  // Mutations
  // ============================================================

  const createSalaryAdjustmentMutation = useCreateSalaryAdjustment();
  const updateSalaryAdjustmentMutation = useUpdateSalaryAdjustment();
  const updateStatusMutation = useUpdateSalaryAdjustmentStatus();

  // ============================================================
  // 数据处理
  // ============================================================

  /** 过滤后的数据 */
  const filteredData = useMemo(() => {
    return records.filter(record => {
      if (filters.employeeName && !record.employeeName.includes(filters.employeeName)) return false;
      if (filters.department && record.department !== filters.department) return false;
      if (filters.adjustmentType && record.adjustmentType !== filters.adjustmentType) return false;
      if (filters.status && record.status !== filters.status) return false;
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

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = useCallback((field: keyof SalaryAdjustmentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 重置筛选 */
  const handleResetFilters = useCallback(() => {
    setFilters({ employeeName: '', department: '', adjustmentType: '', status: '', startDate: '', endDate: '' });
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

  /** 打开详情弹窗 */
  const handleOpenDetailModal = useCallback((record: SalaryAdjustmentRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  /** 员工选择变化 */
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

  /** 拟调薪资变化 */
  const handleProposedSalaryChange = useCallback((value: number) => {
    setFormData(prev => ({
      ...prev,
      proposedSalary: value,
    }));
  }, []);

  /** 提交调薪申请 */
  const handleSubmit = useCallback(async () => {
    if (!formData.employeeId || !formData.proposedSalary || !formData.effectiveDate || !formData.reason) {
      alert('请填写完整信息');
      return;
    }

    if (formData.proposedSalary <= formData.currentSalary) {
      alert('申请工资必须大于当前工资');
      return;
    }

    try {
      await createSalaryAdjustmentMutation.mutateAsync({
        workerId: formData.employeeId,
        workerName: formData.employeeName,
        department: formData.department,
        position: formData.position,
        currentSalary: formData.currentSalary,
        proposedSalary: formData.proposedSalary,
        adjustmentType: formData.adjustmentType,
        effectiveDate: formData.effectiveDate,
        reason: formData.reason,
        remarks: formData.remarks,
      });

      setIsFormModalOpen(false);
      refetch();
      alert('提交成功！');
    } catch (error) {
      console.error('提交调薪申请失败:', error);
      alert('提交失败，请重试');
    }
  }, [formData, createSalaryAdjustmentMutation, refetch]);

  /** 审批通过 */
  const handleApprove = useCallback(async (record: SalaryAdjustmentRecord) => {
    try {
      await updateStatusMutation.mutateAsync({ id: record.id, status: 'approved' });
      refetch();
    } catch (error) {
      console.error('审批通过失败:', error);
      alert('操作失败，请重试');
    }
  }, [updateStatusMutation, refetch]);

  /** 审批驳回 */
  const handleReject = useCallback(async (record: SalaryAdjustmentRecord) => {
    try {
      await updateStatusMutation.mutateAsync({ id: record.id, status: 'rejected' });
      refetch();
    } catch (error) {
      console.error('审批驳回失败:', error);
      alert('操作失败，请重试');
    }
  }, [updateStatusMutation, refetch]);

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
      '状态': row.status,
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
    // 状态
    filters,
    setFilters,
    pagination,
    setPagination,
    records,
    formData,
    setFormData,
    selectedRecord,
    setSelectedRecord,
    selectedRowKeys,
    setSelectedRowKeys,
    batchMode,

    // 弹窗状态
    isFormModalOpen,
    setIsFormModalOpen,
    isDetailModalOpen,
    setIsDetailModalOpen,

    // 数据
    filteredData,
    departmentOptions,

    // 计算属性
    displayAmount,
    displayRatio,

    // 事件处理
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
