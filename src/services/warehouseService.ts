/**
 * 仓库数据服务
 * 提供仓库的本地存储和API获取功能
 */

import { enhancedApiClient } from '../lib/apiClient';
import { warehouses as defaultWarehouses } from '../data/mockData';

// 仓库数据结构
export interface Warehouse {
  id: string;
  oid: string;
  name: string;
  code: string;
  location?: string;
  capacity?: number;
  currentStock?: number;
  warehouseType?: string;
  status?: string;
  createdAt?: string;
}

const STORAGE_KEY = 'system_warehouses';

/**
 * 从 localStorage 获取仓库数据
 */
function getStoredWarehouses(): Warehouse[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('仓库数据解析失败:', error);
      return defaultWarehouses;
    }
  }
  return defaultWarehouses;
}

/**
 * 保存仓库数据到 localStorage
 */
function saveWarehousesToStorage(warehouses: Warehouse[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(warehouses));
}

/**
 * 初始化仓库数据
 */
export function initWarehouses(): Warehouse[] {
  const data = getStoredWarehouses();
  if (data.length === 0 && localStorage.getItem(STORAGE_KEY) === null) {
    saveWarehousesToStorage(defaultWarehouses);
  }
  return data.length > 0 ? data : defaultWarehouses;
}

/**
 * 获取所有仓库（API模式优先）
 */
export async function getWarehouses(): Promise<Warehouse[]> {
  try {
    const data = await apiClient.get<Warehouse[]>('/basic-data/warehouses');
    saveWarehousesToStorage(data);
    return data;
  } catch (error) {
    console.error('API获取仓库数据失败，使用本地数据:', error);
    return getStoredWarehouses();
  }
}

/**
 * 根据ID获取仓库
 */
export async function getWarehouseById(id: string): Promise<Warehouse | undefined> {
  const warehouses = await getWarehouses();
  return warehouses.find(w => w.id === id);
}

/**
 * 获取仓库名称
 */
export async function getWarehouseName(id: string): Promise<string> {
  const warehouse = await getWarehouseById(id);
  return warehouse?.name || '';
}

/**
 * 保存仓库数据
 */
export async function saveWarehouses(warehouses: Warehouse[]): Promise<void> {
  // API模式下通过后端保存
  await apiClient.post('/basic-data/warehouses', warehouses);
  saveWarehousesToStorage(warehouses);
}

/**
 * 获取默认仓库数据
 */
export function getDefaultWarehouses(): Warehouse[] {
  return defaultWarehouses;
}

/**
 * 重置仓库数据
 */
export function resetWarehouses(): void {
  saveWarehousesToStorage(defaultWarehouses);
}
