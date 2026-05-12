/**
 * 请假管理 Query Hooks
 * 使用 React Query 管理请假数据的获取和缓存
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as leaveService from '../services/apiLeaveService';
import type {
  LeaveRecord,
  CreateLeaveParams,
  UpdateLeaveParams,
  LeaveQuota,
} from '../services/apiLeaveService';

// ==================== 请假记录查询 ====================

/**
 * 获取请假记录列表
 */
export function useLeaveRecords(
  filters?: {
    workerName?: string;
    leaveType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  },
  pagination?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: ['leave', 'records', filters, pagination],
    queryFn: () => leaveService.getLeaveRecords(filters, pagination),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取单个请假记录
 */
export function useLeaveRecord(id: string) {
  return useQuery<LeaveRecord | null>({
    queryKey: ['leave', 'record', id],
    queryFn: () => leaveService.getLeaveById(id),
    enabled: !!id,
  });
}

/**
 * 获取请假额度列表
 */
export function useLeaveQuotas(workerId?: string, year?: number) {
  return useQuery<LeaveQuota[]>({
    queryKey: ['leave', 'quotas', workerId, year],
    queryFn: () => leaveService.getLeaveQuotas(workerId, year),
    enabled: !workerId || !!workerId,
  });
}

// ==================== 请假记录 Mutations ====================

/**
 * 创建请假记录
 */
export function useCreateLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leave: CreateLeaveParams) => leaveService.createLeaveRecord(leave),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
  });
}

/**
 * 更新请假记录
 */
export function useUpdateLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateLeaveParams }) =>
      leaveService.updateLeaveRecord(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
  });
}

/**
 * 删除请假记录
 */
export function useDeleteLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leaveService.deleteLeaveRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
  });
}

/**
 * 批量删除请假记录
 */
export function useDeleteLeaveBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => leaveService.deleteLeaveRecords(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
  });
}

/**
 * 冻结请假额度
 */
export function useFreezeLeaveQuota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workerId, leaveType, days, year }: {
      workerId: string;
      leaveType: string;
      days: number;
      year?: number;
    }) => leaveService.freezeLeaveQuota(workerId, leaveType, days, year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave', 'quotas'] });
    },
  });
}

/**
 * 释放请假额度
 */
export function useReleaseLeaveQuota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workerId, leaveType, days, year }: {
      workerId: string;
      leaveType: string;
      days: number;
      year?: number;
    }) => leaveService.releaseLeaveQuota(workerId, leaveType, days, year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave', 'quotas'] });
    },
  });
}

/**
 * 扣减请假额度
 */
export function useDeductLeaveQuota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workerId, leaveType, days, year }: {
      workerId: string;
      leaveType: string;
      days: number;
      year?: number;
    }) => leaveService.deductLeaveQuota(workerId, leaveType, days, year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave', 'quotas'] });
    },
  });
}
