/**
 * 库存 API 服务
 * 对接后端 /api/inventory 路由
 */

import { apiClient } from './apiClient';
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

// API 响应结构
interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * 获取库存列表
 */
export async function getInventoryList(filters?: InventoryFilters): Promise<InventoryRecord[]> {
  const params = new URLSearchParams();
  if (filters?.crop_name) params.append('crop_name', filters.crop_name);
  if (filters?.stock_type) params.append('stock_type', filters.stock_type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  const query = params.toString();
  const url = `/inventory${query ? `?${query}` : ''}`;

  const response = await apiClient.get<ApiResponse<InventoryRecord[]>>(url);
  return response.data || [];
}

/**
 * 按作物名称聚合查询库存
 */
export async function getInventoryByCropName(cropName?: string): Promise<InventoryAggregation> {
  const params = new URLSearchParams();
  if (cropName) params.append('crop_name', cropName);

  const query = params.toString();
  const url = `/inventory/aggregate/by-crop${query ? `?${query}` : ''}`;

  const response = await apiClient.get<ApiResponse<InventoryAggregation>>(url);
  return response.data;
}

/**
 * 获取库存详情
 */
export async function getInventoryById(id: string): Promise<InventoryRecord | null> {
  try {
    const response = await apiClient.get<ApiResponse<InventoryRecord>>(`/inventory/${id}`);
    return response.data;
  } catch (error) {
    console.error('获取库存详情失败:', error);
    return null;
  }
}

/**
 * 创建库存记录
 */
export async function createInventory(data: Partial<InventoryRecord>): Promise<string | null> {
  try {
    const response = await apiClient.post<ApiResponse<{ id: string }>>('/inventory', data);
    return response.data?.id || null;
  } catch (error) {
    console.error('创建库存记录失败:', error);
    return null;
  }
}

/**
 * 更新库存记录
 */
export async function updateInventory(id: string, updates: Partial<InventoryRecord>): Promise<boolean> {
  try {
    await apiClient.put<ApiResponse<{ id: string }>>(`/inventory/${id}`, updates);
    return true;
  } catch (error) {
    console.error('更新库存记录失败:', error);
    return false;
  }
}

/**
 * 删除库存记录
 */
export async function deleteInventory(id: string): Promise<boolean> {
  try {
    await apiClient.delete<ApiResponse<{ id: string }>>(`/inventory/${id}`);
    return true;
  } catch (error) {
    console.error('删除库存记录失败:', error);
    return false;
  }
}

/**
 * 批量删除库存记录
 */
export async function deleteInventoryBatch(ids: string[]): Promise<boolean> {
  try {
    await Promise.all(ids.map(id => apiClient.delete(`/inventory/${id}`)));
    return true;
  } catch (error) {
    console.error('批量删除库存记录失败:', error);
    return false;
  }
}
