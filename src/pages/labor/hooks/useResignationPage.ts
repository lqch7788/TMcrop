/**
 * 离职申请页面 Hook
 * 封装状态管理、API调用和数据处理逻辑
 * 使用 React Query 和 API 服务
 */
import { useState, useMemo, useCallback } from 'react';
import { useUsers } from '../../../components/common/settings';
import {
  useResignationRecords,
  useCreateResignation,
  useUpdateResignation,
  useDeleteResignation,
} from '@/hooks/useResignationQueries';
import type { ResignationRecord as ApiResignationRecord, CreateResignationParams, UpdateResignationParams } from '@/services/apiResignationService';
import type {
  ResignationRecord,
  ResignationFilters,
  ResignationFormData,
  BatchMode,
  PaginationState,
  ResignationType,
} from '../types/resignationPage.types';

// API 数据转换为组件内部格式
function mapApiToComponent(apiRecord: ApiResignationRecord): ResignationRecord {
  return {
    id: apiRecord.id,
    resignationCode: apiRecord.resignationCode,
    workerId: apiRecord.workerId,
    workerName: apiRecord.workerName,
    resignationType: apiRecord.resignationType as ResignationType,
    reason: apiRecord.reason,
    expectedLastDay: apiRecord.expectedLastDay,
    handoverNote: apiRecord.handoverNote,
    handoverUserId: apiRecord.handoverUserId,
    handoverUserName: apiRecord.handoverUserName,
    status: apiRecord.statusLabel as any,
    createTime: apiRecord.createTime,
  };
}

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

  // ============================================================
  // React Query
  // ============================================================

  const queryFilters = useMemo(() => ({
    workerName: filters.workerName || undefined,
    resignationType: filters.resignationType || undefined,
    status: filters.status || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  }), [filters]);

  const queryPagination = useMemo(() => ({
    page: pagination.current,
    limit: pagination.pageSize,
  }), [pagination.current, pagination.pageSize]);

  const { data: apiData, refetch } = useResignationRecords(queryFilters, queryPagination);

  // 转换 API 数据
  const resignationRecords: ResignationRecord[] = useMemo(() => {
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

  // Mutations
  const createResignationMutation = useCreateResignation();
  const updateResignationMutation = useUpdateResignation();
  const deleteResignationMutation = useDeleteResignation();

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return resignationRecords;
  }, [resignationRecords]);

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
  const handleSubmit = useCallback(async () => {
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

    try {
      const createParams: CreateResignationParams = {
        workerId: formData.workerId,
        workerName: formData.workerName,
        resignationType: formData.resignationType,
        reason: formData.reason,
        expectedLastDay: formData.expectedLastDay,
        handoverUserId: formData.handoverUserId,
        handoverUserName: formData.handoverUserName,
        handoverNote: formData.handoverNote,
      };

      await createResignationMutation.mutateAsync(createParams);
      setIsFormModalOpen(false);
      refetch();
      alert('提交成功！');
    } catch (error) {
      console.error('提交离职申请失败:', error);
      alert('提交失败，请重试');
    }
  }, [formData, createResignationMutation, refetch]);

  /** 审批通过 */
  const handleApprove = useCallback(async (record: ResignationRecord) => {
    try {
      await updateResignationMutation.mutateAsync({
        id: record.id,
        updates: { status: 'approved' },
      });
      refetch();
    } catch (error) {
      console.error('审批通过失败:', error);
      alert('审批失败，请重试');
    }
  }, [updateResignationMutation, refetch]);

  /** 审批驳回 */
  const handleReject = useCallback(async (record: ResignationRecord) => {
    try {
      await updateResignationMutation.mutateAsync({
        id: record.id,
        updates: { status: 'rejected' },
      });
      refetch();
    } catch (error) {
      console.error('审批驳回失败:', error);
      alert('操作失败，请重试');
    }
  }, [updateResignationMutation, refetch]);

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
