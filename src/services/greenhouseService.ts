/**
 * 温室大棚数据服务
 * 提供温室的本地存储和API获取功能
 */

import { enhancedApiClient } from '../lib/apiClient';
import { logger } from '../lib/logger';

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
      logger.error('温室数据解析失败', error);
      return [];
    }
  }
  return [];
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
  return data;
}

/**
 * 获取所有温室（API模式优先）
 */
export async function getGreenhouses(): Promise<Greenhouse[]> {
  try {
    const data = await apiClient.get<Greenhouse[]>('/basic-data/greenhouses');
    saveGreenhousesToStorage(data);
    return data;
  } catch (error) {
    logger.error('API获取温室数据失败，使用本地数据', error);
    return getStoredGreenhouses();
  }
}

/**
 * 根据ID获取温室
 */
export async function getGreenhouseById(id: string): Promise<Greenhouse | undefined> {
  const greenhouses = await getGreenhouses();
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
  // API模式下通过后端保存
  await apiClient.post('/basic-data/greenhouses', greenhouses);
  saveGreenhousesToStorage(greenhouses);
}

/**
 * 获取默认温室数据
 */
export function getDefaultGreenhouses(): Greenhouse[] {
  return [];
}

/**
 * 重置温室数据
 */
export function resetGreenhouses(): void {
  saveGreenhousesToStorage([]);
}
