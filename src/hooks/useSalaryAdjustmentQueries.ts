/**
 * 调薪申请 Query Hooks
 * 使用 React Query 管理调薪数据的获取和缓存
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as salaryAdjustmentService from '../services/apiSalaryAdjustmentService';
import type {
  SalaryAdjustmentRecord,
  CreateSalaryAdjustmentParams,
  UpdateSalaryAdjustmentParams,
} from '../services/apiSalaryAdjustmentService';

// ==================== 调薪记录查询 ====================

/**
 * 获取调薪记录列表
 */
export function useSalaryAdjustmentRecords(
  filters?: { status?: string; keyword?: string; department?: string },
  pagination?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: ['salaryAdjustment', 'records', filters, pagination],
    queryFn: () => salaryAdjustmentService.getSalaryAdjustmentRecords(filters, pagination),
    staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
  });
}

/**
 * 获取单个调薪记录
 */
export function useSalaryAdjustmentRecord(id: string) {
  return useQuery<SalaryAdjustmentRecord | null>({
    queryKey: ['salaryAdjustment', 'record', id],
    queryFn: () => salaryAdjustmentService.getSalaryAdjustmentById(id),
    enabled: !!id,
  });
}

// ==================== 调薪记录 Mutations ====================

/**
 * 创建调薪记录
 */
export function useCreateSalaryAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (record: CreateSalaryAdjustmentParams) =>
      salaryAdjustmentService.createSalaryAdjustmentRecord(record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryAdjustment'] });
    },
  });
}

/**
 * 更新调薪记录
 */
export function useUpdateSalaryAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateSalaryAdjustmentParams }) =>
      salaryAdjustmentService.updateSalaryAdjustmentRecord(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryAdjustment'] });
    },
  });
}

/**
 * 删除调薪记录
 */
export function useDeleteSalaryAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salaryAdjustmentService.deleteSalaryAdjustmentRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryAdjustment'] });
    },
  });
}

/**
 * 批量删除调薪记录
 */
export function useDeleteSalaryAdjustmentBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => salaryAdjustmentService.deleteSalaryAdjustmentRecords(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryAdjustment'] });
    },
  });
}

/**
 * 更新调薪状态
 */
export function useUpdateSalaryAdjustmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      salaryAdjustmentService.updateSalaryAdjustmentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryAdjustment'] });
    },
  });
}
