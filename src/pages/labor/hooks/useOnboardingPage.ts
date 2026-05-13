/**
 * 入职办理页面 Hook
 * 封装状态管理、API调用和数据处理逻辑
 * 使用 React Query 和 API 服务，移除 useApprovalContext 依赖
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useWorkerStore } from '../../../stores/useWorkerStore';
import {
  useOnboardingRecords,
  useCreateOnboarding,
  useUpdateOnboarding,
  useDeleteOnboarding,
  useDeleteOnboardingBatch,
  useUpdateOnboardingStatus,
} from '@/hooks/useOnboardingQueries';
import type { OnboardingRecord as ApiOnboardingRecord } from '@/services/apiOnboardingService';
import type {
  OnboardingRecord,
  OnboardingFilters,
  OnboardingFormData,
  BatchMode,
  PaginationState,
} from '../types/onboardingPage.types';
import type { CreateOnboardingParams, UpdateStatusParams } from '@/services/apiOnboardingService';

// 默认筛选条件
const DEFAULT_FILTERS: OnboardingFilters = {
  employeeName: '',
  department: '',
  status: '',
  startDate: '',
};

// 默认表单数据
const DEFAULT_FORM_DATA: OnboardingFormData = {
  employeeName: '',
  department: '生产部',
  position: '',
  expectedStartDate: '',
  education: '',
  major: '',
  contactPhone: '',
  emergencyContact: '',
  idCard: '',
  bankCard: '',
  remarks: '',
};

/**
 * API 数据转换为组件内部格式
 */
function mapApiToComponent(apiRecord: ApiOnboardingRecord): OnboardingRecord {
  return {
    id: apiRecord.id,
    employeeId: apiRecord.oid || apiRecord.id,
    employeeName: apiRecord.name,
    department: apiRecord.department,
    position: apiRecord.position,
    expectedStartDate: apiRecord.joinDate,
    actualStartDate: undefined,
    status: apiRecord.status as OnboardingRecord['status'],
    education: '',
    major: '',
    contactPhone: apiRecord.phone,
    emergencyContact: '',
    idCard: apiRecord.idCard,
    bankCard: '',
    remarks: apiRecord.remarks,
  };
}

/**
 * 入职办理页面 Hook
 */
export function useOnboardingPage() {
  const workers = useWorkerStore((state) => state.workers);
  const loadWorkers = useWorkerStore((state) => state.loadWorkers);

  useEffect(() => {
    if (workers.length === 0) {
      loadWorkers();
    }
  }, [workers.length, loadWorkers]);

  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<OnboardingFilters>(DEFAULT_FILTERS);

  /** 分页状态 */
  const [pagination, setPagination] = useState<PaginationState>({ current: 1, pageSize: 10, total: 0 });

  /** 弹窗状态 */
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  /** 选中记录 */
  const [selectedRecord, setSelectedRecord] = useState<OnboardingRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState<OnboardingFormData>(DEFAULT_FORM_DATA);

  /** 批量操作模式 */
  const [batchMode, setBatchMode] = useState<BatchMode>('none');

  // ============================================================
  // 构建查询参数
  // ============================================================

  const queryFilters = useMemo(() => ({
    keyword: filters.employeeName || undefined,
    status: filters.status || undefined,
  }), [filters]);

  const queryPagination = useMemo(() => ({
    page: pagination.current,
    limit: pagination.pageSize,
  }), [pagination]);

  // ============================================================
  // 使用 React Query 获取数据
  // ============================================================

  const { data: apiData, refetch } = useOnboardingRecords(queryFilters, queryPagination);

  // 转换 API 数据
  const records: OnboardingRecord[] = useMemo(() => {
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

  const createOnboardingMutation = useCreateOnboarding();
  const updateOnboardingMutation = useUpdateOnboarding();
  const deleteOnboardingMutation = useDeleteOnboarding();
  const deleteOnboardingBatchMutation = useDeleteOnboardingBatch();
  const updateStatusMutation = useUpdateOnboardingStatus();

  // ============================================================
  // 数据处理
  // ============================================================

  /** 过滤后的数据 */
  const filteredData = useMemo(() => {
    return records.filter(record => {
      if (filters.employeeName && !record.employeeName.includes(filters.employeeName)) return false;
      if (filters.department && record.department !== filters.department) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.expectedStartDate < filters.startDate) return false;
      return true;
    });
  }, [records, filters]);

  /** 部门选项 */
  const departmentOptions = useMemo(() => {
    const depts = [...new Set(workers.map(w => w.department))];
    return [{ value: '', label: '全部' }, ...depts.map(d => ({ value: d, label: d }))];
  }, []);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = useCallback((field: keyof OnboardingFilters, value: string) => {
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
  const handleOpenDetailModal = useCallback((record: OnboardingRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  /** 提交入职申请 */
  const handleSubmit = useCallback(async () => {
    if (!formData.employeeName || !formData.expectedStartDate) {
      alert('请填写完整信息');
      return;
    }

    // 验证身份证号格式（18位）
    if (formData.idCard && !/^\d{17}[\dXx]$/.test(formData.idCard)) {
      alert('身份证号格式不正确，请输入18位身份证号');
      return;
    }

    // 验证银行卡号格式（16-19位）
    if (formData.bankCard && !/^\d{16,19}$/.test(formData.bankCard)) {
      alert('银行卡号格式不正确，请输入16-19位银行卡号');
      return;
    }

    try {
      const createParams: CreateOnboardingParams = {
        name: formData.employeeName,
        idCard: formData.idCard,
        phone: formData.contactPhone,
        position: formData.position,
        department: formData.department,
        joinDate: formData.expectedStartDate,
        remarks: formData.remarks,
      };

      await createOnboardingMutation.mutateAsync(createParams);
      setIsFormModalOpen(false);
      refetch();
      alert('提交成功！');
    } catch (error) {
      console.error('提交入职申请失败:', error);
      alert('提交失败，请重试');
    }
  }, [formData, createOnboardingMutation, refetch]);

  /** 审批通过 */
  const handleApprove = useCallback(async (record: OnboardingRecord) => {
    try {
      const params: UpdateStatusParams = {
        status: '已入职',
      };
      await updateStatusMutation.mutateAsync({ id: record.id, params });
      refetch();
    } catch (error) {
      console.error('审批通过失败:', error);
      alert('操作失败，请重试');
    }
  }, [updateStatusMutation, refetch]);

  /** 审批驳回 */
  const handleReject = useCallback(async (record: OnboardingRecord) => {
    try {
      // 更新状态为已取消
      await updateOnboardingMutation.mutateAsync({
        id: record.id,
        updates: { status: '已取消' },
      });
      refetch();
    } catch (error) {
      console.error('审批驳回失败:', error);
      alert('操作失败，请重试');
    }
  }, [updateOnboardingMutation, refetch]);

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

    const headers = ['员工姓名', '部门', '岗位', '预计入职日期', '实际入职日期', '状态', '联系方式', '紧急联系人', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.employeeName,
      '部门': row.department,
      '岗位': row.position,
      '预计入职日期': row.expectedStartDate,
      '实际入职日期': row.actualStartDate || '',
      '状态': row.status,
      '联系方式': row.contactPhone || '',
      '紧急联系人': row.emergencyContact || '',
      '备注': row.remarks || '',
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `入职记录_${new Date().toISOString().slice(0, 10)}.csv`;
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
    records,
    filteredData,
    departmentOptions,
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
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
  };
}
