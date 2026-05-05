/**
 * 种源数据 API 服务
 * 对接后端 /api/seed-sources
 */

import { apiClient } from './apiClient';
import { SeedSource } from '../types/crop';

// 导入本地服务作为回退
import * as localService from './seedSourceService';

/**
 * 获取所有种源数据
 */
export async function getSeedSources(): Promise<SeedSource[]> {
  try {
    return apiClient.get<SeedSource[]>('/seed-sources');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getSeedSources();
  }
}

/**
 * 根据ID获取单条种源
 */
export async function getSeedSourceById(id: string): Promise<SeedSource | undefined> {
  try {
    return apiClient.get<SeedSource>(`/seed-sources/${id}`);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getSeedSourceById(id);
  }
}

/**
 * 根据ID数组获取多种源
 */
export async function getSeedSourcesByIds(ids: string[]): Promise<SeedSource[]> {
  try {
    return apiClient.get<SeedSource[]>(`/seed-sources/batch?ids=${ids.join(',')}`);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getSeedSourcesByIds(ids);
  }
}

/**
 * 添加新种源
 */
export async function addSeedSource(source: Omit<SeedSource, 'id' | 'createTime' | 'updateTime'>): Promise<SeedSource> {
  try {
    const result = await apiClient.post<{ id: string }>('/seed-sources', source);
    return { ...source, id: result.id } as SeedSource;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.addSeedSource(source);
  }
}

/**
 * 更新种源
 */
export async function updateSeedSource(id: string, updates: Partial<SeedSource>): Promise<SeedSource | null> {
  try {
    const result = await apiClient.put<{ id: string }>(`/seed-sources/${id}`, updates);
    return result ? { ...updates, id } as SeedSource : null;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.updateSeedSource(id, updates);
  }
}

/**
 * 删除种源
 */
export async function deleteSeedSource(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/seed-sources/${id}`);
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.deleteSeedSource(id);
  }
}

/**
 * 批量删除种源
 */
export async function deleteSeedSources(ids: string[]): Promise<boolean> {
  try {
    await apiClient.delete(`/seed-sources/batch?ids=${ids.join(',')}`);
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.deleteSeedSources(ids);
  }
}

/**
 * 扣减可用数量（育苗定植时调用）
 */
export async function decreaseAvailableCount(id: string, count: number): Promise<boolean> {
  try {
    await apiClient.post(`/seed-sources/${id}/decrease-available`, { count });
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.decreaseAvailableCount(id, count);
  }
}

/**
 * 重置数据到默认状态
 */
export async function resetSeedSources(): Promise<void> {
  try {
    await apiClient.post('/seed-sources/reset');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
  }
  return localService.resetSeedSources();
}

/**
 * 获取当天最大种源批号流水号
 * @param dateStr 日期字符串 (YYYYMMDD格式)
 */
export async function getTodayMaxSeedCodeSerial(dateStr: string): Promise<number> {
  try {
    return apiClient.get<number>(`/seed-sources/max-serial?date=${dateStr}`);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getTodayMaxSeedCodeSerial(dateStr);
  }
}

/**
 * 生成新的种源批号
 * @param dateStr 日期字符串 (YYYYMMDD格式)
 */
export async function generateSeedCode(dateStr: string): Promise<string> {
  try {
    return apiClient.get<string>(`/seed-sources/generate-code?date=${dateStr}`);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.generateSeedCode(dateStr);
  }
}
