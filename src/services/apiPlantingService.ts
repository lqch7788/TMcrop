/**
 * 种植数据 API 服务
 * 对接后端 /api/plantings
 *
 * 数据流：API → enhancedApiClient → SQLite DB
 */

import { enhancedApiClient } from '../lib/apiClient';
import { Planting, PlantingStatus, SourceType, PlantingHarvestRecord } from '../types/crop';

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
  // 兼容字段（LEFT JOIN 多出列 — 2026-06-30 tsc 兼容）
  sourceSeedSourceType?: string;
  categoryName?: string;
  typeName?: string;
  varietyName?: string;
  subVariety1Name?: string;
  productionPlanCode: string;
  createBy: string;
  createTime: string;
  updateTime: string;
  [key: string]: any;
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
  } else if (item.status === 'harvesting') {
    status = PlantingStatus.HARVESTING;
  } else if (item.status === 'harvested') {
    status = PlantingStatus.HARVESTED;
  } else if (item.status === 'ended') {
    status = PlantingStatus.ENDED;
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
    // 2026-06-25: 关联种源的真实类型（badge 显示用）
    sourceSeedSourceType: item.sourceSeedSourceType || undefined,
    cropName: item.cropName || '',
    cropVariety: item.cropVariety || '',
    cropCode: item.cropCode || '',
    // 2026-06-30 Bug 修复：后端 LEFT JOIN crop_varieties 返的字段，前端 transform 必须读
    // 否则 getVarietyByAny 兜底失败，导致列表"作物编码/作物品种/品种路径"3 列错乱
    categoryName: item.categoryName || undefined,
    typeName: item.typeName || undefined,
    varietyName: item.varietyName || undefined,
    subVariety1Name: item.subVariety1Name || undefined,
    areaId: item.areaId || '',
    areaName: item.areaName || '',
    rootName: item.rootName || '',
    plantingCount: item.plantingCount || 0,
    // 2026-07-23：列表"剩余数量"列用 Σ area_stocks.quantity
    availableQuantity: item.availableQuantity ?? item.plantingCount ?? 0,
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
    // V2 改造 (2026-06-11): 补充表格展示字段
    harvestQuantity: item.harvestQuantity || 0,
    targetYield: item.targetYield || 0,
    targetYieldUnit: item.targetYieldUnit || '克',
    unit: item.unit || '',
    originPath: (item.originPath as 'direct_from_seed' | 'via_seedling') || undefined,
    // 2026-06-17: 种植结束字段（5 种结束方式标记）
    endType: (item.endType as Planting['endType']) || undefined,
    endTime: item.endTime || undefined,
    // 2026-06-17: 采收记录相关字段
    isHarvestLocked: Boolean(item.isHarvestLocked),
    harvestToInventoryQty: Number(item.harvestToInventoryQty) || 0,
    harvestToInventoryUnit: String(item.harvestToInventoryUnit || ''),
    // 2026-06-29: 合并 3 个 destination 值的种植自留种累计（前端用一个字段统一显示）
    selfKeptToSourceQty: Number(item.selfKeptToSourceQty) || 0,
    selfKeptToSourceUnit: String(item.selfKeptToSourceUnit || ''),
    // 2026-06-29: 种植自留种按形态分布明细（后端 GROUP_CONCAT 字符串，前端 JSON.parse 解析）
    selfKeptByForm: (() => {
      const raw = (item as any).selfKeptByForm
      if (!raw || typeof raw !== 'string') return []
      try {
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed.map((it: any) => ({
          seedForm: String(it.seedForm || ''),
          quantity: Number(it.quantity) || 0,
          unit: String(it.unit || ''),
        }))
      } catch {
        return []
      }
    })(),
    residualToSourceQty: Number(item.residualToSourceQty) || 0,
    residualToSourceUnit: String(item.residualToSourceUnit || ''),
    selfSeedToSourceQty: Number(item.selfSeedToSourceQty) || 0,
    selfSeedToSourceUnit: String(item.selfSeedToSourceUnit || ''),
    // 2026-07-09：disposeQty / disposeUnit 已下线（dispose 功能移除）
    // 保留映射接收后端历史返回，新代码不要再读这 2 个字段
    // @ts-expect-error - disposeQty 类型已 deprecated
    disposeQty: Number(item.disposeQty) || 0,
    // @ts-expect-error - disposeUnit 类型已 deprecated
    disposeUnit: String(item.disposeUnit || ''),
    // 2026-06-24: 育种实验 + 种植留种字段（种源管理吸收功能）
    isBreeding: Boolean(item.isBreeding),
    parentMaleCode: String(item.parentMaleCode || ''),
    parentFemaleCode: String(item.parentFemaleCode || ''),
    generation: String(item.generation || ''),
    breedingMethod: String(item.breedingMethod || ''),
    breedingLocation: String(item.breedingLocation || ''),
    targetTraits: String(item.targetTraits || ''),
    isSeedSaving: Boolean(item.isSeedSaving),
    seedPlantMarker: String(item.seedPlantMarker || ''),
    // 2026-06-28: 每日记录累加字段（活体剩余 = plantingCount + supplementCount - lossCount）
    lossCount: Number(item.lossCount) || 0,
    supplementCount: Number(item.supplementCount) || 0,
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
  const result: any = await enhancedApiClient.post<any>('/plantings', planting);
  // 归一化 POST SELECT * 返回的字段名，对齐 GET 端点 SQL 别名（Planting 接口）
  if (result) {
    if (result.plantingCode !== undefined && result.plantCode === undefined) {
      result.plantCode = result.plantingCode;
      delete result.plantingCode;
    }
    if (result.sourceName !== undefined && result.sourceCode === undefined) {
      result.sourceCode = result.sourceName;
      delete result.sourceName;
    }
    if (result.soilPh !== undefined && result.soilPH === undefined) {
      result.soilPH = result.soilPh;
      delete result.soilPh;
    }
    if (result.soilEc !== undefined && result.soilEC === undefined) {
      result.soilEC = result.soilEc;
      delete result.soilEc;
    }
  }
  return result as Planting;
}

/**
 * 更新种植记录
 * 数据流：API → SQLite DB
 */
export async function updatePlanting(id: string, updates: Partial<Planting>): Promise<Planting | null> {
  // camelCase → snake_case 映射 (后端白名单列使用 snake_case)
  const FIELD_MAP: Record<string, string> = {
    areaId: 'area_id',
    plantingCount: 'planting_quantity',
    plantingDate: 'planting_date',
    soilPH: 'soil_ph',
    soilEC: 'soil_ec',
    attritionRate: 'attrition_rate',
    endType: 'end_type',
    endTime: 'end_time',
    cropName: 'crop_name',
    cropVariety: 'crop_variety',
    productionPlanCode: 'production_plan_code',
    productionPlanId: 'production_plan_id',
    isHarvestLocked: 'is_harvest_locked',
    // 2026-07-21 新增：补全缺失字段映射
    unit: 'unit',
    targetYield: 'target_yield',
    targetYieldUnit: 'target_yield_unit',
    transplantCount: 'transplant_count',
    transplantDate: 'transplant_date',
    isBreeding: 'is_breeding',
    parentMaleCode: 'parent_male_code',
    parentFemaleCode: 'parent_female_code',
    generation: 'generation',
    breedingMethod: 'breeding_method',
    breedingLocation: 'breeding_location',
    targetTraits: 'target_traits',
    isSeedSaving: 'is_seed_saving',
    seedPlantMarker: 'seed_plant_marker',
    lossCount: 'loss_count',
    supplementCount: 'supplement_count',
  };
  const backendUpdates: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    const mappedKey = FIELD_MAP[key] || key;
    backendUpdates[mappedKey] = value;
  }
  const result = await enhancedApiClient.put<any>(`/plantings/${id}`, backendUpdates);
  return result as Planting;
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
export async function harvestPlanting(
  id: string,
  harvestDate: string,
  harvestCount?: number,
  // 2026-06-25: 损耗率（采收后自动计算并写回 plantings.attrition_rate）
  attritionRate?: number
): Promise<boolean> {
  await enhancedApiClient.post(`/plantings/${id}/harvest`, {
    harvest_date: harvestDate,
    harvest_quantity: harvestCount,
    attrition_rate: attritionRate,
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
 * 添加采收记录的入参
 * 2026-06-29: 4 个去向减为 3 个（circulate + self_seed 合并为 planting_self_kept）
 * 取消 quantity_refill subType（前端不再传）
 */
export interface AddHarvestRecordInput {
  recordDate: string
  // 2026-07-09: dispose 已下线，destination 只剩 harvest / planting_self_kept 两种
  destination: 'harvest' | 'planting_self_kept'
  subType?: 'cutting' | 'seed_saving'
  seedForm?: '果实' | '种子' | '种苗' | '穗条' | '枝条' | '块根' | '块茎' | '鳞茎' | '叶片' | '花朵' | '整株' | '其他'
  warehouseId?: string
  warehouseName?: string
  quantity: number
  unit?: string
  notes?: string
  // 2026-07-09 v5 阶段二（方案 E）：补录场景必填（后端基于 planting.status 自动判断补录模式）
  supplementaryReason?: string
  operatorName?: string
  // 2026-07-18：种植自留种模式补传 operatorId（后端 → executeCirculation → crop_circulation_records.operator_id）
  operatorId?: string
  createBy?: string
  createById?: string
  /** 2026-07-18: 种源合并键 — 用户输入 generation */
  generation?: string | null
  /** 2026-07-18: 用户选择强制新建（即使有匹配也不合并） */
  forceNew?: boolean
}

/**
 * 种植结束（V2 软锁改造）
 * 3 种结束方式：harvest | circulate | self_seed（2026-07-09 移除 dispose）
 * 数据流：API → SQLite DB
 *
 * 2026-06-17: 改造为 PUT /:id 设 is_harvest_locked=1
 * 之前是 POST /:id/end（专用路由），现在改用通用 PUT 走白名单列更新
 * 2026-06-18: 去掉 circulate_to_inventory（5 个 → 4 个）
 * 2026-07-09: 去掉 dispose（4 个 → 3 个，与每日记录"损耗"语义重叠）
 */
export interface EndPlantingInput {
  endType: 'harvest' | 'circulate' | 'self_seed';
  subType?: 'cutting' | 'seed_saving' | 'quantity_refill' | 'quantity_inbound';
  warehouseId?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export async function endPlanting(id: string, input: EndPlantingInput): Promise<{ id: string; status: string; endType: string }> {
  // 软锁：直接 PUT 设 is_harvest_locked=1，status=ended/cancelled
  // 后端白名单列包含 is_harvest_locked, status, end_time, end_type
  const updates: Record<string, any> = {
    is_harvest_locked: 1,
    status: 'ended',
    end_time: new Date().toISOString(),
    end_type: input.endType,
  };
  const data = await enhancedApiClient.put<{ id: string }>(`/plantings/${id}`, updates);
  return { id: data.id, status: 'ended', endType: input.endType };
}

// ============================================
// 2026-06-17: 种植采收记录 API (Phase 1)
// ============================================

/** 获取种植的采收记录列表 */
/**
 * 2026-06-29: 把后端 source_form 字段映射为前端的 seedForm（语义统一：果实/种子/枝条等）
 * 后端 planting_harvest_records 表里 source_form 列存采收形态（与 inventory_stock.source_form 复用）
 */
function normalizeHarvestRecord<T extends { sourceForm?: string }>(record: T): T & { seedForm?: string } {
  return { ...record, seedForm: record.sourceForm }
}

export async function getPlantingHarvestRecords(plantingId: string): Promise<PlantingHarvestRecord[]> {
  const data = await enhancedApiClient.get<PlantingHarvestRecord[]>(`/plantings/${plantingId}/harvest-records`)
  return data.map(normalizeHarvestRecord)
}

/** 添加 1 条采收记录 */
export async function addPlantingHarvestRecord(plantingId: string, input: AddHarvestRecordInput): Promise<PlantingHarvestRecord> {
  const data = await enhancedApiClient.post<PlantingHarvestRecord>(`/plantings/${plantingId}/harvest-records`, input)
  return normalizeHarvestRecord(data)
}

/** 编辑 1 条采收记录 */
export async function updatePlantingHarvestRecord(plantingId: string, recordId: string, input: AddHarvestRecordInput): Promise<PlantingHarvestRecord> {
  const data = await enhancedApiClient.put<PlantingHarvestRecord>(`/plantings/${plantingId}/harvest-records/${recordId}`, input)
  return normalizeHarvestRecord(data)
}

/** 删除 1 条采收记录 */
export async function deletePlantingHarvestRecord(plantingId: string, recordId: string): Promise<void> {
  await enhancedApiClient.delete(`/plantings/${plantingId}/harvest-records/${recordId}`)
}

// ============================================
// 2026-06-19: 种植移入/移出（整批级别，不依赖 plant_labels）
// ============================================

/** 移入/移出入参 */
export interface MovePlantingInput {
  operationType: 'move_in' | 'move_out'
  toAreaId?: string
  toAreaName: string
  quantity?: number
  operationDate?: string
  remarks?: string
}

/** 提交移入/移出 */
export async function movePlanting(plantingId: string, input: MovePlantingInput): Promise<{ id: string; plantingId: string; toAreaName: string }> {
  const data = await enhancedApiClient.post<{ id: string; plantingId: string; toAreaName: string }>(
    `/plantings/${plantingId}/move`,
    input,
  )
  return data
}

/** 获取移入/移出履历 */
export async function getPlantingMoveRecords(plantingId: string): Promise<any[]> {
  const data = await enhancedApiClient.get<any[]>(`/plantings/${plantingId}/move-records`)
  return data
}

/**
 * 生成种植单号
 * 数据流：API → SQLite DB
 */
export async function generatePlantCode(): Promise<string> {
  try {
    // 后端返回 { success: true, data: "ZZ20260611-001" }
    // enhancedApiClient 自动解包为纯字符串
    const code = await enhancedApiClient.get<string>('/plantings/generate-code');
    return typeof code === 'string' ? code : '';
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

/**
 * 调入/调出 V2 输入（spec 2026-06-21）
 */
export interface MovePlantingInputV2 {
  operationType: 'move_in' | 'move_out';
  toAreaId?: string;
  toAreaName: string;
  fromAreaId?: string;       // 调出必填
  fromAreaName?: string;     // 调出必填
  quantity: number;
  operationDate: string;
  remarks?: string;
  // 调入必填
  // 2026-07-23: 新增 'planting' — 调入来源改为其他种植单（与调出对称，移除种源参与）
  sourceType?: 'seed' | 'seedling' | 'planting';
  sourceId?: string;
  sourceCode?: string;
  // 调出必填
  targetPlantingId?: string;
  targetAreaId?: string;
  targetAreaName?: string;
}

export interface MovePlantingResultV2 {
  id: string;
  plantingId: string;
  toAreaName: string;
  quantity: number;
  softWarning: string | null;
}

/**
 * 调入/调出 V2
 * 数据流：API → SQLite DB（事务原子）
 */
export async function movePlantingV2(
  plantingId: string,
  input: MovePlantingInputV2
): Promise<MovePlantingResultV2> {
  const data = await enhancedApiClient.post<MovePlantingResultV2>(
    `/plantings/${plantingId}/move`,
    input
  );
  return data;
}

// ========== 2026-06-30: 种植调入弹窗"目标区域"下拉用 ==========

/** 2026-06-30: 种植调入弹窗"目标区域"下拉用 — 某一种植下所有区域库存 */
export interface PlantingAreaStock {
  id: string
  areaId: string
  areaName: string
  quantity: number
  sourceType: string | null
  sourceId: string | null
  sourceCode: string | null
}

/**
 * 2026-06-30: 获取某一种植的区域库存列表
 * 错误直接抛给上层（V2.1 铁律：禁止吞错返回默认值）
 */
export async function getPlantingAreaStocks(
  plantingId: string
): Promise<PlantingAreaStock[]> {
  if (!plantingId) return []
  const rows = await enhancedApiClient.get<PlantingAreaStock[]>(
    `/plantings/${plantingId}/area-stocks`
  )
  return Array.isArray(rows) ? rows : []
}

/**
 * 2026-06-30: 调出模式用 — 按 cropName 查找同作物候选目标订单（排除自己）
 * 后端 handler 调出分支会校验 cropCode 一致（line 248-254），这里只是 UI 层筛选
 */
export interface PlantingLookupRow {
  id: string
  plantCode: string
  cropName: string
  cropVariety: string
  cropCode: string
  areaName: string
}

export async function lookupPlantingsForMove(params: {
  cropName?: string
  excludeId?: string
  limit?: number
}): Promise<PlantingLookupRow[]> {
  const qs: string[] = []
  if (params.cropName) qs.push(`cropName=${encodeURIComponent(params.cropName)}`)
  if (params.excludeId) qs.push(`excludeId=${encodeURIComponent(params.excludeId)}`)
  if (params.limit != null) qs.push(`limit=${params.limit}`)
  const url = `/plantings/lookup${qs.length ? '?' + qs.join('&') : ''}`
  const rows = await enhancedApiClient.get<PlantingLookupRow[]>(url)
  return Array.isArray(rows) ? rows : []
}
