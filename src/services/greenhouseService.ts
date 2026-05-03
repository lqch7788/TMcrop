/**
 * 温室大棚数据服务
 * 提供温室的本地存储和API获取功能
 */

import { apiClient, USE_API } from './apiClient';
import { greenhouses as defaultGreenhouses } from '../data/mockData';

// 温室大棚数据结构
export interface Greenhouse {
  id: string;
  oid: string;
  code: string;
  name: string;
  greenhouseType?: string;
  area?: number;
  location?: string;
  status?: string;
  createdAt?: string;
}

const STORAGE_KEY = 'system_greenhouses';

/**
 * 从 localStorage 获取温室数据
 */
function getStoredGreenhouses(): Greenhouse[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('温室数据解析失败:', error);
      return defaultGreenhouses;
    }
  }
  return defaultGreenhouses;
}

/**
 * 保存温室数据到 localStorage
 */
function saveGreenhousesToStorage(greenhouses: Greenhouse[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(greenhouses));
}

/**
 * 初始化温室数据
 */
export function initGreenhouses(): Greenhouse[] {
  const data = getStoredGreenhouses();
  if (data.length === 0 && localStorage.getItem(STORAGE_KEY) === null) {
    saveGreenhousesToStorage(defaultGreenhouses);
  }
  return data.length > 0 ? data : defaultGreenhouses;
}

/**
 * 获取所有温室（API模式优先）
 */
export async function getGreenhouses(): Promise<Greenhouse[]> {
  if (USE_API) {
    try {
      const data = await apiClient.get<Greenhouse[]>('/basic-data/greenhouses');
      saveGreenhousesToStorage(data);
      return data;
    } catch (error) {
      console.error('API获取温室数据失败，使用本地数据:', error);
      return getStoredGreenhouses();
    }
  }
  return getStoredGreenhouses();
}

/**
 * 根据ID获取温室
 */
export async function getGreenhouseById(id: string): Promise<Greenhouse | undefined> {
  if (USE_API) {
    const greenhouses = await getGreenhouses();
    return greenhouses.find(g => g.id === id);
  }
  const greenhouses = getStoredGreenhouses();
  return greenhouses.find(g => g.id === id);
}

/**
 * 获取温室名称
 */
export async function getGreenhouseName(id: string): Promise<string> {
  const greenhouse = await getGreenhouseById(id);
  return greenhouse?.name || '';
}

/**
 * 根据温室类型获取温室列表
 */
export async function getGreenhousesByType(type: string): Promise<Greenhouse[]> {
  const greenhouses = await getGreenhouses();
  return greenhouses.filter(g => g.greenhouseType === type);
}

/**
 * 保存温室数据
 */
export async function saveGreenhouses(greenhouses: Greenhouse[]): Promise<void> {
  if (USE_API) {
    // API模式下通过后端保存
    await apiClient.post('/basic-data/greenhouses', greenhouses);
  }
  saveGreenhousesToStorage(greenhouses);
}

/**
 * 获取默认温室数据
 */
export function getDefaultGreenhouses(): Greenhouse[] {
  return defaultGreenhouses;
}

/**
 * 重置温室数据
 */
export function resetGreenhouses(): void {
  saveGreenhousesToStorage(defaultGreenhouses);
}
