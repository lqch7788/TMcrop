/**
 * 种植数据 API 服务
 * 对接后端 /api/plantings
 */

import { apiClient, USE_API } from './apiClient';
import { Planting } from '../types/crop';

// 导入本地服务作为回退
import * as localService from './plantingService';

/**
 * 获取所有种植数据
 */
export async function getPlantings(): Promise<Planting[]> {
  if (USE_API) {
    return apiClient.get<Planting[]>('/plantings');
  }
  return localService.getPlantings();
}

/**
 * 根据ID获取单条种植记录
 */
export async function getPlantingById(id: string): Promise<Planting | undefined> {
  if (USE_API) {
    return apiClient.get<Planting>(`/plantings/${id}`);
  }
  return localService.getPlantingById(id);
}

/**
 * 根据ID数组获取多条种植记录
 */
export async function getPlantingsByIds(ids: string[]): Promise<Planting[]> {
  if (USE_API) {
    return apiClient.get<Planting[]>(`/plantings/batch?ids=${ids.join(',')}`);
  }
  return localService.getPlantingsByIds(ids);
}

/**
 * 根据来源ID获取种植记录（用于级联查询）
 */
export async function getPlantingsBySourceId(sourceId: string): Promise<Planting[]> {
  if (USE_API) {
    return apiClient.get<Planting[]>(`/plantings/source/${sourceId}`);
  }
  return localService.getPlantingsBySourceId(sourceId);
}

/**
 * 添加新种植记录
 */
export async function addPlanting(planting: Omit<Planting, 'id' | 'createTime' | 'updateTime'>): Promise<Planting> {
  if (USE_API) {
    const result = await apiClient.post<{ id: string }>('/plantings', planting);
    return { ...planting, id: result.id } as Planting;
  }
  return localService.addPlanting(planting);
}

/**
 * 更新种植记录
 */
export async function updatePlanting(id: string, updates: Partial<Planting>): Promise<Planting | null> {
  if (USE_API) {
    const result = await apiClient.put<{ id: string }>(`/plantings/${id}`, updates);
    return result ? { ...updates, id } as Planting : null;
  }
  return localService.updatePlanting(id, updates);
}

/**
 * 删除种植记录
 */
export async function deletePlanting(id: string): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/plantings/${id}`);
    return true;
  }
  return localService.deletePlanting(id);
}

/**
 * 批量删除种植记录
 */
export async function deletePlantings(ids: string[]): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/plantings/batch?ids=${ids.join(',')}`);
    return true;
  }
  return localService.deletePlantings(ids);
}

/**
 * 采收登记
 */
export async function harvestPlanting(id: string, harvestDate: string, harvestCount?: number): Promise<boolean> {
  if (USE_API) {
    await apiClient.post(`/plantings/${id}/harvest`, { harvestDate, harvestCount });
    return true;
  }
  return localService.harvestPlanting(id, harvestDate, harvestCount);
}

/**
 * 获取未采收的种植列表
 */
export async function getUnharvestedPlantings(): Promise<Planting[]> {
  if (USE_API) {
    return apiClient.get<Planting[]>('/plantings/unharvested');
  }
  return localService.getUnharvestedPlantings();
}

/**
 * 获取已采收的种植列表
 */
export async function getHarvestedPlantings(): Promise<Planting[]> {
  if (USE_API) {
    return apiClient.get<Planting[]>('/plantings/harvested');
  }
  return localService.getHarvestedPlantings();
}

/**
 * 生成种植批号
 */
export async function generatePlantCode(sourceCode: string): Promise<string> {
  if (USE_API) {
    return apiClient.get<string>(`/plantings/generate-code?sourceCode=${sourceCode}`);
  }
  return localService.generatePlantCode(sourceCode);
}

/**
 * 重置数据到默认状态
 */
export async function resetPlantings(): Promise<void> {
  if (USE_API) {
    await apiClient.post('/plantings/reset');
  }
  return localService.resetPlantings();
}
