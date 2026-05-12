/**
 * 招聘管理 Query Hooks
 * 使用 React Query 管理招聘数据的获取和缓存
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as recruitmentService from '../services/apiRecruitmentService';
import type {
  RecruitmentRecord,
  CreateRecruitmentParams,
  UpdateRecruitmentParams,
} from '../services/apiRecruitmentService';

// ==================== 招聘记录查询 ====================

/**
 * 获取招聘记录列表
 */
export function useRecruitmentRecords(
  filters?: {
    recruitmentCode?: string;
    deptId?: string;
    position?: string;
    status?: string;
    priority?: string;
  },
  pagination?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: ['recruitment', 'records', filters, pagination],
    queryFn: () => recruitmentService.getRecruitmentRecords(filters, pagination),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取单个招聘记录
 */
export function useRecruitmentRecord(id: string) {
  return useQuery<RecruitmentRecord | null>({
    queryKey: ['recruitment', 'record', id],
    queryFn: () => recruitmentService.getRecruitmentById(id),
    enabled: !!id,
  });
}

// ==================== 招聘记录 Mutations ====================

/**
 * 创建招聘记录
 */
export function useCreateRecruitment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recruitment: CreateRecruitmentParams) =>
      recruitmentService.createRecruitmentRecord(recruitment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment'] });
    },
  });
}

/**
 * 更新招聘记录
 */
export function useUpdateRecruitment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateRecruitmentParams }) =>
      recruitmentService.updateRecruitmentRecord(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment'] });
    },
  });
}

/**
 * 删除招聘记录
 */
export function useDeleteRecruitment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recruitmentService.deleteRecruitmentRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment'] });
    },
  });
}
