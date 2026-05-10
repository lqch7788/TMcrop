/**
 * 种植数据 API 服务
 * 对接后端 /api/plantings
 * API失败时降级到 localStorage (plantingService)
 */

import { apiClient } from './apiClient';
import { Planting, PlantingStatus, SourceType } from '../types/crop';
import * as plantingService from './plantingService';

// 后端返回的原始数据字段类型（已经过 queryToObjects 转换为驼峰命名）
interface BackendPlanting {
  id: string;
  plantCode: string;
  sourceType: string;
  sourceId: string;
  sourceCode: string;
  cropCode: string;
  cropName: string;
  cropVariety: string;
  areaId: string;
  areaName: string;
  rootName: string;
  plantingCount: number;
  plantingDate: string;
  soilPH: number;
  soilEC: number;
  transplantCount: number;
  transplantDate: string;
  isHarvest: boolean;
  harvestDate: string;
  attritionRate: number;
  printCount: number;
  traceabilityCode: string;
  pictures: string;
  greenhouseName: string;
  plantedQuantity: number;
  survivalQuantity: number;
  survivalRate: number;
  growthStatus: string;
  expectedHarvestDate: string;
  actualHarvestDate: string;
  harvestQuantity: number;
  status: string;
  remarks: string;
  productionPlanId: string;
  productionPlanCode: string;
  createBy: string;
  createTime: string;
  updateTime: string;
  [key: string]: unknown;
}

/**
 * 将后端返回的字段名映射到前端 Planting 类型
 */
function transformPlantingFromBackend(data: BackendPlanting | BackendPlanting[]): Planting | Planting[] {
  if (Array.isArray(data)) {
    return data.map(item => transformSinglePlanting(item));
  }
  return transformSinglePlanting(data);
}

function transformSinglePlanting(item: BackendPlanting): Planting {
  let pictures: string[] = [];
  if (item.pictures) {
    try {
      pictures = JSON.parse(item.pictures);
    } catch {
      pictures = [];
    }
  }

  let status: PlantingStatus = PlantingStatus.PLANTED;
  if (item.status === 'growing') {
    status = PlantingStatus.GROWING;
  } else if (item.status === 'harvested') {
    status = PlantingStatus.HARVESTED;
  } else if (item.status === 'cancelled') {
    status = PlantingStatus.CANCELLED;
  }

  let sourceType: SourceType = SourceType.SEEDLING;
  if (item.sourceType === 'seed') {
    sourceType = SourceType.SEED;
  } else if (item.sourceType === 'cutting') {
    sourceType = SourceType.CUTTING;
  } else if (item.sourceType === 'grafting') {
    sourceType = SourceType.GRAFTING;
  } else if (item.sourceType === 'tissue_culture') {
    sourceType = SourceType.TISSUE_CULTURE;
  }

  return {
    id: item.id,
    plantCode: item.plantCode || '',
    sourceType: sourceType,
    sourceId: item.sourceId || '',
    sourceCode: item.sourceCode || '',
    cropName: item.cropName || '',
    cropVariety: item.cropVariety || '',
    cropCode: item.cropCode || '',
    areaId: item.areaId || '',
    areaName: item.areaName || '',
    rootName: item.rootName || '',
    plantingCount: item.plantingCount || 0,
    plantingDate: item.plantingDate ? item.plantingDate.split('T')[0] : '',
    soilPH: item.soilPH || 0,
    soilEC: item.soilEC || 0,
    transplantCount: item.transplantCount || 0,
    transplantDate: item.transplantDate || '',
    isHarvest: item.isHarvest || false,
    harvestDate: item.harvestDate || '',
    attritionRate: item.attritionRate || 0,
    printCount: item.printCount || 0,
    traceabilityCode: item.traceabilityCode || '',
    pictures: pictures,
    remarks: item.remarks || '',
    status: status,
    createBy: item.createBy || '',
    createTime: item.createTime ? item.createTime.split('T')[0] : '',
    updateTime: item.updateTime || '',
  };
}

// ==================== API 函数（降级到localStorage）====================

export async function getPlantings(): Promise<Planting[]> {
  try {
    const data = await apiClient.get<BackendPlanting[]>('/plantings');
    return transformPlantingFromBackend(data) as Planting[];
  } catch (error) {
    console.warn('[种植API] 获取失败，降级到localStorage:', error);
    return plantingService.getPlantings();
  }
}

export async function getPlantingById(id: string): Promise<Planting | undefined> {
  try {
    const data = await apiClient.get<BackendPlanting>(`/plantings/${id}`);
    return transformPlantingFromBackend(data) as Planting;
  } catch (error) {
    console.warn('[种植API] 获取单个失败，降级到localStorage:', error);
    return plantingService.getPlantingById(id);
  }
}

export async function getPlantingsByIds(ids: string[]): Promise<Planting[]> {
  try {
    const data = await apiClient.get<BackendPlanting[]>(`/plantings/batch?ids=${ids.join(',')}`);
    return transformPlantingFromBackend(data) as Planting[];
  } catch (error) {
    console.warn('[种植API] 批量获取失败，降级到localStorage:', error);
    return plantingService.getPlantingsByIds(ids);
  }
}

export async function getPlantingsBySourceId(sourceId: string): Promise<Planting[]> {
  try {
    const data = await apiClient.get<BackendPlanting[]>(`/plantings/source/${sourceId}`);
    return transformPlantingFromBackend(data) as Planting[];
  } catch (error) {
    console.warn('[种植API] 按来源获取失败，降级到localStorage:', error);
    return plantingService.getPlantingsBySourceId(sourceId);
  }
}

export async function addPlanting(planting: Omit<Planting, 'id' | 'createTime' | 'updateTime'>): Promise<Planting> {
  try {
    const result = await apiClient.post<{ id: string }>('/plantings', planting);
    return { ...planting, id: result.id } as Planting;
  } catch (error) {
    console.warn('[种植API] 创建失败，降级到localStorage:', error);
    return plantingService.addPlanting(planting);
  }
}

export async function updatePlanting(id: string, updates: Partial<Planting>): Promise<Planting | null> {
  try {
    const result = await apiClient.put<{ id: string }>(`/plantings/${id}`, updates);
    return result ? { ...updates, id } as Planting : null;
  } catch (error) {
    console.warn('[种植API] 更新失败，降级到localStorage:', error);
    return plantingService.updatePlanting(id, updates);
  }
}

export async function deletePlanting(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/plantings/${id}`);
    return true;
  } catch (error) {
    console.warn('[种植API] 删除失败，降级到localStorage:', error);
    return plantingService.deletePlanting(id);
  }
}

export async function deletePlantings(ids: string[]): Promise<boolean> {
  try {
    await apiClient.delete(`/plantings/batch?ids=${ids.join(',')}`);
    return true;
  } catch (error) {
    console.warn('[种植API] 批量删除失败，降级到localStorage:', error);
    return plantingService.deletePlantings(ids);
  }
}

export async function harvestPlanting(id: string, harvestDate: string, harvestCount?: number): Promise<boolean> {
  try {
    await apiClient.post(`/plantings/${id}/harvest`, { harvestDate, harvestCount });
    return true;
  } catch (error) {
    console.warn('[种植API] 采收失败，降级到localStorage:', error);
    return plantingService.harvestPlanting(id, harvestDate, harvestCount);
  }
}

export async function getUnharvestedPlantings(): Promise<Planting[]> {
  try {
    const data = await apiClient.get<BackendPlanting[]>('/plantings/unharvested');
    return transformPlantingFromBackend(data) as Planting[];
  } catch (error) {
    console.warn('[种植API] 获取未采收失败，降级到localStorage:', error);
    return plantingService.getUnharvestedPlantings();
  }
}

export async function getHarvestedPlantings(): Promise<Planting[]> {
  try {
    const data = await apiClient.get<BackendPlanting[]>('/plantings/harvested');
    return transformPlantingFromBackend(data) as Planting[];
  } catch (error) {
    console.warn('[种植API] 获取已采收失败，降级到localStorage:', error);
    return plantingService.getHarvestedPlantings();
  }
}

export async function generatePlantCode(sourceCode: string): Promise<string> {
  return await apiClient.get<string>(`/plantings/generate-code?sourceCode=${sourceCode}`);
}

export async function resetPlantings(): Promise<void> {
  await apiClient.post('/plantings/reset');
}
