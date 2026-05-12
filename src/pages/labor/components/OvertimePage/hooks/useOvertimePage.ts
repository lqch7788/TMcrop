/**
 * 加班申请页面 Hook
 * 封装状态管理和业务逻辑
 * 使用 React Query 和 API 服务
 */
import { useState, useMemo, useCallback } from 'react';
import { useOvertimeRecords, useCreateOvertime, useUpdateOvertime, useDeleteOvertime, useDeleteOvertimeBatch, useApproveOvertime } from '@/hooks/useOvertimeQueries';
import type { OvertimeRecord as ApiOvertimeRecord, CreateOvertimeParams, UpdateOvertimeParams } from '@/services/apiOvertimeService';
import type {
  OvertimeRecord,
  OvertimeFilters,
  OvertimeFormData,
  BatchMode,
  PaginationState,
  OvertimeFeePreview,
} from '../types/overtimePage.types';
import { OVERTIME_TYPE_MAP, DEFAULT_BASE_SALARY } from '../types/overtimePage.types';

/**
 * API 数据转换为组件内部格式
 */
function mapApiToComponent(apiRecord: ApiOvertimeRecord): OvertimeRecord {
  return {
    id: apiRecord.id,
    staffId: apiRecord.workerId,
    staffName: apiRecord.workerName,
    overtimeType: apiRecord.overtimeTypeLabel || apiRecord.overtimeType,
    startTime: apiRecord.startTime,
    endTime: apiRecord.endTime,
    hours: apiRecord.hours,
    reason: apiRecord.reason,
    status: apiRecord.statusLabel as OvertimeRecord['status'],
    approver: apiRecord.approver,
    approveTime: apiRecord.approveTime,
    remarks: apiRecord.remarks,
  };
}

// 默认表单数据
const DEFAULT_FORM_DATA: OvertimeFormData = {
  staffId: '',
  staffName: '',
  overtimeType: '工作日加班',
  startTime: '',
  endTime: '',
  hours: 0,
  reason: '',
  remarks: '',
};

export function useOvertimePage() {
  // ============================================================
  // 状态定义
  // ============================================================

  const [filters, setFilters] = useState<OvertimeFilters>({
    staffName: '',
    overtimeType: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const [pagination, setPagination] = useState<PaginationState>({ current: 1, pageSize: 10, total: 0 });

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [formData, setFormData] = useState<OvertimeFormData>(DEFAULT_FORM_DATA);

  const [batchMode, setBatchMode] = useState<BatchMode>('none');

  // ============================================================
  // 数据获取（使用 React Query）
  // ============================================================

  // 构建查询参数
  const queryFilters = useMemo(() => ({
    workerName: filters.staffName || undefined,
    overtimeType: filters.overtimeType ? OVERTIME_TYPE_MAP[filters.overtimeType] : undefined,
    status: filters.status || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  }), [filters]);

  const queryPagination = useMemo(() => ({
    page: pagination.current,
    limit: pagination.pageSize,
  }), [pagination]);

  // 使用 React Query 获取加班记录
  const { data: apiData, refetch } = useOvertimeRecords(queryFilters, queryPagination);

  // 转换 API 数据
  const overtimeRecords: OvertimeRecord[] = useMemo(() => {
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
  const createOvertimeMutation = useCreateOvertime();
  const updateOvertimeMutation = useUpdateOvertime();
  const deleteOvertimeMutation = useDeleteOvertime();
  const deleteOvertimeBatchMutation = useDeleteOvertimeBatch();
  const approveOvertimeMutation = useApproveOvertime();

  // ============================================================
  // 过滤后的数据
  // ============================================================

  const filteredData = useMemo(() => {
    return overtimeRecords;
  }, [overtimeRecords]);

  // ============================================================
  // 加班费预览计算
  // ============================================================

  const overtimeFeePreview = useMemo((): OvertimeFeePreview | null => {
    if (formData.hours <= 0) return null;
    const overtimeTypeEnum = OVERTIME_TYPE_MAP[formData.overtimeType];
    const hourlyRate = DEFAULT_BASE_SALARY / 22 / 8; // 简化的时薪计算
    let rate = 1.5;
    if (overtimeTypeEnum === 'weekend') rate = 2.0;
    if (overtimeTypeEnum === 'holiday') rate = 3.0;
    const totalFee = hourlyRate * formData.hours * rate;
    const rateText = rate === 1.5 ? '1.5倍' : rate === 2.0 ? '2倍' : '3倍';
    return {
      hourlyRate: Math.round(hourlyRate * 100) / 100,
      rate,
      rateText,
      totalFee: Math.round(totalFee * 100) / 100,
    };
  }, [formData.hours, formData.overtimeType]);

  // ============================================================
  // 事件处理
  // ============================================================

  const handleFilterChange = useCallback((field: keyof OvertimeFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({ staffName: '', overtimeType: '', status: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleOpenFormModal = useCallback(() => {
    setSelectedRecord(null);
    setFormData(DEFAULT_FORM_DATA);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenDetailModal = useCallback((record: OvertimeRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  /** 计算加班时长 */
  const calculateHours = useCallback((start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate <= startDate) return 0;
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.round(diffMs / (1000 * 60 * 60) * 10) / 10;
  }, []);

  /** 员工选择变化 */
  const handleStaffChange = useCallback((staffId: string, staffName: string) => {
    setFormData(prev => ({ ...prev, staffId, staffName }));
  }, []);

  /** 时间变化 - 重新计算时长 */
  const handleTimeChange = useCallback((field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => {
      const newFormData = { ...prev, [field]: value };
      if (field === 'startTime') {
        newFormData.hours = calculateHours(value, prev.endTime);
      } else {
        newFormData.hours = calculateHours(prev.startTime, value);
      }
      return newFormData;
    });
  }, [calculateHours]);

  /** 提交加班申请 */
  const handleSubmit = useCallback(async () => {
    if (!formData.staffId || !formData.startTime || !formData.endTime || !formData.reason) {
      alert('请填写完整信息');
      return;
    }

    try {
      const createParams: CreateOvertimeParams = {
        workerId: formData.staffId,
        workerName: formData.staffName,
        overtimeType: OVERTIME_TYPE_MAP[formData.overtimeType],
        workDate: formData.startTime.split('T')[0],
        startTime: formData.startTime,
        endTime: formData.endTime,
        hours: formData.hours,
        baseSalary: DEFAULT_BASE_SALARY,
        reason: formData.reason,
        remarks: formData.remarks,
      };

      await createOvertimeMutation.mutateAsync(createParams);

      setIsFormModalOpen(false);
      refetch();
      alert('提交成功！');
    } catch (error) {
      console.error('提交加班申请失败:', error);
      alert('提交失败，请重试');
    }
  }, [formData, createOvertimeMutation, refetch]);

  /** 审批通过 */
  const handleApprove = useCallback(async (record: OvertimeRecord) => {
    try {
      await approveOvertimeMutation.mutateAsync({
        id: record.id,
        approved: true,
        comment: '同意',
      });
      refetch();
    } catch (error) {
      console.error('审批通过失败:', error);
      alert('操作失败，请重试');
    }
  }, [approveOvertimeMutation, refetch]);

  /** 审批驳回 */
  const handleReject = useCallback(async (record: OvertimeRecord) => {
    try {
      await approveOvertimeMutation.mutateAsync({
        id: record.id,
        approved: false,
        comment: '不符合条件',
      });
      refetch();
    } catch (error) {
      console.error('审批驳回失败:', error);
      alert('操作失败，请重试');
    }
  }, [approveOvertimeMutation, refetch]);

  /** 批量审批通过 */
  const handleBatchApprove = useCallback(() => {
    selectedRowKeys.forEach(key => {
      const record = overtimeRecords.find(r => r.id === key);
      if (record) handleApprove(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, overtimeRecords, handleApprove]);

  /** 批量审批驳回 */
  const handleBatchReject = useCallback(() => {
    selectedRowKeys.forEach(key => {
      const record = overtimeRecords.find(r => r.id === key);
      if (record) handleReject(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, overtimeRecords, handleReject]);

  /** 删除单条记录 */
  const handleDelete = useCallback(async (record: OvertimeRecord) => {
    try {
      await deleteOvertimeMutation.mutateAsync(record.id);
      refetch();
      alert('删除成功！');
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  }, [deleteOvertimeMutation, refetch]);

  /** 批量删除 */
  const handleBatchDelete = useCallback(async () => {
    try {
      await deleteOvertimeBatchMutation.mutateAsync(selectedRowKeys as string[]);
      setSelectedRowKeys([]);
      setBatchMode('none');
      refetch();
      alert('批量删除成功！');
    } catch (error) {
      console.error('批量删除失败:', error);
      alert('批量删除失败，请重试');
    }
  }, [selectedRowKeys, deleteOvertimeBatchMutation, refetch]);

  /** 导出功能 */
  const handleExport = useCallback(() => {
    const dataToExport = selectedRowKeys.length > 0
      ? filteredData.filter(r => selectedRowKeys.includes(r.id))
      : filteredData;

    const headers = ['员工姓名', '加班类型', '开始时间', '结束时间', '时长(小时)', '状态', '加班原因', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.staffName,
      '加班类型': row.overtimeType,
      '开始时间': row.startTime,
      '结束时间': row.endTime,
      '时长(小时)': row.hours,
      '状态': row.status,
      '加班原因': row.reason,
      '备注': row.remarks || '',
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `加班记录_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, filteredData]);

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
    overtimeRecords,
    filteredData,
    overtimeFeePreview,
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
    handleTimeChange,
    handleStaffChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleDelete,
    handleBatchDelete,
    handleExport,
  };
}
