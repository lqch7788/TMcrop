/**
 * 种植数据 API 服务
 * 对接后端 /api/plantings
 */

import { apiClient } from './apiClient';
import { Planting } from '../types/crop';

// 导入本地服务作为回退
import * as localService from './plantingService';

/**
 * 获取所有种植数据
 */
export async function getPlantings(): Promise<Planting[]> {
  try {
    return await apiClient.get<Planting[]>('/plantings');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getPlantings();
  }
}

/**
 * 根据ID获取单条种植记录
 */
export async function getPlantingById(id: string): Promise<Planting | undefined> {
  try {
    return await apiClient.get<Planting>(`/plantings/${id}`);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getPlantingById(id);
  }
}

/**
 * 根据ID数组获取多条种植记录
 */
export async function getPlantingsByIds(ids: string[]): Promise<Planting[]> {
  try {
    return await apiClient.get<Planting[]>(`/plantings/batch?ids=${ids.join(',')}`);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getPlantingsByIds(ids);
  }
}

/**
 * 根据来源ID获取种植记录（用于级联查询）
 */
export async function getPlantingsBySourceId(sourceId: string): Promise<Planting[]> {
  try {
    return await apiClient.get<Planting[]>(`/plantings/source/${sourceId}`);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getPlantingsBySourceId(sourceId);
  }
}

/**
 * 添加新种植记录
 */
export async function addPlanting(planting: Omit<Planting, 'id' | 'createTime' | 'updateTime'>): Promise<Planting> {
  try {
    const result = await apiClient.post<{ id: string }>('/plantings', planting);
    return { ...planting, id: result.id } as Planting;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.addPlanting(planting);
  }
}

/**
 * 更新种植记录
 */
export async function updatePlanting(id: string, updates: Partial<Planting>): Promise<Planting | null> {
  try {
    const result = await apiClient.put<{ id: string }>(`/plantings/${id}`, updates);
    return result ? { ...updates, id } as Planting : null;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.updatePlanting(id, updates);
  }
}

/**
 * 删除种植记录
 */
export async function deletePlanting(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/plantings/${id}`);
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.deletePlanting(id);
  }
}

/**
 * 批量删除种植记录
 */
export async function deletePlantings(ids: string[]): Promise<boolean> {
  try {
    await apiClient.delete(`/plantings/batch?ids=${ids.join(',')}`);
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.deletePlantings(ids);
  }
}

/**
 * 采收登记
 */
export async function harvestPlanting(id: string, harvestDate: string, harvestCount?: number): Promise<boolean> {
  try {
    await apiClient.post(`/plantings/${id}/harvest`, { harvestDate, harvestCount });
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.harvestPlanting(id, harvestDate, harvestCount);
  }
}

/**
 * 获取未采收的种植列表
 */
export async function getUnharvestedPlantings(): Promise<Planting[]> {
  try {
    return await apiClient.get<Planting[]>('/plantings/unharvested');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getUnharvestedPlantings();
  }
}

/**
 * 获取已采收的种植列表
 */
export async function getHarvestedPlantings(): Promise<Planting[]> {
  try {
    return await apiClient.get<Planting[]>('/plantings/harvested');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getHarvestedPlantings();
  }
}

/**
 * 生成种植批号
 */
export async function generatePlantCode(sourceCode: string): Promise<string> {
  try {
    return await apiClient.get<string>(`/plantings/generate-code?sourceCode=${sourceCode}`);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.generatePlantCode(sourceCode);
  }
}

/**
 * 重置数据到默认状态
 */
export async function resetPlantings(): Promise<void> {
  try {
    await apiClient.post('/plantings/reset');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
  }
  return localService.resetPlantings();
}
