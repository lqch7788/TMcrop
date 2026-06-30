/**
 * 种源数据 API 服务
 * 对接后端 /api/seed-sources
 *
 * 数据流：API → enhancedApiClient → 组件（无缓存层，V2.1 铁律）
 *
 * 降级策略：
 * - GET 请求：API 直连（V2.1 铁律：无缓存降级）
 * - POST/PUT/DELETE：API 直连（无离线队列）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { SeedSource, SourceType, SourceOrigin, PropagationType, PropagationStatus, PropagationRecord } from '../types/crop';

/**
 * 2026-06-06: 集中维护 camelCase → snake_case 字段映射表。
 * 避免 addSeedSource / updateSeedSource 漂移（之前散落在两个函数里，遗漏字段会导致后端写入失败）。
 */
const CAMEL_TO_SNAKE_MAP: Record<string, string> = {
  seedCode: 'source_code',
  sourceType: 'source_type',
  sourceOrigin: 'source_origin',
  productionPlanId: 'production_plan_id',
  productionPlanCode: 'production_plan_code',
  cropCategory: 'crop_category',
  typeName: 'type_name',
  varietyName: 'variety_name',
  cropName: 'crop_name',
  cropVariety: 'crop_variety',
  cropCode: 'crop_code',
  supplierId: 'supplier_id',
  supplierName: 'supplier_name',
  purchaseDate: 'purchase_date',
  // 2026-06-19: 修正字段映射
  // 前端 initialCount → 后端 initial_count（创建时填的采购/预估数量，固定值）
  // 前端 availableCount → 后端 remaining_quantity（当前可用，可能被扣减/累加）
  // 前端 quantity 保留 → 后端 quantity（入库累计总量 = initial + 累加入库）
  initialCount: 'initial_count',
  availableCount: 'remaining_quantity',
  quantity: 'quantity',
  unit: 'unit',
  unitPrice: 'purchase_price',
  totalAmount: 'total_amount',
  usedQuantity: 'used_quantity',
  remarks: 'remarks',
  createBy: 'create_by',
  // 繁殖字段
  propagationType: 'propagation_type',
  propagationStatus: 'propagation_status',
  propagationMethod: 'propagation_method',
  parentMaleId: 'parent_male_id',
  parentMaleCode: 'parent_male_code',
  parentFemaleId: 'parent_female_id',
  parentFemaleCode: 'parent_female_code',
  motherPlantId: 'mother_plant_id',
  motherPlantCode: 'mother_plant_code',
  linkedPlantingId: 'linked_planting_id',
  linkedPlantingCode: 'linked_planting_code',
  propagationStartDate: 'propagation_start_date',
  expectedHarvestDate: 'expected_harvest_date',
  actualHarvestDate: 'actual_harvest_date',
  breedingLocation: 'breeding_location',
  targetTraits: 'target_traits',
  generation: 'generation',
  // 结束标记
  endType: 'end_type',
  endTime: 'end_time',
  // 打印统计
  printCount: 'print_count',
};

/**
 * 2026-06-06: 通用转换 — 给定部分 SeedSource，返回 snake_case 的后端 payload。
 * 未知字段（不在 CAMEL_TO_SNAKE_MAP）原样保留，方便新增字段不用两边都改。
 */
function toBackendPayload(updates: Partial<SeedSource>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(updates) as (keyof SeedSource)[]) {
    if (updates[key] === undefined) continue;
    const mapped = CAMEL_TO_SNAKE_MAP[key as string] ?? key;
    if (mapped === 'pictures') {
      result[mapped] = JSON.stringify(updates[key] ?? []);
    } else {
      result[mapped] = updates[key];
    }
  }
  // pictures 特殊处理：上面映射到的 key 是 'pictures'，但 CAMEL_TO_SNAKE_MAP 没收录，统一处理
  if (result.pictures === undefined && updates.pictures !== undefined) {
    result.pictures = JSON.stringify(updates.pictures ?? []);
  }
  return result;
}

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
  // 2026-06-29: 种植自留种回流时的采收形态
  seedForm?: string;
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
  // 结束标记（2026-06-05：强结分支写入）
  endType?: string;
  endTime?: string;
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
  } else if (item.sourceType === 'split') {
    sourceType = SourceType.SPLIT;
  } else if (item.sourceType === 'bulb') {
    sourceType = SourceType.BULB;
  } else if (item.sourceType === 'other') {
    sourceType = SourceType.OTHER;
  }

  // 2026-06-04: status 改为实时计算，后端不再返回此字段，转换时不再读 item.status
  // UI 渲染处统一用 computeStockStatus(item.availableCount, item.initialCount)

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
    // 2026-06-19: 兼容两种来源 — list API 用 alias availableCount，findById 用 SELECT * 然后 mapRowToCamel 得 remainingQuantity
    availableCount: (item as any).availableCount ?? (item as any).remainingQuantity ?? 0,
    pictures: pictures,
    remarks: item.remarks || '',
    // status 字段已废弃（2026-06-04 改为实时计算），不再写入前端 SeedSource 对象
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
    // 2026-06-29: 种植自留种回流时的采收形态（如"枝条"/"种子"/"果实"等）
    seedForm: item.seedForm || undefined,
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
    // 结束标记（2026-06-05：强结分支读取）
    endType: (item.endType as 'normal' | 'abnormal') || undefined,
    endTime: item.endTime || undefined,
  };
}

/**
 * 获取所有种源
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getSeedSources(): Promise<SeedSource[]> {
  const data = await enhancedApiClient.get<BackendSeedSource[]>('/seed-sources');
  return transformSeedSourceFromBackend(data) as SeedSource[];
}

/**
 * 多字段模糊搜索种源（2026-06-25: 前端 combogrid 用）
 * 搜索范围：种源批号 / 作物名称 / 作物编号 / 作物品种
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function searchSeedSources(keyword: string): Promise<SeedSource[]> {
  if (!keyword || !keyword.trim()) {
    return getSeedSources();
  }
  const data = await enhancedApiClient.get<BackendSeedSource[]>(
    `/seed-sources?keyword=${encodeURIComponent(keyword.trim())}`
  );
  return transformSeedSourceFromBackend(data) as SeedSource[];
}

/**
 * 根据ID获取单个种源
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getSeedSourceById(id: string): Promise<SeedSource | undefined> {
  const data = await enhancedApiClient.get<BackendSeedSource>(`/seed-sources/${id}`);
  return transformSeedSourceFromBackend(data) as SeedSource;
}

/**
 * 根据ID数组获取多个种源
 * 网络策略：API 直连（V2.1 铁律：无缓存）
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
  // 2026-06-06: R1 — 消除 source_name 硬编码，从 toBackendPayload 派生 source_code
  // source_name 与 source_code 语义一致（都是种源批号），统一从映射结果取值
  const basePayload = toBackendPayload(source);
  const backendData: Record<string, unknown> = {
    ...basePayload,
    source_name: basePayload.source_code,
    // remaining_quantity 默认等于 quantity（新种源初始可用 = 采购数量）
    remaining_quantity: source.quantity,
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
  // 2026-06-06: 改用统一映射表 toBackendPayload，消除白名单漂移（HIGH #1）
  const backendUpdates = toBackendPayload(updates);

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
 * 2026-06-06: 检查种源是否可删除（是否被关联记录引用）
 * CRITICAL #2: 从组件上移到 Store（避免组件直调 enhancedApiClient 绕开数据流铁律）
 */
export interface DeletableReference {
  module: string;
  moduleCode: string;
  id: string;
  code: string;
  cropName?: string;
  cropVariety?: string;
  date?: string;
  status?: string;
  // 2026-06-19: 回流记录追溯链 — 关联的种植/育苗/采收 ID + code，便于用户跳转定位
  targetModule?: string;
  targetId?: string;
  targetCode?: string;
}

export interface CheckDeletableResult {
  deletable: boolean;
  references: DeletableReference[];
}

export async function checkSeedSourceDeletable(id: string): Promise<CheckDeletableResult> {
  const res = await enhancedApiClient.get<CheckDeletableResult>(`/seed-sources/${id}/check-deletable`);
  return {
    deletable: !!res?.deletable,
    references: res?.references || [],
  };
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
 * 错误直接抛给上层（V2.1 铁律：禁止吞错返回默认值）
 */
export async function getTodayMaxSeedCodeSerial(dateStr: string): Promise<number> {
  return await enhancedApiClient.get<number>(`/seed-sources/max-serial?date=${dateStr}`);
}

/**
 * 生成种源编码
 * 错误直接抛给上层（V2.1 铁律：禁止吞错返回默认值）
 */
export async function generateSeedCode(dateStr: string): Promise<string> {
  return await enhancedApiClient.get<string>(`/seed-sources/generate-code?date=${dateStr}`);
}

/**
 * 检查种源批号是否已存在（POST 前实时查重，避开 UNIQUE 异常）
 * 2026-06-26: 三层防重的第一层 — 前端用，POST 前先调
 * @param code 种源批号
 * @param excludeId 编辑时排除自身 ID
 * @returns true=已存在（不可用），false=可用
 */
export async function checkSourceCodeExists(code: string, excludeId?: string): Promise<boolean> {
  if (!code || !code.trim()) return false; // 空值不算"已存在"，由 service.create 拒绝
  const params = new URLSearchParams({ code: code.trim() });
  if (excludeId) params.set('excludeId', excludeId);
  const result = await enhancedApiClient.get<{ exists: boolean; code: string }>(
    `/seed-sources/check-source-code?${params.toString()}`
  );
  return !!result?.exists;
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
  return (data || []).map(item => transformPropagationRecordFromBackend(item, seedSourceId));
}

/**
 * 2026-06-13: 与育苗每日记录对齐，操作列支持内联编辑
 * 后端 PUT 返回完整 snake_case 记录，需转 camelCase
 * 注：与 addPropagationRecord 保持一致，PUT body 用 snake_case 字段名
 */
export async function updatePropagationRecord(
  seedSourceId: string,
  recordId: string,
  updates: Partial<PropagationRecord>
): Promise<PropagationRecord> {
  // camelCase → snake_case，与 addPropagationRecord 一致
  const backendUpdates: Record<string, any> = {};
  if (updates.recordDate !== undefined) backendUpdates.record_date = updates.recordDate;
  if (updates.stage !== undefined) backendUpdates.stage = updates.stage;
  if (updates.temperature !== undefined) backendUpdates.temperature = updates.temperature;
  if (updates.humidity !== undefined) backendUpdates.humidity = updates.humidity;
  if (updates.abnormality !== undefined) backendUpdates.abnormality = updates.abnormality;
  if (updates.operator !== undefined) backendUpdates.operator = updates.operator;
  if (updates.remarks !== undefined) backendUpdates.remarks = updates.remarks;
  if (updates.pictures !== undefined) backendUpdates.pictures = updates.pictures;
  if (updates.pollinationType !== undefined) backendUpdates.pollination_type = updates.pollinationType;
  if (updates.pollinatorCrop !== undefined) backendUpdates.pollinator_crop = updates.pollinatorCrop;
  if (updates.flowerCount !== undefined) backendUpdates.flower_count = updates.flowerCount;
  if (updates.fruitSetCount !== undefined) backendUpdates.fruit_set_count = updates.fruitSetCount;
  if (updates.harvestSeedCount !== undefined) backendUpdates.harvest_seed_count = updates.harvestSeedCount;
  if (updates.seedWeight !== undefined) backendUpdates.seed_weight = updates.seedWeight;
  if (updates.harvestPlantCount !== undefined) backendUpdates.harvest_plant_count = updates.harvestPlantCount;
  if (updates.germinationRate !== undefined) backendUpdates.germination_rate = updates.germinationRate;
  if (updates.purity !== undefined) backendUpdates.purity = updates.purity;
  if (updates.moisture !== undefined) backendUpdates.moisture = updates.moisture;
  if (updates.survivalRate !== undefined) backendUpdates.survival_rate = updates.survivalRate;
  if (updates.rootedRate !== undefined) backendUpdates.rooted_rate = updates.rootedRate;
  if (updates.graftSuccessRate !== undefined) backendUpdates.graft_success_rate = updates.graftSuccessRate;

  const result = await enhancedApiClient.put<any>(
    `/seed-sources/${seedSourceId}/propagation-records/${recordId}`,
    backendUpdates
  );
  return transformPropagationRecordFromBackend(result, seedSourceId);
}

/**
 * 2026-06-13: 与育苗每日记录对齐，操作列支持删除
 */
export async function deletePropagationRecord(
  seedSourceId: string,
  recordId: string
): Promise<boolean> {
  await enhancedApiClient.delete(
    `/seed-sources/${seedSourceId}/propagation-records/${recordId}`
  );
  return true;
}

/**
 * 内部工具：后端 snake_case → 前端 camelCase 转换（统一 GET/PUT 返回使用）
 */
function transformPropagationRecordFromBackend(item: any, fallbackSeedSourceId: string): PropagationRecord {
  return {
    id: item.id,
    seedSourceId: item.seed_source_id || item.seedSourceId || fallbackSeedSourceId,
    recordDate: item.record_date || item.recordDate || '',
    stage: item.stage || '',
    temperature: item.temperature,
    humidity: item.humidity,
    abnormality: item.abnormality,
    operator: item.operator,
    remarks: item.remarks,
    pictures: typeof item.pictures === 'string' ? JSON.parse(item.pictures || '[]') : (item.pictures || []),
    pollinationType: item.pollination_type ?? item.pollinationType,
    pollinatorCrop: item.pollinator_crop ?? item.pollinatorCrop,
    flowerCount: item.flower_count ?? item.flowerCount,
    fruitSetCount: item.fruit_set_count ?? item.fruitSetCount,
    harvestSeedCount: item.harvest_seed_count ?? item.harvestSeedCount,
    seedWeight: item.seed_weight ?? item.seedWeight,
    harvestPlantCount: item.harvest_plant_count ?? item.harvestPlantCount,
    germinationRate: item.germination_rate ?? item.germinationRate,
    purity: item.purity,
    moisture: item.moisture,
    survivalRate: item.survival_rate ?? item.survivalRate,
    rootedRate: item.rooted_rate ?? item.rootedRate,
    graftSuccessRate: item.graft_success_rate ?? item.graftSuccessRate,
  };
}

/**
 * 扩展的繁殖过程记录（含 JOIN 种源基础信息）
 */
export interface PropagationRecordWithSource {
  id: string;
  seedSourceId: string;
  seedCode: string;          // JOIN 自 seed_sources
  cropName: string;          // JOIN
  cropVariety: string;       // JOIN
  propagationType: string;   // JOIN
  recordDate: string;
  stage: string;
  temperature: number | null;
  humidity: number | null;
  abnormality: string | null;
  operator: string | null;
  remarks: string | null;
  pollinationType: string | null;
  pollinatorCrop: string | null;
  flowerCount: number | null;
  fruitSetCount: number | null;
  harvestSeedCount: number | null;
  seedWeight: number | null;
  harvestPlantCount: number | null;
  germinationRate: number | null;
  purity: number | null;
  moisture: number | null;
  survivalRate: number | null;
  rootedRate: number | null;
  graftSuccessRate: number | null;
  createTime: string;
  updateTime: string;
}

/**
 * 全量查询繁殖过程记录（JOIN seed_sources）
 * 用于"繁殖过程记录"全量查看页
 */
export interface PropagationRecordQueryParams {
  seedSourceId?: string;
  stage?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export async function getAllPropagationRecords(params: PropagationRecordQueryParams = {}): Promise<{
  items: PropagationRecordWithSource[];
  total: number;
}> {
  const query: string[] = [];
  if (params.seedSourceId) query.push(`seedSourceId=${encodeURIComponent(params.seedSourceId)}`);
  if (params.stage) query.push(`stage=${encodeURIComponent(params.stage)}`);
  if (params.startDate) query.push(`startDate=${encodeURIComponent(params.startDate)}`);
  if (params.endDate) query.push(`endDate=${encodeURIComponent(params.endDate)}`);
  query.push(`page=${params.page || 1}`);
  query.push(`limit=${params.limit || 20}`);
  const qs = query.join('&');

  // 2026-06-06: enhancedApiClient 已自动解包 data；res 直接是 {items, total}
  // 删除原 `(res as any).data || res || {}` 三层 fallback 链（HIGH #2）
  const res = await enhancedApiClient.get<{ items: PropagationRecordWithSource[]; total: number }>(
    `/seed-sources/propagation-records?${qs}`
  );
  const items: PropagationRecordWithSource[] = (res.items || []).map((it) => ({
    id: it.id,
    seedSourceId: it.seedSourceId,
    seedCode: it.seedCode || '',
    cropName: it.cropName || '',
    cropVariety: it.cropVariety || '',
    propagationType: it.propagationType || '',
    recordDate: it.recordDate || '',
    stage: it.stage || '',
    temperature: it.temperature,
    humidity: it.humidity,
    abnormality: it.abnormality,
    operator: it.operator,
    remarks: it.remarks,
    pollinationType: it.pollinationType,
    pollinatorCrop: it.pollinatorCrop,
    flowerCount: it.flowerCount,
    fruitSetCount: it.fruitSetCount,
    harvestSeedCount: it.harvestSeedCount,
    seedWeight: it.seedWeight,
    harvestPlantCount: it.harvestPlantCount,
    germinationRate: it.germinationRate,
    purity: it.purity,
    moisture: it.moisture,
    survivalRate: it.survivalRate,
    rootedRate: it.rootedRate,
    graftSuccessRate: it.graftSuccessRate,
    createTime: it.createTime || '',
    updateTime: it.updateTime || '',
  }));
  return { items, total: res.total ?? items.length };
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
 * 错误直接抛给上层（V2.1 铁律：禁止吞错返回 false）
 */
export async function printLabel(
  seedSourceId: string,
  printType: string,
  printCount: number,
  operator: string,
  labelNumbers?: string[]
): Promise<{ id: string; printCount: number }> {
  return await createPrintRecord(seedSourceId, printType, printCount, operator, labelNumbers);
}

// ========== 2026-06-30: 种植调入弹窗查询接口 ==========

/** 2026-06-30: 种植调入弹窗用 — 按作物品种名搜索可用种源 */
export interface SeedSourceLookupRow {
  id: string
  sourceCode: string
  cropName: string
  cropVariety: string
  seedForm: string
  remainingQuantity: number
  unit: string
  sourceType: string
  status: string
}

export interface LookupAvailableSeedSourceParams {
  cropName?: string
  cropVariety?: string
  seedForm?: string
  limit?: number
}

/**
 * 2026-06-30: 种植调入弹窗用 — 按作物品种名搜索可用种源
 * 错误直接抛给上层（V2.1 铁律：禁止吞错返回默认值）
 */
export async function lookupAvailableSeedSources(
  params: LookupAvailableSeedSourceParams = {}
): Promise<SeedSourceLookupRow[]> {
  const qs: string[] = []
  if (params.cropName) qs.push(`cropName=${encodeURIComponent(params.cropName)}`)
  if (params.cropVariety) qs.push(`cropVariety=${encodeURIComponent(params.cropVariety)}`)
  if (params.seedForm) qs.push(`seedForm=${encodeURIComponent(params.seedForm)}`)
  if (params.limit != null) qs.push(`limit=${params.limit}`)
  const url = `/seed-sources/lookup${qs.length ? '?' + qs.join('&') : ''}`
  // enhancedApiClient 已自动解包 data（参见 api-client-response-unwrapping.md）
  const rows = await enhancedApiClient.get<SeedSourceLookupRow[]>(url)
  return Array.isArray(rows) ? rows : []
}

/** 2026-06-30: 种源详情"调入种植"tab — 移入/移出履历 */
export interface SeedSourceMoveRecord {
  id: string
  operationDate: string
  operationType: 'move_in' | 'move_out'
  quantity: number
  sourceId: string
  sourceCode: string
  plantingId: string
  plantingCode: string
  toAreaId: string
  toAreaName: string
  fromAreaId: string
  fromAreaName: string
  operatorName: string
  remarks: string
  createTime: string
}

/**
 * 2026-06-30: 获取某一种源的调入/调出种植履历
 * 错误直接抛给上层（V2.1 铁律：禁止吞错返回默认值）
 */
export async function getSeedSourceMoveRecords(
  seedSourceId: string
): Promise<SeedSourceMoveRecord[]> {
  if (!seedSourceId) return []
  const rows = await enhancedApiClient.get<SeedSourceMoveRecord[]>(
    `/seed-sources/${seedSourceId}/move-records`
  )
  return Array.isArray(rows) ? rows : []
}
