/**
 * 种植数据 API 服务
 * 对接后端 /api/plantings
 *
 * 数据流：API → enhancedApiClient → SQLite DB
 */

import { enhancedApiClient } from '../lib/apiClient';
import { Planting, PlantingStatus, SourceType } from '../types/crop';

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
    productionPlanId: item.productionPlanId || '',
    productionPlanCode: item.productionPlanCode || '',
    createBy: item.createBy || '',
    createTime: item.createTime ? item.createTime.split('T')[0] : '',
    updateTime: item.updateTime || '',
  };
}

/**
 * 获取所有种植记录
 * 数据流：API → SQLite DB
 */
export async function getPlantings(): Promise<Planting[]> {
  const data = await enhancedApiClient.get<BackendPlanting[]>('/plantings');
  return transformPlantingFromBackend(data) as Planting[];
}

/**
 * 根据ID获取单个种植记录
 * 数据流：API → SQLite DB
 */
export async function getPlantingById(id: string): Promise<Planting | undefined> {
  const data = await enhancedApiClient.get<BackendPlanting>(`/plantings/${id}`);
  return transformPlantingFromBackend(data) as Planting;
}

/**
 * 根据ID数组获取多个种植记录
 * 数据流：API → SQLite DB
 */
export async function getPlantingsByIds(ids: string[]): Promise<Planting[]> {
  const data = await enhancedApiClient.get<BackendPlanting[]>(`/plantings/batch?ids=${ids.join(',')}`);
  return transformPlantingFromBackend(data) as Planting[];
}

/**
 * 根据来源获取种植记录
 * 数据流：API → SQLite DB
 */
export async function getPlantingsBySourceId(sourceId: string): Promise<Planting[]> {
  const data = await enhancedApiClient.get<BackendPlanting[]>(`/plantings/source/${sourceId}`);
  return transformPlantingFromBackend(data) as Planting[];
}

/**
 * 创建种植记录
 * 数据流：API → SQLite DB
 */
export async function addPlanting(planting: Omit<Planting, 'id' | 'createTime' | 'updateTime'>): Promise<Planting> {
  const result = await enhancedApiClient.post<{ id: string }>('/plantings', planting);
  return { ...planting, id: result.id } as Planting;
}

/**
 * 更新种植记录
 * 数据流：API → SQLite DB
 */
export async function updatePlanting(id: string, updates: Partial<Planting>): Promise<Planting | null> {
  // 2026-06-05: 强结分支写入 end_type/end_time（后端 PUT 用 Object.keys 原样拼字段，需 snake_case）
  const backendUpdates: Record<string, any> = { ...updates };
  if (updates.endType !== undefined) {
    backendUpdates.end_type = updates.endType;
    delete backendUpdates.endType;
  }
  if (updates.endTime !== undefined) {
    backendUpdates.end_time = updates.endTime;
    delete backendUpdates.endTime;
  }
  const result = await enhancedApiClient.put<{ id: string }>(`/plantings/${id}`, backendUpdates);
  return result ? { ...updates, id } as Planting : null;
}

/**
 * 删除种植记录
 * 数据流：API → SQLite DB
 */
export async function deletePlanting(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/plantings/${id}`);
  return true;
}

/**
 * 批量删除种植记录
 * 数据流：API → SQLite DB
 */
export async function deletePlantings(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/plantings/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 采收种植记录
 * 数据流：API → SQLite DB
 *
 * 2026-06-06: 修复 ZP-2 数据静默丢失 bug
 * 后端 POST /:id/harvest 路由解构 `harvest_quantity, harvest_date` (snake_case)
 * 之前 payload 用 camelCase 导致后端读到 undefined, harvest_quantity 永远为 0
 * 这里把 UI 字段（camelCase 入参）翻译成后端期望的 snake_case
 */
export async function harvestPlanting(id: string, harvestDate: string, harvestCount?: number): Promise<boolean> {
  await enhancedApiClient.post(`/plantings/${id}/harvest`, {
    harvest_date: harvestDate,
    harvest_quantity: harvestCount,
  });
  return true;
}

/**
 * 获取未采收的种植记录
 * 数据流：API → SQLite DB
 */
export async function getUnharvestedPlantings(): Promise<Planting[]> {
  const data = await enhancedApiClient.get<BackendPlanting[]>('/plantings/unharvested');
  return transformPlantingFromBackend(data) as Planting[];
}

/**
 * 获取已采收的种植记录
 * 数据流：API → SQLite DB
 */
export async function getHarvestedPlantings(): Promise<Planting[]> {
  const data = await enhancedApiClient.get<BackendPlanting[]>('/plantings/harvested');
  return transformPlantingFromBackend(data) as Planting[];
}

/**
 * 生成种植单号
 * 数据流：API → SQLite DB
 */
export async function generatePlantCode(sourceCode: string): Promise<string> {
  try {
    return await enhancedApiClient.get<string>(`/plantings/generate-code?sourceCode=${sourceCode}`);
  } catch {
    return '';
  }
}

/**
 * 重置种植数据（仅调用后端）
 */
export async function resetPlantings(): Promise<void> {
  await enhancedApiClient.post('/plantings/reset');
}
