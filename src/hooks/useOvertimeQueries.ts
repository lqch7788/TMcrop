/**
 * 加班管理 Query Hooks
 * 使用 React Query 管理加班数据的获取和缓存
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as overtimeService from '../services/apiOvertimeService';
import type {
  OvertimeRecord,
  CreateOvertimeParams,
  UpdateOvertimeParams,
} from '../services/apiOvertimeService';

// ==================== 加班记录查询 ====================

/**
 * 获取加班记录列表
 */
export function useOvertimeRecords(
  filters?: {
    workerName?: string;
    overtimeType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
  },
  pagination?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: ['overtime', 'records', filters, pagination],
    queryFn: () => overtimeService.getOvertimeRecords(filters, pagination),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取单个加班记录
 */
export function useOvertimeRecord(id: string) {
  return useQuery<OvertimeRecord | null>({
    queryKey: ['overtime', 'record', id],
    queryFn: () => overtimeService.getOvertimeById(id),
    enabled: !!id,
  });
}

// ==================== 加班记录 Mutations ====================

/**
 * 创建加班记录
 */
export function useCreateOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (overtime: CreateOvertimeParams) => overtimeService.createOvertimeRecord(overtime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
    },
  });
}

/**
 * 更新加班记录
 */
export function useUpdateOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateOvertimeParams }) =>
      overtimeService.updateOvertimeRecord(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
    },
  });
}

/**
 * 删除加班记录
 */
export function useDeleteOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => overtimeService.deleteOvertimeRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
    },
  });
}

/**
 * 批量删除加班记录
 */
export function useDeleteOvertimeBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => overtimeService.deleteOvertimeRecords(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
    },
  });
}

/**
 * 审批加班记录
 */
export function useApproveOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approved, comment }: { id: string; approved: boolean; comment?: string }) =>
      overtimeService.approveOvertimeRecord(id, approved, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
    },
  });
}
