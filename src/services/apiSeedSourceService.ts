/**
 * 种源数据 API 服务
 * 对接后端 /api/seed-sources
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API 直连（无离线队列）
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
  } else if (item.status === 'active') {
    status = StockStatus.ACTIVE;
  }
  // 未知值（如旧数据 'inactive'）默认 SUFFICIENT

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
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 *
 * 注意：前端使用 camelCase，后端期望 snake_case，需要转换
 */
export async function addSeedSource(source: Omit<SeedSource, 'id' | 'createTime' | 'updateTime'>): Promise<SeedSource> {
  // 转换为后端期望的 snake_case 格式
  const backendData = {
    source_code: source.seedCode,
    source_name: source.seedCode,  // 修复 P3 #20: source_name 应该是种源批号，而非供应商名
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
    // P0 #1: 传递 pictures 字段（后端 JSON 字符串）
    pictures: JSON.stringify(source.pictures || []),
  };

  const result = await enhancedApiClient.post<{ id: string; create_time?: string; update_time?: string }>('/seed-sources', backendData);
  return {
    ...source,
    id: result.id,
    createTime: result.create_time || '',
    updateTime: result.update_time || '',
  } as SeedSource;
}

/**
 * 更新种源
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
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
  // P0 #1: 传递 pictures 字段
  if (updates.pictures !== undefined) backendUpdates.pictures = JSON.stringify(updates.pictures);

  const result = await enhancedApiClient.put<{ id: string; update_time?: string }>(`/seed-sources/${id}`, backendUpdates);
  return result ? { ...updates, id, updateTime: result.update_time || '' } as SeedSource : null;
}

/**
 * 删除种源
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function deleteSeedSource(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/seed-sources/${id}`);
  return true;
}

/**
 * 批量删除种源
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function deleteSeedSources(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/seed-sources/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 减少可用数量
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
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
 * P0 #2 修复: 前端 camelCase → 后端 snake_case 转换，避免扩展字段全部丢失
 */
export async function addPropagationRecord(seedSourceId: string, data: Partial<PropagationRecord>): Promise<PropagationRecord> {
  // 字段映射：camelCase → snake_case
  const backendData = {
    seed_source_id: seedSourceId,  // URL 已有，但后端 service 也会从 data 里读
    record_date: data.recordDate || new Date().toISOString(),
    stage: data.stage || '',
    temperature: data.temperature ?? null,
    humidity: data.humidity ?? null,
    abnormality: data.abnormality || null,
    operator: data.operator || null,
    remarks: data.remarks || null,
    pictures: JSON.stringify(data.pictures || []),
    pollination_type: data.pollinationType || null,
    pollinator_crop: data.pollinatorCrop || null,
    flower_count: data.flowerCount ?? 0,
    fruit_set_count: data.fruitSetCount ?? 0,
    harvest_seed_count: data.harvestSeedCount ?? 0,
    seed_weight: data.seedWeight ?? 0,
    harvest_plant_count: data.harvestPlantCount ?? 0,
    germination_rate: data.germinationRate ?? 0,
    purity: data.purity ?? 0,
    moisture: data.moisture ?? 0,
    survival_rate: data.survivalRate ?? 0,
    rooted_rate: data.rootedRate ?? 0,
    graft_success_rate: data.graftSuccessRate ?? 0,
  };

  const result = await enhancedApiClient.post<any>(
    `/seed-sources/${seedSourceId}/propagation-records`,
    backendData
  );
  // 把后端返回的 snake_case 转回 camelCase 供前端使用
  return {
    id: result.id,
    seedSourceId: result.seed_source_id || seedSourceId,
    recordDate: result.record_date || '',
    stage: result.stage || '',
    temperature: result.temperature,
    humidity: result.humidity,
    abnormality: result.abnormality,
    operator: result.operator,
    remarks: result.remarks,
    pictures: typeof result.pictures === 'string' ? JSON.parse(result.pictures || '[]') : (result.pictures || []),
    pollinationType: result.pollination_type,
    pollinatorCrop: result.pollinator_crop,
    flowerCount: result.flower_count,
    fruitSetCount: result.fruit_set_count,
    harvestSeedCount: result.harvest_seed_count,
    seedWeight: result.seed_weight,
    harvestPlantCount: result.harvest_plant_count,
    germinationRate: result.germination_rate,
    purity: result.purity,
    moisture: result.moisture,
    survivalRate: result.survival_rate,
    rootedRate: result.rooted_rate,
    graftSuccessRate: result.graft_success_rate,
  };
}

/**
 * 获取繁殖过程记录列表
 * P0 #2 修复: 后端返回 snake_case，需转 camelCase 供前端使用
 */
export async function getPropagationRecords(seedSourceId: string): Promise<PropagationRecord[]> {
  const data = await enhancedApiClient.get<any[]>(
    `/seed-sources/${seedSourceId}/propagation-records`
  );
  return (data || []).map(item => ({
    id: item.id,
    seedSourceId: item.seed_source_id || seedSourceId,
    recordDate: item.record_date || '',
    stage: item.stage || '',
    temperature: item.temperature,
    humidity: item.humidity,
    abnormality: item.abnormality,
    operator: item.operator,
    remarks: item.remarks,
    pictures: typeof item.pictures === 'string' ? JSON.parse(item.pictures || '[]') : (item.pictures || []),
    pollinationType: item.pollination_type,
    pollinatorCrop: item.pollinator_crop,
    flowerCount: item.flower_count,
    fruitSetCount: item.fruit_set_count,
    harvestSeedCount: item.harvest_seed_count,
    seedWeight: item.seed_weight,
    harvestPlantCount: item.harvest_plant_count,
    germinationRate: item.germination_rate,
    purity: item.purity,
    moisture: item.moisture,
    survivalRate: item.survival_rate,
    rootedRate: item.rooted_rate,
    graftSuccessRate: item.graft_success_rate,
  }));
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

// ========== 打印记录 API ==========

/**
 * 打印记录结构
 */
export interface SeedSourcePrintRecord {
  id: string;
  seed_source_id: string;
  print_type: string;
  print_count: number;
  operator: string;
  label_numbers: string[];
  print_time: string;
  create_time: string;
}

/**
 * 获取打印记录
 */
export async function getPrintRecords(seedSourceId: string): Promise<SeedSourcePrintRecord[]> {
  const data = await enhancedApiClient.get<SeedSourcePrintRecord[]>(`/seed-sources/${seedSourceId}/print-records`);
  // 解析 label_numbers JSON 字符串
  return (data || []).map(record => ({
    ...record,
    label_numbers: typeof record.label_numbers === 'string'
      ? JSON.parse(record.label_numbers)
      : record.label_numbers || []
  }));
}

/**
 * 创建打印记录
 */
export async function createPrintRecord(
  seedSourceId: string,
  printType: string,
  printCount: number,
  operator: string,
  labelNumbers?: string[]
): Promise<{ id: string; printCount: number }> {
  const result = await enhancedApiClient.post<{ id: string; printCount: number }>(
    `/seed-sources/${seedSourceId}/print`,
    { printType, printCount, operator, labelNumbers }
  );
  return result;
}

/**
 * 打印标签（便捷函数）
 */
export async function printLabel(
  seedSourceId: string,
  printType: string,
  printCount: number,
  operator: string,
  labelNumbers?: string[]
): Promise<boolean> {
  try {
    await createPrintRecord(seedSourceId, printType, printCount, operator, labelNumbers);
    return true;
  } catch {
    return false;
  }
}
