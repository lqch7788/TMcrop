/**
 * 入职管理 Query Hooks
 * 使用 React Query 管理入职数据的获取和缓存
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as onboardingService from '../services/apiOnboardingService';
import type {
  OnboardingRecord,
  CreateOnboardingParams,
  UpdateOnboardingParams,
  UpdateStatusParams,
} from '../services/apiOnboardingService';

// ==================== 入职记录查询 ====================

/**
 * 获取入职记录列表
 */
export function useOnboardingRecords(
  filters?: { status?: string; keyword?: string },
  pagination?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: ['onboarding', 'records', filters, pagination],
    queryFn: () => onboardingService.getOnboardingRecords(filters, pagination),
    staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
  });
}

/**
 * 获取单个入职记录
 */
export function useOnboardingRecord(id: string) {
  return useQuery<OnboardingRecord | null>({
    queryKey: ['onboarding', 'record', id],
    queryFn: () => onboardingService.getOnboardingById(id),
    enabled: !!id,
  });
}

// ==================== 入职记录 Mutations ====================

/**
 * 创建入职记录
 */
export function useCreateOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (record: CreateOnboardingParams) => onboardingService.createOnboardingRecord(record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });
}

/**
 * 更新入职记录
 */
export function useUpdateOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateOnboardingParams }) =>
      onboardingService.updateOnboardingRecord(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });
}

/**
 * 删除入职记录
 */
export function useDeleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => onboardingService.deleteOnboardingRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });
}

/**
 * 批量删除入职记录
 */
export function useDeleteOnboardingBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => onboardingService.deleteOnboardingRecords(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });
}

/**
 * 更新入职状态
 */
export function useUpdateOnboardingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, params }: { id: string; params: UpdateStatusParams }) =>
      onboardingService.updateOnboardingStatus(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });
}
