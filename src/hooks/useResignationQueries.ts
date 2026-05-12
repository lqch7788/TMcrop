/**
 * 离职管理 Query Hooks
 * 使用 React Query 管理离职数据的获取和缓存
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as resignationService from '../services/apiResignationService';
import type {
  ResignationRecord,
  CreateResignationParams,
  UpdateResignationParams,
} from '../services/apiResignationService';

// ==================== 离职记录查询 ====================

/**
 * 获取离职记录列表
 */
export function useResignationRecords(
  filters?: {
    workerName?: string;
    resignationType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  },
  pagination?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: ['resignation', 'records', filters, pagination],
    queryFn: () => resignationService.getResignationRecords(filters, pagination),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取单个离职记录
 */
export function useResignationRecord(id: string) {
  return useQuery<ResignationRecord | null>({
    queryKey: ['resignation', 'record', id],
    queryFn: () => resignationService.getResignationById(id),
    enabled: !!id,
  });
}

// ==================== 离职记录 Mutations ====================

/**
 * 创建离职记录
 */
export function useCreateResignation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resignation: CreateResignationParams) =>
      resignationService.createResignationRecord(resignation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignation'] });
    },
  });
}

/**
 * 更新离职记录
 */
export function useUpdateResignation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateResignationParams }) =>
      resignationService.updateResignationRecord(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignation'] });
    },
  });
}

/**
 * 删除离职记录
 */
export function useDeleteResignation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resignationService.deleteResignationRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignation'] });
    },
  });
}

/**
 * 复职操作
 */
export function useRejoinWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workerId, rejoinDate }: { workerId: string; rejoinDate: string }) =>
      resignationService.rejoinWorker(workerId, rejoinDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignation'] });
    },
  });
}
