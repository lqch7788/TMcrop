/**
 * 种植数据 API 服务
 * 对接后端 /api/plantings
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
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
 * 降级策略：API → IndexedDB 缓存
 */
export async function getPlantings(): Promise<Planting[]> {
  const data = await enhancedApiClient.get<BackendPlanting[]>('/plantings');
  return transformPlantingFromBackend(data) as Planting[];
}

/**
 * 根据ID获取单个种植记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getPlantingById(id: string): Promise<Planting | undefined> {
  const data = await enhancedApiClient.get<BackendPlanting>(`/plantings/${id}`);
  return transformPlantingFromBackend(data) as Planting;
}

/**
 * 根据ID数组获取多个种植记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getPlantingsByIds(ids: string[]): Promise<Planting[]> {
  const data = await enhancedApiClient.get<BackendPlanting[]>(`/plantings/batch?ids=${ids.join(',')}`);
  return transformPlantingFromBackend(data) as Planting[];
}

/**
 * 根据来源获取种植记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getPlantingsBySourceId(sourceId: string): Promise<Planting[]> {
  const data = await enhancedApiClient.get<BackendPlanting[]>(`/plantings/source/${sourceId}`);
  return transformPlantingFromBackend(data) as Planting[];
}

/**
 * 创建种植记录
 * 降级策略：API → 离线队列
 */
export async function addPlanting(planting: Omit<Planting, 'id' | 'createTime' | 'updateTime'>): Promise<Planting> {
  const result = await enhancedApiClient.post<{ id: string }>('/plantings', planting);
  return { ...planting, id: result.id } as Planting;
}

/**
 * 更新种植记录
 * 降级策略：API → 离线队列
 */
export async function updatePlanting(id: string, updates: Partial<Planting>): Promise<Planting | null> {
  const result = await enhancedApiClient.put<{ id: string }>(`/plantings/${id}`, updates);
  return result ? { ...updates, id } as Planting : null;
}

/**
 * 删除种植记录
 * 降级策略：API → 离线队列
 */
export async function deletePlanting(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/plantings/${id}`);
  return true;
}

/**
 * 批量删除种植记录
 * 降级策略：API → 离线队列
 */
export async function deletePlantings(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/plantings/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 采收种植记录
 * 降级策略：API → 离线队列
 */
export async function harvestPlanting(id: string, harvestDate: string, harvestCount?: number): Promise<boolean> {
  await enhancedApiClient.post(`/plantings/${id}/harvest`, { harvestDate, harvestCount });
  return true;
}

/**
 * 获取未采收的种植记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getUnharvestedPlantings(): Promise<Planting[]> {
  const data = await enhancedApiClient.get<BackendPlanting[]>('/plantings/unharvested');
  return transformPlantingFromBackend(data) as Planting[];
}

/**
 * 获取已采收的种植记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getHarvestedPlantings(): Promise<Planting[]> {
  const data = await enhancedApiClient.get<BackendPlanting[]>('/plantings/harvested');
  return transformPlantingFromBackend(data) as Planting[];
}

/**
 * 生成种植单号
 * 降级策略：API 失败返回空字符串
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
