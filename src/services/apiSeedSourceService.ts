/**
 * 种源数据 API 服务
 * 对接后端 /api/seed-sources
 * API失败时降级到 localStorage (seedSourceService)
 */

import { apiClient } from './apiClient';
import { SeedSource, SourceType, SourceOrigin, StockStatus } from '../types/crop';
import * as seedSourceService from './seedSourceService';

// 后端返回的原始数据字段类型（已经过 queryToObjects 转换为驼峰命名）
interface BackendSeedSource {
  id: string;
  seedCode: string;
  sourceName: string;
  sourceType: string;
  sourceOrigin: string;
  cropCategory: string;
  typeName: string;
  varietyName: string;
  cropName: string;
  cropVariety: string;
  cropCode: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  availableCount: number;
  initialCount: number;
  pictures: string;
  usedQuantity: number;
  remainingQuantity: number;
  status: string;
  remarks: string;
  productionPlanCode: string;
  printCount: number;
  createBy: string;
  createTime: string;
  updateTime: string;
  [key: string]: unknown;
}

/**
 * 将后端返回的字段名映射到前端 SeedSource 类型
 */
function transformSeedSourceFromBackend(data: BackendSeedSource | BackendSeedSource[]): SeedSource | SeedSource[] {
  if (Array.isArray(data)) {
    return data.map(item => transformSingleSeedSource(item));
  }
  return transformSingleSeedSource(data);
}

function transformSingleSeedSource(item: BackendSeedSource): SeedSource {
  let pictures: string[] = [];
  if (item.pictures) {
    try {
      pictures = JSON.parse(item.pictures);
    } catch {
      pictures = [];
    }
  }

  let sourceType: SourceType = SourceType.SEED;
  if (item.sourceType === 'seedling') {
    sourceType = SourceType.SEEDLING;
  } else if (item.sourceType === 'cutting') {
    sourceType = SourceType.CUTTING;
  } else if (item.sourceType === 'grafting') {
    sourceType = SourceType.GRAFTING;
  } else if (item.sourceType === 'tissue_culture') {
    sourceType = SourceType.TISSUE_CULTURE;
  }

  let status: StockStatus = StockStatus.SUFFICIENT;
  if (item.status === 'low') {
    status = StockStatus.LOW;
  } else if (item.status === 'depleted') {
    status = StockStatus.DEPLETED;
  }

  return {
    id: item.id,
    seedCode: item.seedCode || '',
    sourceType: sourceType,
    sourceOrigin: (item.sourceOrigin as SourceOrigin) || 'external_purchase',
    cropCategory: item.cropCategory || '',
    typeName: item.typeName || '',
    varietyName: item.varietyName || '',
    cropName: item.cropName || '',
    cropVariety: item.cropVariety || '',
    cropCode: item.cropCode || '',
    supplierId: item.supplierId || '',
    supplierName: item.supplierName || '',
    purchaseDate: item.purchaseDate ? item.purchaseDate.split('T')[0] : '',
    quantity: item.quantity || 0,
    unit: item.unit || '',
    unitPrice: item.unitPrice || 0,
    totalAmount: item.totalAmount || 0,
    initialCount: item.initialCount || 0,
    availableCount: item.availableCount || 0,
    pictures: pictures,
    remarks: item.remarks || '',
    status: status,
    printCount: item.printCount || 0,
    createBy: item.createBy || '',
    createTime: item.createTime ? item.createTime.split('T')[0] : '',
    updateTime: item.updateTime || '',
    // 关联生产计划字段
    productionPlanId: (item as any).productionPlanId || '',
    productionPlanCode: item.productionPlanCode || '',
  };
}

// ==================== API 函数（降级到localStorage）====================

export async function getSeedSources(): Promise<SeedSource[]> {
  try {
    const data = await apiClient.get<BackendSeedSource[]>('/seed-sources');
    return transformSeedSourceFromBackend(data) as SeedSource[];
  } catch (error) {
    console.warn('[种源API] 获取失败，降级到localStorage:', error);
    return seedSourceService.getSeedSources();
  }
}

export async function getSeedSourceById(id: string): Promise<SeedSource | undefined> {
  try {
    const data = await apiClient.get<BackendSeedSource>(`/seed-sources/${id}`);
    return transformSeedSourceFromBackend(data) as SeedSource;
  } catch (error) {
    console.warn('[种源API] 获取单个失败，降级到localStorage:', error);
    return seedSourceService.getSeedSourceById(id);
  }
}

export async function getSeedSourcesByIds(ids: string[]): Promise<SeedSource[]> {
  try {
    const data = await apiClient.get<BackendSeedSource[]>(`/seed-sources/batch?ids=${ids.join(',')}`);
    return transformSeedSourceFromBackend(data) as SeedSource[];
  } catch (error) {
    console.warn('[种源API] 批量获取失败，降级到localStorage:', error);
    return seedSourceService.getSeedSourcesByIds(ids);
  }
}

export async function addSeedSource(source: Omit<SeedSource, 'id' | 'createTime' | 'updateTime'>): Promise<SeedSource> {
  try {
    const result = await apiClient.post<{ id: string }>('/seed-sources', source);
    return { ...source, id: result.id } as SeedSource;
  } catch (error) {
    console.warn('[种源API] 创建失败，降级到localStorage:', error);
    return seedSourceService.addSeedSource(source);
  }
}

export async function updateSeedSource(id: string, updates: Partial<SeedSource>): Promise<SeedSource | null> {
  try {
    const result = await apiClient.put<{ id: string }>(`/seed-sources/${id}`, updates);
    return result ? { ...updates, id } as SeedSource : null;
  } catch (error) {
    console.warn('[种源API] 更新失败，降级到localStorage:', error);
    return seedSourceService.updateSeedSource(id, updates);
  }
}

export async function deleteSeedSource(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/seed-sources/${id}`);
    return true;
  } catch (error) {
    console.warn('[种源API] 删除失败，降级到localStorage:', error);
    return seedSourceService.deleteSeedSource(id);
  }
}

export async function deleteSeedSources(ids: string[]): Promise<boolean> {
  try {
    await apiClient.delete(`/seed-sources/batch?ids=${ids.join(',')}`);
    return true;
  } catch (error) {
    console.warn('[种源API] 批量删除失败，降级到localStorage:', error);
    return seedSourceService.deleteSeedSources(ids);
  }
}

export async function decreaseAvailableCount(id: string, count: number): Promise<boolean> {
  try {
    await apiClient.post(`/seed-sources/${id}/decrease-available`, { count });
    return true;
  } catch (error) {
    console.warn('[种源API] 减少可用数量失败，降级到localStorage:', error);
    return seedSourceService.decreaseAvailableCount(id, count);
  }
}

export async function resetSeedSources(): Promise<void> {
  try {
    await apiClient.post('/seed-sources/reset');
  } catch (error) {
    console.warn('[种源API] 重置失败，降级到localStorage:', error);
    seedSourceService.resetSeedSources();
  }
}

export async function getTodayMaxSeedCodeSerial(dateStr: string): Promise<number> {
  try {
    return await apiClient.get<number>(`/seed-sources/max-serial?date=${dateStr}`);
  } catch (error) {
    console.warn('[种源API] 获取最大序号失败，降级到localStorage:', error);
    return seedSourceService.getTodayMaxSeedCodeSerial(dateStr);
  }
}

export async function generateSeedCode(dateStr: string): Promise<string> {
  try {
    return await apiClient.get<string>(`/seed-sources/generate-code?date=${dateStr}`);
  } catch (error) {
    console.warn('[种源API] 生成编码失败，降级到localStorage:', error);
    return seedSourceService.generateSeedCode(dateStr);
  }
}
