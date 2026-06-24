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
    residualToSourceQty: Number(item.residualToSourceQty) || 0,
    residualToSourceUnit: String(item.residualToSourceUnit || ''),
    selfSeedToSourceQty: Number(item.selfSeedToSourceQty) || 0,
    selfSeedToSourceUnit: String(item.selfSeedToSourceUnit || ''),
    // 2026-06-18: 加 dispose 聚合（之前漏了，列表里看不到废弃量）
    disposeQty: Number(item.disposeQty) || 0,
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
 * 添加采收记录的入参
 */
export interface AddHarvestRecordInput {
  recordDate: string
  destination: 'harvest' | 'circulate' | 'self_seed' | 'dispose'
  subType?: 'cutting' | 'seed_saving' | 'quantity_refill' | 'quantity_inbound'
  warehouseId?: string
  warehouseName?: string
  quantity: number
  unit?: string
  notes?: string
  operatorName?: string
  createBy?: string
  createById?: string
}

/**
 * 种植结束（V2 软锁改造）
 * 4 种结束方式：harvest | circulate | self_seed | dispose
 * 数据流：API → SQLite DB
 *
 * 2026-06-17: 改造为 PUT /:id 设 is_harvest_locked=1
 * 之前是 POST /:id/end（专用路由），现在改用通用 PUT 走白名单列更新
 * 2026-06-18: 去掉 circulate_to_inventory（5 个 → 4 个）
 */
export interface EndPlantingInput {
  endType: 'harvest' | 'circulate' | 'self_seed' | 'dispose';
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
export async function getPlantingHarvestRecords(plantingId: string): Promise<PlantingHarvestRecord[]> {
  const data = await enhancedApiClient.get<PlantingHarvestRecord[]>(`/plantings/${plantingId}/harvest-records`)
  return data
}

/** 添加 1 条采收记录 */
export async function addPlantingHarvestRecord(plantingId: string, input: AddHarvestRecordInput): Promise<PlantingHarvestRecord> {
  const data = await enhancedApiClient.post<PlantingHarvestRecord>(`/plantings/${plantingId}/harvest-records`, input)
  return data
}

/** 编辑 1 条采收记录 */
export async function updatePlantingHarvestRecord(plantingId: string, recordId: string, input: AddHarvestRecordInput): Promise<PlantingHarvestRecord> {
  const data = await enhancedApiClient.put<PlantingHarvestRecord>(`/plantings/${plantingId}/harvest-records/${recordId}`, input)
  return data
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
  sourceType?: 'seed' | 'seedling';
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
