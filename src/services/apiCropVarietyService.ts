/**
 * 作物品种 API 服务
 * 对接后端 /api/crop-varieties
 */

import { apiClient, USE_API } from './apiClient';
import { CropVariety } from '../types/crop';

// 导入本地服务作为回退
import * as localService from './cropVarietyService';

/**
 * 获取所有作物品种
 */
export async function getAllVarieties(): Promise<CropVariety[]> {
  if (USE_API) {
    return apiClient.get<CropVariety[]>('/crop-varieties');
  }
  // 回退到本地服务
  return localService.getAllVarieties();
}

/**
 * 根据ID获取单个品种
 */
export async function getVarietyById(id: string): Promise<CropVariety | undefined> {
  if (USE_API) {
    return apiClient.get<CropVariety>(`/crop-varieties/${id}`);
  }
  return localService.getVarietyById(id);
}

/**
 * 创建品种
 */
export async function createVariety(data: Partial<CropVariety>): Promise<string> {
  if (USE_API) {
    const result = await apiClient.post<{ id: string }>('/crop-varieties', data);
    return result.id;
  }
  return localService.createVariety(data);
}

/**
 * 更新品种
 */
export async function updateVariety(id: string, data: Partial<CropVariety>): Promise<string | null> {
  if (USE_API) {
    const result = await apiClient.put<{ id: string }>(`/crop-varieties/${id}`, data);
    return result.id;
  }
  return localService.updateVariety(id, data);
}

/**
 * 删除品种
 */
export async function deleteVariety(id: string): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/crop-varieties/${id}`);
    return true;
  }
  return localService.deleteVariety(id);
}

/**
 * 根据作物名称查找品种
 */
export async function findByCropName(cropName: string): Promise<CropVariety[]> {
  if (USE_API) {
    const all = await getAllVarieties();
    return all.filter(v => v.variety_name?.includes(cropName) || v.type_name?.includes(cropName));
  }
  return localService.findByCropName(cropName);
}
