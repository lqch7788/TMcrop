/**
 * 物料申请 Query Hooks
 * 使用 TanStack Query 管理物料申请数据的获取、缓存和同步
 *
 * V1.2 架构：Zustand Store + TanStack Query + 三级降级 apiClient
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMaterialRequests, getMaterialRequestById, createMaterialRequest, updateMaterialRequest, deleteMaterialRequest, type MaterialRequestRecord } from '../services/apiMaterialRequestService';
import { materialReceivingDetails } from '../data/materialReceivingData';
import { useCallback } from 'react';

// ==================== 查询 Hooks ====================

/**
 * 获取物料申请列表
 * 自动降级：API → IndexedDB → localStorage → Mock数据
 */
export function useMaterialRequests(params?: {
  status?: string;
  approval_status?: string;
  department_name?: string;
  applicant_name?: string;
  warehouse_name?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['materialRequests', 'list', params],
    queryFn: async () => {
      try {
        const result = await getMaterialRequests(params);
        return result.data;
      } catch (error) {
        console.warn('[物料申请] API获取失败，降级到Mock数据:', error);
        // 降级到 Mock 数据
        return materialReceivingDetails as unknown as MaterialRequestRecord[];
      }
    },
    staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
    gcTime: 30 * 60 * 1000, // 30分钟缓存
    retry: 2, // 重试2次
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * 获取单个物料申请详情
 */
export function useMaterialRequest(id: string | null) {
  return useQuery({
    queryKey: ['materialRequests', 'detail', id],
    queryFn: async () => {
      if (!id) return null;
      try {
        return await getMaterialRequestById(id);
      } catch (error) {
        console.warn('[物料申请] API获取详情失败，降级到Mock数据:', error);
        // 降级到 Mock 数据
        return materialReceivingDetails.find(item =>
          item.code === id || item.id.toString() === id
        ) as unknown as MaterialRequestRecord || null;
      }
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== 变更 Mutations ====================

/**
 * 创建物料申请
 */
export function useCreateMaterialRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMaterialRequest,
    onSuccess: (data) => {
      console.log('[物料申请] 创建成功:', data);
      // 创建成功后刷新列表
      queryClient.invalidateQueries({ queryKey: ['materialRequests', 'list'] });
    },
    onError: (error) => {
      console.error('[物料申请] 创建失败:', error);
    },
  });
}

/**
 * 更新物料申请
 */
export function useUpdateMaterialRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<MaterialRequestRecord> }) =>
      updateMaterialRequest(id, updates),
    onSuccess: (data, variables) => {
      console.log('[物料申请] 更新成功:', variables.id);
      // 更新成功后刷新列表和详情
      queryClient.invalidateQueries({ queryKey: ['materialRequests', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['materialRequests', 'detail', variables.id] });
    },
    onError: (error) => {
      console.error('[物料申请] 更新失败:', error);
    },
  });
}

/**
 * 删除物料申请
 */
export function useDeleteMaterialRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMaterialRequest,
    onSuccess: (data, id) => {
      console.log('[物料申请] 删除成功:', id);
      // 删除成功后刷新列表
      queryClient.invalidateQueries({ queryKey: ['materialRequests', 'list'] });
    },
    onError: (error) => {
      console.error('[物料申请] 删除失败:', error);
    },
  });
}

// ==================== 数据合并 Hook ====================

/**
 * 获取合并后的物料申请数据（API数据 + 本地数据）
 * 用于需要同时显示后端数据和本地新增数据的场景
 */
export function useMergedMaterialRequests(params?: {
  status?: string;
  approval_status?: string;
  department_name?: string;
  applicant_name?: string;
  warehouse_name?: string;
  page?: number;
  limit?: number;
}) {
  const queryClient = useQueryClient();

  const apiQuery = useMaterialRequests(params);

  // 合并 API 数据和 Mock 种子数据（避免重复）
  const mergedData = useCallback(() => {
    const apiData = apiQuery.data || [];
    if (apiData.length === 0) return [];

    // 创建 API 数据的 Map（按 code 去重）
    const apiMap = new Map(apiData.map(item => [item.requestCode || item.id, item]));

    // 合并 Mock 数据（只添加 API 中没有的）
    const mockData = materialReceivingDetails as unknown as MaterialRequestRecord[];
    mockData.forEach(item => {
      const key = item.code || item.id.toString();
      if (!apiMap.has(key)) {
        apiMap.set(key, item);
      }
    });

    return Array.from(apiMap.values());
  }, [apiQuery.data]);

  return {
    ...apiQuery,
    data: mergedData(),
    isMerged: true,
  };
}

// ==================== 刷新 Hook ====================

/**
 * 手动刷新物料申请数据
 */
export function useRefreshMaterialRequests() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['materialRequests'] });
    console.log('[物料申请] 已触发刷新');
  }, [queryClient]);
}
