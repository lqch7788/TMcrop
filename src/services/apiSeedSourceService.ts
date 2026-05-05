/**
 * 种源数据 API 服务
 * 对接后端 /api/seed-sources
 * 原型阶段：只使用API，不降级到localStorage
 */

import { apiClient } from './apiClient';
import { SeedSource } from '../types/crop';

// ==================== API 函数（不降级到localStorage）====================

export async function getSeedSources(): Promise<SeedSource[]> {
  return await apiClient.get<SeedSource[]>('/seed-sources');
}

export async function getSeedSourceById(id: string): Promise<SeedSource | undefined> {
  return await apiClient.get<SeedSource>(`/seed-sources/${id}`);
}

export async function getSeedSourcesByIds(ids: string[]): Promise<SeedSource[]> {
  return await apiClient.get<SeedSource[]>(`/seed-sources/batch?ids=${ids.join(',')}`);
}

export async function addSeedSource(source: Omit<SeedSource, 'id' | 'createTime' | 'updateTime'>): Promise<SeedSource> {
  const result = await apiClient.post<{ id: string }>('/seed-sources', source);
  return { ...source, id: result.id } as SeedSource;
}

export async function updateSeedSource(id: string, updates: Partial<SeedSource>): Promise<SeedSource | null> {
  const result = await apiClient.put<{ id: string }>(`/seed-sources/${id}`, updates);
  return result ? { ...updates, id } as SeedSource : null;
}

export async function deleteSeedSource(id: string): Promise<boolean> {
  await apiClient.delete(`/seed-sources/${id}`);
  return true;
}

export async function deleteSeedSources(ids: string[]): Promise<boolean> {
  await apiClient.delete(`/seed-sources/batch?ids=${ids.join(',')}`);
  return true;
}

export async function decreaseAvailableCount(id: string, count: number): Promise<boolean> {
  await apiClient.post(`/seed-sources/${id}/decrease-available`, { count });
  return true;
}

export async function resetSeedSources(): Promise<void> {
  await apiClient.post('/seed-sources/reset');
}

export async function getTodayMaxSeedCodeSerial(dateStr: string): Promise<number> {
  return await apiClient.get<number>(`/seed-sources/max-serial?date=${dateStr}`);
}

export async function generateSeedCode(dateStr: string): Promise<string> {
  return await apiClient.get<string>(`/seed-sources/generate-code?date=${dateStr}`);
}
