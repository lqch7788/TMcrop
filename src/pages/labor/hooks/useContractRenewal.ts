/**
 * 合同续签数据管理 Hook
 * 封装状态管理、数据处理和业务逻辑
 * 使用 React Query 和 API 服务
 */
import { useState, useMemo, useCallback } from 'react';
import {
  useContractRenewalRecords,
  useCreateContractRenewal,
  useUpdateContractRenewal,
  useDeleteContractRenewal,
} from '@/hooks/useContractRenewalQueries';
import type {
  ContractRenewalRecord as ApiContractRenewalRecord,
  CreateContractRenewalParams,
  UpdateContractRenewalParams,
} from '@/services/apiContractRenewalService';
import type {
  ContractRenewalStatus,
  ContractRenewalFilters,
  ContractRenewalFormData,
} from '../types/contractRenewal.types';

// API 字段到组件内部格式的映射
interface ContractRenewalRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  currentContractEnd: string;
  newContractStart: string;
  newContractEnd: string;
  renewalPeriod: number;
  newSalary?: number;
  termsChange?: string;
  status: ContractRenewalStatus;
  approver?: string;
  approveTime?: string;
  remarks?: string;
}

/**
 * API 数据转换为组件内部格式
 */
function mapApiToComponent(apiRecord: ApiContractRenewalRecord): ContractRenewalRecord {
  return {
    id: apiRecord.id,
    employeeId: apiRecord.employeeId,
    employeeName: apiRecord.employeeName,
    department: apiRecord.department || '',
    position: apiRecord.position || '',
    currentContractEnd: apiRecord.currentContractEnd,
    newContractStart: apiRecord.newContractStart,
    newContractEnd: apiRecord.newContractEnd,
    renewalPeriod: apiRecord.renewalPeriod,
    newSalary: apiRecord.newSalary,
    termsChange: apiRecord.termsChange,
    status: apiRecord.statusLabel as ContractRenewalStatus,
    approver: apiRecord.approver,
    approveTime: apiRecord.approveTime,
    remarks: apiRecord.remarks,
  };
}

export interface UseContractRenewalReturn {
  // 状态
  filters: ContractRenewalFilters;
  setFilters: React.Dispatch<React.SetStateAction<ContractRenewalFilters>>;
  pagination: { current: number; pageSize: number; total: number };
  setPagination: React.Dispatch<React.SetStateAction<{ current: number; pageSize: number; total: number }>>;
  records: ContractRenewalRecord[];
  formData: ContractRenewalFormData;
  setFormData: React.Dispatch<React.SetStateAction<ContractRenewalFormData>>;
  selectedRecord: ContractRenewalRecord | null;
  setSelectedRecord: React.Dispatch<React.SetStateAction<ContractRenewalRecord | null>>;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
  batchMode: 'none' | 'approve' | 'reject' | 'export';

  // 弹窗状态
  isFormModalOpen: boolean;
  setIsFormModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // 过滤后的数据
  filteredData: ContractRenewalRecord[];
  departmentOptions: { value: string; label: string }[];

  // 事件处理
  handleFilterChange: (field: keyof ContractRenewalFilters, value: string) => void;
  handleResetFilters: () => void;
  handleSearch: () => void;
  handleOpenFormModal: () => void;
  handleOpenDetailModal: (record: ContractRenewalRecord) => void;
  handleStaffChange: (employeeId: string, employeeName: string, department: string, position: string, currentContractEnd: string) => void;
  handlePeriodChange: (period: number) => void;
  handleNewStartDateChange: (date: string) => void;
  handleSubmit: () => Promise<void>;
  handleApprove: (record: ContractRenewalRecord) => Promise<void>;
  handleReject: (record: ContractRenewalRecord) => Promise<void>;
  handleBatchApprove: () => void;
  handleBatchReject: () => void;
  handleExport: () => void;
  setBatchMode: React.Dispatch<React.SetStateAction<'none' | 'approve' | 'reject' | 'export'>>;
}

/** 状态映射：API 状态值 -> 组件内部状态标签 */
function mapApiStatusToLabel(status: string): ContractRenewalStatus {
  switch (status) {
    case 'pending': return '待审批';
    case 'approved': return '已通过';
    case 'rejected': return '已拒绝';
    case 'cancelled': return '已取消';
    default: return '待审批';
  }
}

export function useContractRenewal(
  workers: { workerId: string; name: string; department: string; position: string; contractExpireDate?: string }[]
): UseContractRenewalReturn {
  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<ContractRenewalFilters>({
    employeeName: '',
    department: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  /** 分页状态 */
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  /** 弹窗状态 */
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  /** 选中记录 */
  const [selectedRecord, setSelectedRecord] = useState<ContractRenewalRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState<ContractRenewalFormData>({
    employeeId: '',
    employeeName: '',
    department: '',
    position: '',
    currentContractEnd: '',
    newContractStart: '',
    newContractEnd: '',
    renewalPeriod: 12,
    newSalary: undefined,
    termsChange: '',
    remarks: '',
  });

  /** 批量操作模式 */
  const [batchMode, setBatchMode] = useState<'none' | 'approve' | 'reject' | 'export'>('none');

  // ============================================================
  // React Query 数据获取
  // ============================================================

  /** 构建查询参数 */
  const queryFilters = useMemo(() => ({
    employeeName: filters.employeeName || undefined,
    department: filters.department || undefined,
    status: filters.status || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  }), [filters]);

  const queryPagination = useMemo(() => ({
    page: pagination.current,
    limit: pagination.pageSize,
  }), [pagination]);

  /** 使用 React Query 获取合同续签记录 */
  const { data: apiData, refetch } = useContractRenewalRecords(queryFilters, queryPagination);

  /** 转换 API 数据为组件内部格式 */
  const records: ContractRenewalRecord[] = useMemo(() => {
    return (apiData?.records || []).map(mapApiToComponent);
  }, [apiData]);

  /** 更新分页信息 */
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

  const createMutation = useCreateContractRenewal();
  const updateMutation = useUpdateContractRenewal();
  const deleteMutation = useDeleteContractRenewal();

  // ============================================================
  // 数据处理
  // ============================================================

  /** 过滤后的数据（API 已服务端过滤，此处直接返回） */
  const filteredData = useMemo(() => {
    return records;
  }, [records]);

  /** 部门选项 */
  const departmentOptions = useMemo(() => {
    const depts = [...new Set(workers.map(w => w.department))];
    return [{ value: '', label: '全部' }, ...depts.map(d => ({ value: d, label: d }))];
  }, [workers]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = useCallback((field: keyof ContractRenewalFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 重置筛选 */
  const handleResetFilters = useCallback(() => {
    setFilters({ employeeName: '', department: '', status: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 搜索 */
  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 员工选择变化 */
  const handleStaffChange = useCallback((
    employeeId: string,
    employeeName: string,
    department: string,
    position: string,
    currentContractEnd: string
  ) => {
    // 检查是否在30天内到期
    const contractDate = new Date(currentContractEnd);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((contractDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // 如果30天内到期，显示警告
    if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
      alert(`提醒：员工 ${employeeName} 的合同将在 ${daysUntilExpiry} 天后（${currentContractEnd}）到期，请及时处理续签！`);
    } else if (daysUntilExpiry <= 0) {
      alert(`警告：员工 ${employeeName} 的合同已到期（${currentContractEnd}），请立即处理！`);
    }

    setFormData(prev => ({
      ...prev,
      employeeId,
      employeeName,
      department,
      position,
      currentContractEnd,
      newContractStart: '',
      newContractEnd: '',
    }));
  }, []);

  /** 合同期限变化 */
  const handlePeriodChange = useCallback((period: number) => {
    if (formData.newContractStart && period > 0) {
      const startDate = new Date(formData.newContractStart);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + period);
      const endDateStr = endDate.toISOString().slice(0, 10);
      setFormData(prev => ({
        ...prev,
        renewalPeriod: period,
        newContractEnd: endDateStr,
      }));
    } else {
      setFormData(prev => ({ ...prev, renewalPeriod: period }));
    }
  }, [formData.newContractStart]);

  /** 新合同开始日期变化 */
  const handleNewStartDateChange = useCallback((date: string) => {
    if (date && formData.renewalPeriod > 0) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + formData.renewalPeriod);
      const endDateStr = endDate.toISOString().slice(0, 10);
      setFormData(prev => ({
        ...prev,
        newContractStart: date,
        newContractEnd: endDateStr,
      }));
    } else {
      setFormData(prev => ({ ...prev, newContractStart: date }));
    }
  }, [formData.renewalPeriod]);

  /** 打开新增弹窗 */
  const handleOpenFormModal = useCallback(() => {
    setSelectedRecord(null);
    setFormData({
      employeeId: '',
      employeeName: '',
      department: '',
      position: '',
      currentContractEnd: '',
      newContractStart: '',
      newContractEnd: '',
      renewalPeriod: 12,
      newSalary: undefined,
      termsChange: '',
      remarks: '',
    });
    setIsFormModalOpen(true);
  }, []);

  /** 打开详情弹窗 */
  const handleOpenDetailModal = useCallback((record: ContractRenewalRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  /** 提交合同续签申请 */
  const handleSubmit = useCallback(async () => {
    if (!formData.employeeId || !formData.newContractStart || !formData.newContractEnd) {
      alert('请填写完整信息');
      return;
    }

    try {
      const createParams: CreateContractRenewalParams = {
        employeeId: formData.employeeId,
        employeeName: formData.employeeName,
        department: formData.department,
        position: formData.position,
        currentContractEnd: formData.currentContractEnd,
        newContractStart: formData.newContractStart,
        newContractEnd: formData.newContractEnd,
        renewalPeriod: formData.renewalPeriod,
        newSalary: formData.newSalary,
        termsChange: formData.termsChange,
        remarks: formData.remarks,
      };

      await createMutation.mutateAsync(createParams);

      setIsFormModalOpen(false);
      refetch();
      alert('提交成功！');
    } catch (error) {
      console.error('提交合同续签申请失败:', error);
      alert('提交失败，请重试');
    }
  }, [formData, createMutation, refetch]);

  /** 审批通过 */
  const handleApprove = useCallback(async (record: ContractRenewalRecord) => {
    try {
      await updateMutation.mutateAsync({
        id: record.id,
        updates: { status: 'approved' },
      });
      refetch();
    } catch (error) {
      console.error('审批通过失败:', error);
      alert('审批失败，请重试');
    }
  }, [updateMutation, refetch]);

  /** 审批驳回 */
  const handleReject = useCallback(async (record: ContractRenewalRecord) => {
    try {
      await updateMutation.mutateAsync({
        id: record.id,
        updates: { status: 'rejected' },
      });
      refetch();
    } catch (error) {
      console.error('审批驳回失败:', error);
      alert('操作失败，请重试');
    }
  }, [updateMutation, refetch]);

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

    const headers = ['员工姓名', '部门', '岗位', '当前合同到期日', '新合同开始日期', '新合同到期日', '续签期限', '新薪资', '状态', '审批人', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.employeeName,
      '部门': row.department,
      '岗位': row.position,
      '当前合同到期日': row.currentContractEnd,
      '新合同开始日期': row.newContractStart,
      '新合同到期日': row.newContractEnd,
      '续签期限': `${row.renewalPeriod}个月`,
      '新薪资': row.newSalary ? `¥${row.newSalary.toLocaleString()}` : '',
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
    a.download = `合同续签记录_${new Date().toISOString().slice(0, 10)}.csv`;
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

    // 事件处理
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleStaffChange,
    handlePeriodChange,
    handleNewStartDateChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
    setBatchMode,
  };
}
