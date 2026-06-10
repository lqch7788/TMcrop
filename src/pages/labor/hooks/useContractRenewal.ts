/**
 * 合同续签数据管理 Hook（V2.0 改造）
 * 使用 Zustand Store 替代 React Query
 * 保留所有业务逻辑，替换数据源为 useContractRenewalStore
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useContractRenewalStore } from '@/stores';
import type { ContractRenewalData } from '@/stores';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import type {
  ContractRenewalFilters,
  ContractRenewalFormData,
} from '../types/contractRenewal.types';

/** API 数据转换为组件内部格式（Store 已处理 normalize，此处做状态标签映射） */
function mapStatusLabel(item: ContractRenewalData): ContractRenewalData {
  const statusMap: Record<string, string> = {
    'pending': '待审批',
    'approved': '已通过',
    'rejected': '已拒绝',
    'cancelled': '已取消',
  };
  return {
    ...item,
    statusLabel: statusMap[item.status] || item.statusLabel || item.status,
  };
}

export interface UseContractRenewalReturn {
  // 状态
  filters: ContractRenewalFilters;
  setFilters: React.Dispatch<React.SetStateAction<ContractRenewalFilters>>;
  pagination: { current: number; pageSize: number; total: number };
  setPagination: React.Dispatch<React.SetStateAction<{ current: number; pageSize: number; total: number }>>;
  records: ContractRenewalData[];
  formData: ContractRenewalFormData;
  setFormData: React.Dispatch<React.SetStateAction<ContractRenewalFormData>>;
  selectedRecord: ContractRenewalData | null;
  setSelectedRecord: React.Dispatch<React.SetStateAction<ContractRenewalData | null>>;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
  batchMode: 'none' | 'approve' | 'reject' | 'export';

  // 弹窗状态
  isFormModalOpen: boolean;
  setIsFormModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // 过滤后的数据
  filteredData: ContractRenewalData[];
  departmentOptions: { value: string; label: string }[];

  // 事件处理
  handleFilterChange: (field: keyof ContractRenewalFilters, value: string) => void;
  handleResetFilters: () => void;
  handleSearch: () => void;
  handleOpenFormModal: () => void;
  handleOpenDetailModal: (record: ContractRenewalData) => void;
  handleStaffChange: (employeeId: string, employeeName: string, department: string, position: string, currentContractEnd: string) => void;
  handlePeriodChange: (period: number) => void;
  handleNewStartDateChange: (date: string) => void;
  handleSubmit: () => Promise<void>;
  handleApprove: (record: ContractRenewalData) => Promise<void>;
  handleReject: (record: ContractRenewalData) => Promise<void>;
  handleBatchApprove: () => void;
  handleBatchReject: () => void;
  handleExport: () => void;
  setBatchMode: React.Dispatch<React.SetStateAction<'none' | 'approve' | 'reject' | 'export'>>;
}

export function useContractRenewal(
  workers: { workerId: string; name: string; department: string; position: string; contractExpireDate?: string }[]
): UseContractRenewalReturn {
  // ========== 从 Store 获取数据和方法 ==========
  const storeItems = useContractRenewalStore((s) => s.items);
  const fetchItems = useContractRenewalStore((s) => s.fetchItems);
  const createItem = useContractRenewalStore((s) => s.createItem);
  const approveItemStore = useContractRenewalStore((s) => s.approveItem);
  const rejectItemStore = useContractRenewalStore((s) => s.rejectItem);

  // ========== 组件挂载时加载数据 ==========
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ========== 状态定义 ==========

  const [filters, setFilters] = useState<ContractRenewalFilters>({
    employeeName: '',
    department: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<ContractRenewalData | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

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

  const [batchMode, setBatchMode] = useState<'none' | 'approve' | 'reject' | 'export'>('none');

  // ========== 数据处理 ==========

  /** Store 数据映射状态标签 */
  const records: ContractRenewalData[] = useMemo(() => {
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
      if (filters.status && record.statusLabel !== filters.status) return false;
      if (filters.startDate && record.newContractStart < filters.startDate) return false;
      if (filters.endDate && record.newContractStart > filters.endDate) return false;
      return true;
    });
  }, [records, filters]);

  /** 部门选项 */
  const departmentOptions = useMemo(() => {
    const depts = [...new Set(workers.map(w => w.department))];
    return [{ value: '', label: '全部' }, ...depts.map(d => ({ value: d, label: d }))];
  }, [workers]);

  // ========== 事件处理 ==========

  const handleFilterChange = useCallback((field: keyof ContractRenewalFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({ employeeName: '', department: '', status: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleStaffChange = useCallback((
    employeeId: string,
    employeeName: string,
    department: string,
    position: string,
    currentContractEnd: string
  ) => {
    const contractDate = new Date(currentContractEnd);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((contractDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
      showAlert(`提醒：员工 ${employeeName} 的合同将在 ${daysUntilExpiry} 天后（${currentContractEnd}）到期，请及时处理续签！`);
    } else if (daysUntilExpiry <= 0) {
      showAlert(`警告：员工 ${employeeName} 的合同已到期（${currentContractEnd}），请立即处理！`);
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

  const handlePeriodChange = useCallback((period: number) => {
    if (formData.newContractStart && period > 0) {
      const startDate = new Date(formData.newContractStart);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + period);
      const endDateStr = todayLocal(endDate);
      setFormData(prev => ({
        ...prev,
        renewalPeriod: period,
        newContractEnd: endDateStr,
      }));
    } else {
      setFormData(prev => ({ ...prev, renewalPeriod: period }));
    }
  }, [formData.newContractStart]);

  const handleNewStartDateChange = useCallback((date: string) => {
    if (date && formData.renewalPeriod > 0) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + formData.renewalPeriod);
      const endDateStr = todayLocal(endDate);
      setFormData(prev => ({
        ...prev,
        newContractStart: date,
        newContractEnd: endDateStr,
      }));
    } else {
      setFormData(prev => ({ ...prev, newContractStart: date }));
    }
  }, [formData.renewalPeriod]);

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

  const handleOpenDetailModal = useCallback((record: ContractRenewalData) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  /** 提交合同续签申请 */
  const handleSubmit = useCallback(async () => {
    if (!formData.employeeId || !formData.newContractStart || !formData.newContractEnd) {
      await showAlert('请填写完整信息');
      return;
    }

    const result = await createItem({
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      department: formData.department,
      position: formData.position,
      currentContractEnd: formData.currentContractEnd,
      newContractStart: formData.newContractStart,
      newContractEnd: formData.newContractEnd,
      renewalPeriod: formData.renewalPeriod,
      newSalary: formData.newSalary || 0,
      termsChange: formData.termsChange,
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
  const handleApprove = useCallback(async (record: ContractRenewalData) => {
    await approveItemStore(record.id);
  }, [approveItemStore]);

  /** 审批驳回 */
  const handleReject = useCallback(async (record: ContractRenewalData) => {
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
    a.download = `合同续签记录_${todayLocal()}.csv`;
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
