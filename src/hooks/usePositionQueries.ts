/**
 * 职位管理 Query Hooks
 * 使用 React Query 管理职位数据的获取和缓存
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as positionService from '../services/apiPositionService';
import type { Position, CreatePositionParams, UpdatePositionParams } from '../services/apiPositionService';

// ==================== 职位查询 ====================

/**
 * 获取职位列表
 */
export function usePositions() {
  return useQuery<Position[]>({
    queryKey: ['positions'],
    queryFn: positionService.getPositions,
    staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
  });
}

/**
 * 获取单个职位
 */
export function usePosition(id: string) {
  return useQuery<Position | null>({
    queryKey: ['position', id],
    queryFn: () => positionService.getPositionById(id),
    enabled: !!id,
  });
}

// ==================== 职位 Mutations ====================

/**
 * 创建职位
 */
export function useCreatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (position: CreatePositionParams) => positionService.createPosition(position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

/**
 * 更新职位
 */
export function useUpdatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdatePositionParams }) =>
      positionService.updatePosition(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

/**
 * 删除职位
 */
export function useDeletePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => positionService.deletePosition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

/**
 * 批量删除职位
 */
export function useDeletePositions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => positionService.deletePositions(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}
