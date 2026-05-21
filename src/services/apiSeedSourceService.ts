/**
 * 种源数据 API 服务
 * 对接后端 /api/seed-sources
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { SeedSource, SourceType, SourceOrigin, StockStatus, PropagationType, PropagationStatus, PropagationRecord } from '../types/crop';

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
  // 繁殖途径字段
  propagationType?: string;
  propagationStatus?: string;
  propagationMethod?: string;
  parentMaleId?: string;
  parentMaleCode?: string;
  parentFemaleId?: string;
  parentFemaleCode?: string;
  motherPlantId?: string;
  motherPlantCode?: string;
  linkedPlantingId?: string;
  linkedPlantingCode?: string;
  propagationStartDate?: string;
  expectedHarvestDate?: string;
  actualHarvestDate?: string;
  breedingLocation?: string;
  targetTraits?: string;
  generation?: string;
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
    // 繁殖途径字段
    propagationType: (item.propagationType as PropagationType) || PropagationType.EXTERNAL,
    propagationStatus: (item.propagationStatus as PropagationStatus) || undefined,
    propagationMethod: item.propagationMethod || undefined,
    parentMaleId: item.parentMaleId || undefined,
    parentMaleCode: item.parentMaleCode || undefined,
    parentFemaleId: item.parentFemaleId || undefined,
    parentFemaleCode: item.parentFemaleCode || undefined,
    motherPlantId: item.motherPlantId || undefined,
    motherPlantCode: item.motherPlantCode || undefined,
    linkedPlantingId: item.linkedPlantingId || undefined,
    linkedPlantingCode: item.linkedPlantingCode || undefined,
    propagationStartDate: item.propagationStartDate || undefined,
    expectedHarvestDate: item.expectedHarvestDate || undefined,
    actualHarvestDate: item.actualHarvestDate || undefined,
    breedingLocation: item.breedingLocation || undefined,
    targetTraits: item.targetTraits || undefined,
    generation: item.generation || undefined,
  };
}

/**
 * 获取所有种源
 * 降级策略：API → IndexedDB 缓存
 */
export async function getSeedSources(): Promise<SeedSource[]> {
  const data = await enhancedApiClient.get<BackendSeedSource[]>('/seed-sources');
  return transformSeedSourceFromBackend(data) as SeedSource[];
}

/**
 * 根据ID获取单个种源
 * 降级策略：API → IndexedDB 缓存
 */
export async function getSeedSourceById(id: string): Promise<SeedSource | undefined> {
  const data = await enhancedApiClient.get<BackendSeedSource>(`/seed-sources/${id}`);
  return transformSeedSourceFromBackend(data) as SeedSource;
}

/**
 * 根据ID数组获取多个种源
 * 降级策略：API → IndexedDB 缓存
 */
export async function getSeedSourcesByIds(ids: string[]): Promise<SeedSource[]> {
  const data = await enhancedApiClient.get<BackendSeedSource[]>(`/seed-sources/batch?ids=${ids.join(',')}`);
  return transformSeedSourceFromBackend(data) as SeedSource[];
}

/**
 * 创建种源
 * 降级策略：API → 离线队列
 *
 * 注意：前端使用 camelCase，后端期望 snake_case，需要转换
 */
export async function addSeedSource(source: Omit<SeedSource, 'id' | 'createTime' | 'updateTime'>): Promise<SeedSource> {
  // 转换为后端期望的 snake_case 格式
  const backendData = {
    source_code: source.seedCode,
    source_name: source.supplierName,
    source_type: source.sourceType,
    source_origin: source.sourceOrigin,
    production_plan_code: source.productionPlanCode || '',
    crop_category: source.cropCategory,
    type_name: source.typeName,
    variety_name: source.varietyName,
    crop_name: source.cropName,
    crop_variety: source.cropVariety,
    crop_code: source.cropCode,
    supplier_id: source.supplierId,
    supplier_name: source.supplierName,
    purchase_date: source.purchaseDate,
    quantity: source.quantity,
    unit: source.unit,
    purchase_price: source.unitPrice,
    total_amount: source.totalAmount,
    remaining_quantity: source.quantity,
    used_quantity: source.usedQuantity || 0,
    status: source.status,
    remarks: source.remarks || '',
    create_by: source.createBy,
  };

  const result = await enhancedApiClient.post<{ id: string }>('/seed-sources', backendData);
  return { ...source, id: result.id } as SeedSource;
}

/**
 * 更新种源
 * 降级策略：API → 离线队列
 */
export async function updateSeedSource(id: string, updates: Partial<SeedSource>): Promise<SeedSource | null> {
  // 转换为后端期望的 snake_case 格式
  const backendUpdates: Record<string, any> = {};

  if (updates.seedCode !== undefined) backendUpdates.source_code = updates.seedCode;
  if (updates.supplierName !== undefined) backendUpdates.supplier_name = updates.supplierName;
  if (updates.sourceType !== undefined) backendUpdates.source_type = updates.sourceType;
  if (updates.sourceOrigin !== undefined) backendUpdates.source_origin = updates.sourceOrigin;
  if (updates.productionPlanCode !== undefined) backendUpdates.production_plan_code = updates.productionPlanCode;
  if (updates.cropCategory !== undefined) backendUpdates.crop_category = updates.cropCategory;
  if (updates.typeName !== undefined) backendUpdates.type_name = updates.typeName;
  if (updates.varietyName !== undefined) backendUpdates.variety_name = updates.varietyName;
  if (updates.cropName !== undefined) backendUpdates.crop_name = updates.cropName;
  if (updates.cropVariety !== undefined) backendUpdates.crop_variety = updates.cropVariety;
  if (updates.cropCode !== undefined) backendUpdates.crop_code = updates.cropCode;
  if (updates.supplierId !== undefined) backendUpdates.supplier_id = updates.supplierId;
  if (updates.purchaseDate !== undefined) backendUpdates.purchase_date = updates.purchaseDate;
  if (updates.quantity !== undefined) backendUpdates.quantity = updates.quantity;
  if (updates.unit !== undefined) backendUpdates.unit = updates.unit;
  if (updates.unitPrice !== undefined) backendUpdates.purchase_price = updates.unitPrice;
  if (updates.totalAmount !== undefined) backendUpdates.total_amount = updates.totalAmount;
  if (updates.availableCount !== undefined) backendUpdates.remaining_quantity = updates.availableCount;
  if (updates.status !== undefined) backendUpdates.status = updates.status;
  if (updates.remarks !== undefined) backendUpdates.remarks = updates.remarks;

  const result = await enhancedApiClient.put<{ id: string }>(`/seed-sources/${id}`, backendUpdates);
  return result ? { ...updates, id } as SeedSource : null;
}

/**
 * 删除种源
 * 降级策略：API → 离线队列
 */
export async function deleteSeedSource(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/seed-sources/${id}`);
  return true;
}

/**
 * 批量删除种源
 * 降级策略：API → 离线队列
 */
export async function deleteSeedSources(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/seed-sources/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 减少可用数量
 * 降级策略：API → 离线队列
 */
export async function decreaseAvailableCount(id: string, count: number): Promise<boolean> {
  await enhancedApiClient.post(`/seed-sources/${id}/decrease-available`, { count });
  return true;
}

/**
 * 重置种源数据（仅调用后端）
 */
export async function resetSeedSources(): Promise<void> {
  await enhancedApiClient.post('/seed-sources/reset');
}

/**
 * 获取当日最大序号
 * 降级策略：API → 失败返回0
 */
export async function getTodayMaxSeedCodeSerial(dateStr: string): Promise<number> {
  try {
    return await enhancedApiClient.get<number>(`/seed-sources/max-serial?date=${dateStr}`);
  } catch {
    return 0;
  }
}

/**
 * 生成种源编码
 * 降级策略：API → 失败返回空字符串
 */
export async function generateSeedCode(dateStr: string): Promise<string> {
  try {
    return await enhancedApiClient.get<string>(`/seed-sources/generate-code?date=${dateStr}`);
  } catch {
    return '';
  }
}

// ========== 繁殖过程记录 API ==========

/**
 * 添加繁殖过程记录
 */
export async function addPropagationRecord(seedSourceId: string, data: Partial<PropagationRecord>): Promise<PropagationRecord> {
  const result = await enhancedApiClient.post<PropagationRecord>(
    `/seed-sources/${seedSourceId}/propagation-records`,
    data
  );
  return result;
}

/**
 * 获取繁殖过程记录列表
 */
export async function getPropagationRecords(seedSourceId: string): Promise<PropagationRecord[]> {
  const data = await enhancedApiClient.get<PropagationRecord[]>(
    `/seed-sources/${seedSourceId}/propagation-records`
  );
  return data;
}

/**
 * 推进繁殖阶段
 */
export async function updatePropagationStage(seedSourceId: string, newStage: string): Promise<{ id: string; new_stage: string }> {
  const result = await enhancedApiClient.put<{ id: string; new_stage: string }>(
    `/seed-sources/${seedSourceId}/propagation-stage`,
    { new_stage: newStage }
  );
  return result;
}

/**
 * 完成繁殖入库
 */
export async function completePropagation(seedSourceId: string, quantity: number): Promise<{ id: string; quantity: number }> {
  const result = await enhancedApiClient.post<{ id: string; quantity: number }>(
    `/seed-sources/${seedSourceId}/complete-propagation`,
    { quantity }
  );
  return result;
}

/**
 * 获取可用于留种的种植记录
 */
export async function getPlantingsForSeedSaving(): Promise<any[]> {
  const data = await enhancedApiClient.get<any[]>('/seed-sources/available-for-seed-saving');
  return data;
}
