/**
 * 库存 API 服务 (V2.1 架构 - 已简化)
 * 对接后端 /api/inventory
 * 数据流：API → 组件 (无缓存层)
 */

import { enhancedApiClient } from '../lib/apiClient';
import type { InventoryStatus } from '../types/inventory';

// 库存记录类型
export interface InventoryRecord {
  id: string;
  product_code: string;
  crop_name: string;
  variety: string;
  quantity: number;
  unit: string;
  grade: string;
  warehouse_name: string;
  storage_location: string;
  harvest_date: string;
  storage_date: string;
  batch_code: string;
  greenhouse_name: string;
  planting_mode: string;
  stock_type: string;
  status: string;
  create_time: string;
  update_time: string;
}

// 库存查询参数
export interface InventoryFilters {
  crop_name?: string;
  stock_type?: 'seed' | 'seedling' | 'product';
  status?: InventoryStatus;
  page?: number;
  limit?: number;
  // 生产计划联动过滤（用于 getRelated* 服务）
  productionPlanId?: string;
}

// 库存聚合查询结果
export interface InventoryAggregation {
  crop_name: string;
  seed: InventoryRecord[];
  seedling: InventoryRecord[];
  product: InventoryRecord[];
  total: number;
  totalQuantity: {
    seed: number;
    seedling: number;
    product: number;
  };
}

/**
 * 获取库存列表
 * 2026-08-14：默认 limit=500 — 后端默认 50 会静默截断列表（与育苗/种植同款 bug）
 */
export async function getInventoryList(filters?: InventoryFilters): Promise<InventoryRecord[]> {
  const params: Record<string, string> = {};
  if (filters?.crop_name) params.crop_name = filters.crop_name;
  if (filters?.stock_type) params.stock_type = filters.stock_type;
  if (filters?.status) params.status = filters.status;
  if (filters?.page) params.page = String(filters.page);
  if (filters?.limit) params.limit = String(filters.limit);
  // 未显式传 limit 时兜底 500（避免后端默认 50 截断）
  if (!params.limit) params.limit = '500';

  const query = new URLSearchParams(params).toString();
  return await enhancedApiClient.get<InventoryRecord[]>(`/inventory${query ? `?${query}` : ''}`);
}

/**
 * 按作物名称聚合查询库存
 */
export async function getInventoryByCropName(cropName?: string): Promise<InventoryAggregation> {
  const params: Record<string, string> = {};
  if (cropName) params.crop_name = cropName;

  const query = new URLSearchParams(params).toString();
  return await enhancedApiClient.get<InventoryAggregation>(`/inventory/aggregate/by-crop${query ? `?${query}` : ''}`);
}

/**
 * 获取库存详情
 */
export async function getInventoryById(id: string): Promise<InventoryRecord | null> {
  try {
    return await enhancedApiClient.get<InventoryRecord>(`/inventory/${id}`);
  } catch {
    return null;
  }
}

/**
 * 创建库存记录
 */
export async function createInventory(data: Partial<InventoryRecord>): Promise<InventoryRecord | null> {
  try {
    const response = await enhancedApiClient.post<InventoryRecord>('/inventory', data);
    return response;
  } catch {
    return null;
  }
}

/**
 * 更新库存记录
 */
export async function updateInventory(id: string, updates: Partial<InventoryRecord>): Promise<boolean> {
  try {
    await enhancedApiClient.put(`/inventory/${id}`, updates);
    return true;
  } catch {
    return false;
  }
}

/**
 * 删除库存记录
 */
export async function deleteInventory(id: string): Promise<boolean> {
  try {
    await enhancedApiClient.delete(`/inventory/${id}`);
    return true;
  } catch {
    return false;
  }
}

// 2026-07-28 审核 H-5：apiInventoryService.deleteInventoryBatch 与 inventoryService 版本签名冲突（返回 boolean vs 返回 result），且无调用方，删除之
// 批量删除请统一用 inventoryService.deleteInventoryBatch（提供 blockingTransactions 拦截详情）
// 保留此注释作为占位（原 deleteInventoryBatch 函数已删除）
