/**
 * 仓库物料 Query Hooks
 * 使用 React Query 管理仓库相关数据的获取和缓存
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as warehouseService from '../services/apiWarehouseMaterialService';
import type { Material, InboundRecord } from '../services/apiWarehouseMaterialService';

// ==================== 物料查询 ====================

/**
 * 获取物料列表
 */
export function useMaterials() {
  return useQuery<Material[]>({
    queryKey: ['warehouse', 'materials'],
    queryFn: warehouseService.getMaterials,
    staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
  });
}

/**
 * 获取单个物料
 */
export function useMaterial(id: number) {
  return useQuery<Material | null>({
    queryKey: ['warehouse', 'material', id],
    queryFn: () => warehouseService.getMaterials().then(items => items.find(m => m.id === id) || null),
    enabled: !!id,
  });
}

// ==================== 入库记录查询 ====================

/**
 * 获取入库记录列表
 */
export function useInboundRecords() {
  return useQuery<InboundRecord[]>({
    queryKey: ['warehouse', 'inbound'],
    queryFn: warehouseService.getInboundRecords,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取单个入库记录
 */
export function useInboundRecord(id: number) {
  return useQuery<InboundRecord | null>({
    queryKey: ['warehouse', 'inbound', id],
    queryFn: () => warehouseService.getInboundRecords().then(records => records.find(r => r.id === id) || null),
    enabled: !!id,
  });
}

// ==================== 物料 Mutations ====================

/**
 * 创建入库记录
 */
export function useCreateInbound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (record: Omit<InboundRecord, 'id'>) => warehouseService.createInboundRecord(record),
    onSuccess: () => {
      // 创建成功后刷新入库记录列表
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'inbound'] });
    },
  });
}

/**
 * 删除入库记录
 */
export function useDeleteInbound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await warehouseService.deleteInboundRecord(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'inbound'] });
    },
  });
}

/**
 * 更新物料
 */
export function useUpdateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Material> }) =>
      warehouseService.updateMaterial(id, updates),
    onSuccess: () => {
      // 更新成功后刷新物料列表
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'materials'] });
    },
  });
}

/**
 * 删除物料
 */
export function useDeleteMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => warehouseService.deleteMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'materials'] });
    },
  });
}
