/**
 * 请假管理数据管理 Hook
 * 使用 React Query 管理请假数据
 */
import { useState, useCallback, useMemo } from 'react';
import { useLeaveRecords, useCreateLeave, useUpdateLeave, useDeleteLeave } from '@/hooks/useLeaveQueries';
import type { LeaveRecord as ApiLeaveRecord, CreateLeaveParams, UpdateLeaveParams } from '@/services/apiLeaveService';
import type { LeaveRecord, LeaveFilters, PaginationInfo, UseLeaveReturn, LeaveType, LeaveStatus } from '../types';

/**
 * API 数据转换为组件内部格式
 */
function mapApiToComponentRecord(apiRecord: ApiLeaveRecord): LeaveRecord {
  return {
    id: apiRecord.id,
    staffId: apiRecord.workerId,
    staffName: apiRecord.workerName,
    leaveType: apiRecord.leaveType as LeaveType,
    startDate: apiRecord.startDate,
    endDate: apiRecord.endDate,
    days: apiRecord.days,
    reason: apiRecord.reason,
    status: apiRecord.statusLabel as LeaveStatus,
    approver: apiRecord.approver,
    approveTime: apiRecord.approveTime,
    remarks: apiRecord.remarks,
  };
}

/**
 * 组件格式转换为 API 创建参数
 */
function mapToCreateParams(data: Partial<LeaveRecord>, staffId: string, staffName: string): CreateLeaveParams {
  return {
    workerId: staffId || data.staffId || '',
    workerName: staffName || data.staffName || '',
    leaveType: data.leaveType || '事假',
    startDate: data.startDate || '',
    endDate: data.endDate || '',
    days: data.days || 0,
    reason: data.reason || '',
    remarks: data.remarks,
  };
}

/**
 * 请假管理数据管理 Hook
 */
export function useLeave(): UseLeaveReturn {
  // 筛选条件
  const [filters, setFilters] = useState<LeaveFilters>({
    staffName: '',
    leaveType: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  // 分页状态 - React Query 使用 page/limit，这里转换为 currentPage/pageSize
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 选中记录（用于详情/编辑）
  const [selectedRecord, setSelectedRecord] = useState<LeaveRecord | null>(null);

  // 弹窗状态
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // 构建查询参数
  const queryFilters = useMemo(() => ({
    workerName: filters.staffName || undefined,
    leaveType: filters.leaveType || undefined,
    status: filters.status || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  }), [filters]);

  const queryPagination = useMemo(() => ({
    page: currentPage,
    limit: pageSize,
  }), [currentPage, pageSize]);

  // 使用 React Query 获取请假记录
  const { data: apiData, isLoading } = useLeaveRecords(queryFilters, queryPagination);

  // 转换 API 数据为组件格式
  const data: LeaveRecord[] = useMemo(() => {
    return (apiData?.records || []).map(mapApiToComponentRecord);
  }, [apiData]);

  // 分页信息
  const pagination: PaginationInfo = useMemo(() => ({
    currentPage,
    pageSize,
    total: apiData?.pagination?.total || 0,
  }), [currentPage, pageSize, apiData?.pagination?.total]);

  // Mutations
  const createLeaveMutation = useCreateLeave();
  const updateLeaveMutation = useUpdateLeave();
  const deleteLeaveMutation = useDeleteLeave();

  // 设置筛选条件
  const handleSetFilters = useCallback((newFilters: LeaveFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // 设置页码
  const handleSetPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // 设置每页条数
  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // 保存记录（新建/编辑）
  const handleSave = useCallback(async (saveData: Partial<LeaveRecord>) => {
    try {
      if (selectedRecord) {
        // 更新现有记录
        const updateParams: UpdateLeaveParams = {
          leaveType: saveData.leaveType,
          startDate: saveData.startDate,
          endDate: saveData.endDate,
          days: saveData.days,
          reason: saveData.reason,
          remarks: saveData.remarks,
        };
        await updateLeaveMutation.mutateAsync({ id: selectedRecord.id, updates: updateParams });
      } else {
        // 创建新记录
        const createParams = mapToCreateParams(saveData, '', '');
        await createLeaveMutation.mutateAsync(createParams);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error('保存请假记录失败:', error);
      throw error;
    }
  }, [selectedRecord, createLeaveMutation, updateLeaveMutation]);

  // 审批通过
  const handleApprove = useCallback(async (record: LeaveRecord) => {
    try {
      await updateLeaveMutation.mutateAsync({
        id: record.id,
        updates: { status: 'approved' },
      });
      setIsDetailOpen(false);
    } catch (error) {
      console.error('审批通过失败:', error);
      throw error;
    }
  }, [updateLeaveMutation]);

  // 驳回
  const handleReject = useCallback(async (record: LeaveRecord) => {
    try {
      await updateLeaveMutation.mutateAsync({
        id: record.id,
        updates: { status: 'rejected' },
      });
      setIsDetailOpen(false);
    } catch (error) {
      console.error('审批驳回失败:', error);
      throw error;
    }
  }, [updateLeaveMutation]);

  // 取消申请
  const handleCancel = useCallback(async (record: LeaveRecord) => {
    try {
      await updateLeaveMutation.mutateAsync({
        id: record.id,
        updates: { status: 'cancelled' },
      });
    } catch (error) {
      console.error('取消申请失败:', error);
      throw error;
    }
  }, [updateLeaveMutation]);

  return {
    data,
    filters,
    pagination,
    setFilters: handleSetFilters,
    setPage: handleSetPage,
    setPageSize: handleSetPageSize,
    selectedRecord,
    setSelectedRecord,
    isDetailOpen,
    setIsDetailOpen,
    isFormOpen,
    setIsFormOpen,
    handleSave,
    handleApprove,
    handleReject,
    handleCancel,
  };
}
