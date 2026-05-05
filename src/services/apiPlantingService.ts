/**
 * 种植数据 API 服务
 * 对接后端 /api/plantings
 * 原型阶段：只使用API，不降级到localStorage
 */

import { apiClient } from './apiClient';
import { Planting } from '../types/crop';

// ==================== API 函数（不降级到localStorage）====================

export async function getPlantings(): Promise<Planting[]> {
  return await apiClient.get<Planting[]>('/plantings');
}

export async function getPlantingById(id: string): Promise<Planting | undefined> {
  return await apiClient.get<Planting>(`/plantings/${id}`);
}

export async function getPlantingsByIds(ids: string[]): Promise<Planting[]> {
  return await apiClient.get<Planting[]>(`/plantings/batch?ids=${ids.join(',')}`);
}

export async function getPlantingsBySourceId(sourceId: string): Promise<Planting[]> {
  return await apiClient.get<Planting[]>(`/plantings/source/${sourceId}`);
}

export async function addPlanting(planting: Omit<Planting, 'id' | 'createTime' | 'updateTime'>): Promise<Planting> {
  const result = await apiClient.post<{ id: string }>('/plantings', planting);
  return { ...planting, id: result.id } as Planting;
}

export async function updatePlanting(id: string, updates: Partial<Planting>): Promise<Planting | null> {
  const result = await apiClient.put<{ id: string }>(`/plantings/${id}`, updates);
  return result ? { ...updates, id } as Planting : null;
}

export async function deletePlanting(id: string): Promise<boolean> {
  await apiClient.delete(`/plantings/${id}`);
  return true;
}

export async function deletePlantings(ids: string[]): Promise<boolean> {
  await apiClient.delete(`/plantings/batch?ids=${ids.join(',')}`);
  return true;
}

export async function harvestPlanting(id: string, harvestDate: string, harvestCount?: number): Promise<boolean> {
  await apiClient.post(`/plantings/${id}/harvest`, { harvestDate, harvestCount });
  return true;
}

export async function getUnharvestedPlantings(): Promise<Planting[]> {
  return await apiClient.get<Planting[]>('/plantings/unharvested');
}

export async function getHarvestedPlantings(): Promise<Planting[]> {
  return await apiClient.get<Planting[]>('/plantings/harvested');
}

export async function generatePlantCode(sourceCode: string): Promise<string> {
  return await apiClient.get<string>(`/plantings/generate-code?sourceCode=${sourceCode}`);
}

export async function resetPlantings(): Promise<void> {
  await apiClient.post('/plantings/reset');
}
