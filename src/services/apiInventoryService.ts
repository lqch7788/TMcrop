/**
 * 库存 API 服务 (V2.1 架构 - 已简化)
 * 对接后端 /api/inventory
 * 数据流：API → 组件 (无缓存层)
 */

import { enhancedApiClient } from '../lib/apiClient';
import type { ProduceInventory, InventoryStatus } from '../types/inventory';

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
 */
export async function getInventoryList(filters?: InventoryFilters): Promise<InventoryRecord[]> {
  const params: Record<string, string> = {};
  if (filters?.crop_name) params.crop_name = filters.crop_name;
  if (filters?.stock_type) params.stock_type = filters.stock_type;
  if (filters?.status) params.status = filters.status;
  if (filters?.page) params.page = String(filters.page);
  if (filters?.limit) params.limit = String(filters.limit);

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

/**
 * 批量删除库存记录
 */
export async function deleteInventoryBatch(ids: string[]): Promise<boolean> {
  try {
    await enhancedApiClient.delete(`/inventory/batch?ids=${ids.join(',')}`);
    return true;
  } catch {
    return false;
  }
}
