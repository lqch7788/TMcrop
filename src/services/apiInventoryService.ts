/**
 * 库存 API 服务
 * 对接后端 /api/inventory 路由
 * API失败时降级到 localStorage
 */

import { apiClient } from './apiClient';
import type { ProduceInventory, InventoryStatus } from '../types/inventory';

// localStorage 配置
const STORAGE_KEY = 'yuanxingtu_inventory';

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

// 默认库存数据
const defaultInventory: InventoryRecord[] = [];

// 从 localStorage 读取数据
function getStoredInventory(): InventoryRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultInventory;
  } catch {
    return defaultInventory;
  }
}

// 保存数据到 localStorage
function saveToStorage(data: InventoryRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
 * 获取库存列表（带localStorage降级）
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

  try {
    const response = await apiClient.get<ApiResponse<InventoryRecord[]>>(url);
    const data = response.data || [];
    // API成功时同步到 localStorage
    saveToStorage(data);
    return data;
  } catch (error) {
    console.warn('[库存API] 获取失败，降级到localStorage:', error);
    return getStoredInventory();
  }
}

/**
 * 按作物名称聚合查询库存（带localStorage降级）
 */
export async function getInventoryByCropName(cropName?: string): Promise<InventoryAggregation> {
  const params = new URLSearchParams();
  if (cropName) params.append('crop_name', cropName);

  const query = params.toString();
  const url = `/inventory/aggregate/by-crop${query ? `?${query}` : ''}`;

  try {
    const response = await apiClient.get<ApiResponse<InventoryAggregation>>(url);
    return response.data;
  } catch (error) {
    console.warn('[库存API] 按作物名称聚合查询失败，降级到localStorage:', error);
    // 从 localStorage 数据构建聚合结果
    const stored = getStoredInventory();
    const filtered = cropName ? stored.filter(i => i.crop_name === cropName) : stored;
    return {
      crop_name: cropName || '',
      seed: filtered.filter(i => i.product_code.startsWith('seed')),
      seedling: filtered.filter(i => i.product_code.startsWith('seedling')),
      product: filtered.filter(i => i.product_code.startsWith('product')),
      total: filtered.length,
      totalQuantity: {
        seed: 0,
        seedling: 0,
        product: filtered.reduce((sum, i) => sum + i.quantity, 0),
      },
    };
  }
}

/**
 * 获取库存详情（带localStorage降级）
 */
export async function getInventoryById(id: string): Promise<InventoryRecord | null> {
  try {
    const response = await apiClient.get<ApiResponse<InventoryRecord>>(`/inventory/${id}`);
    return response.data;
  } catch (error) {
    console.warn('[库存API] 获取详情失败，降级到localStorage:', error);
    const stored = getStoredInventory();
    return stored.find(i => i.id === id) || null;
  }
}

/**
 * 创建库存记录（带localStorage降级）
 */
export async function createInventory(data: Partial<InventoryRecord>): Promise<string | null> {
  try {
    const response = await apiClient.post<ApiResponse<{ id: string }>>('/inventory', data);
    const newId = response.data?.id || null;
    if (newId) {
      // 同步到 localStorage
      const stored = getStoredInventory();
      stored.push({ ...data, id: newId } as InventoryRecord);
      saveToStorage(stored);
    }
    return newId;
  } catch (error) {
    console.error('[库存API] 创建失败:', error);
    // 生成一个本地ID
    const localId = `INV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stored = getStoredInventory();
    stored.push({ ...data, id: localId } as InventoryRecord);
    saveToStorage(stored);
    return localId;
  }
}

/**
 * 更新库存记录（带localStorage降级）
 */
export async function updateInventory(id: string, updates: Partial<InventoryRecord>): Promise<boolean> {
  try {
    await apiClient.put<ApiResponse<{ id: string }>>(`/inventory/${id}`, updates);
    // 同步到 localStorage
    const stored = getStoredInventory();
    const index = stored.findIndex(i => i.id === id);
    if (index !== -1) {
      stored[index] = { ...stored[index], ...updates };
      saveToStorage(stored);
    }
    return true;
  } catch (error) {
    console.error('[库存API] 更新失败:', error);
    // 更新 localStorage
    const stored = getStoredInventory();
    const index = stored.findIndex(i => i.id === id);
    if (index !== -1) {
      stored[index] = { ...stored[index], ...updates };
      saveToStorage(stored);
      return true;
    }
    return false;
  }
}

/**
 * 删除库存记录（带localStorage降级）
 */
export async function deleteInventory(id: string): Promise<boolean> {
  try {
    await apiClient.delete<ApiResponse<{ id: string }>>(`/inventory/${id}`);
    // 从 localStorage 移除
    const stored = getStoredInventory();
    const filtered = stored.filter(i => i.id !== id);
    saveToStorage(filtered);
    return true;
  } catch (error) {
    console.error('[库存API] 删除失败:', error);
    // 从 localStorage 移除
    const stored = getStoredInventory();
    const filtered = stored.filter(i => i.id !== id);
    saveToStorage(filtered);
    return true;
  }
}

/**
 * 批量删除库存记录（带localStorage降级）
 */
export async function deleteInventoryBatch(ids: string[]): Promise<boolean> {
  try {
    await Promise.all(ids.map(id => apiClient.delete(`/inventory/${id}`)));
    // 从 localStorage 移除
    const stored = getStoredInventory();
    const filtered = stored.filter(i => !ids.includes(i.id));
    saveToStorage(filtered);
    return true;
  } catch (error) {
    console.error('[库存API] 批量删除失败:', error);
    // 从 localStorage 移除
    const stored = getStoredInventory();
    const filtered = stored.filter(i => !ids.includes(i.id));
    saveToStorage(filtered);
    return true;
  }
}
