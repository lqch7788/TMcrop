/**
 * 育苗数据 API 服务
 * 对接后端 /api/seedlings
 *
 * 数据流：API → enhancedApiClient → 组件（无缓存层，V2.1 铁律）
 *
 * 降级策略：
 * - GET 请求：API 直连（V2.1 铁律：无缓存降级）
 * - POST/PUT/DELETE：API 直连（无离线队列）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { Seedling, DailyRecord, PrintRecord, TransplantRecord, TransplantHistory, SeedlingStatus } from '../types/crop';

// 后端返回的原始数据字段类型（已经过 queryToObjects 转换为驼峰命名）
interface BackendSeedling {
  id: string;
  seedlingCode: string;
  sourceId: string;
  sourceName: string;
  productionPlanCode?: string;
  cropName: string;
  cropVariety: string;
  cropCode?: string;
  seedlingType: string;
  greenhouseName?: string;
  areaName: string;
  seedlingForm?: string;       // 2026-06-27：种苗形态
  seedlingDate: string;
  expectedFinishDate?: string;
  actualFinishDate?: string;
  seedlingQuantity: number;
  survivalQuantity: number;
  survivalRate: number;
  status: string;
  seedlingStatus?: string;
  remarks?: string;
  createBy: string;
  createTime: string;
  updateTime: string;
  pictures?: string;
  qualityGrade?: string;
  printedCount?: number;
  lossCount?: number;
  lossRate?: number;
  isFinished?: number;
  chargePerson?: string;
  categoryName?: string;
  typeName?: string;
  varietyName?: string;
  subVarietyName?: string;
  sourceCode?: string;
  // 2026-06-15: 繁殖模式相关字段（后端 snake_case → queryHelper 转 camelCase）
  propagationMode?: 'one_to_one' | 'one_to_many';  // 2026-06-15: 6 种合并为 2 种
  motherPlantCount?: number;
  expandedPlantCount?: number;
  scionCount?: number;
  // 2026-06-15: 数量体系重构 — 5 业务字段（2026-06-28 移除 transplantedCount/autoPlantedCount，业务上种植管理不再从育苗取苗）
  motherLossCount?: number;
  seedlingLossCount?: number;
  harvestStockedCount?: number;
  // 2026-06-16: 补苗累计（1:1=补种子；1:多=补母株；严格区分母株/小苗池子）
  replantCount?: number;
  // 2026-06-15: 5 预估字段（仅 1:多 模式有）
  propagationMultiple?: number;
  customMultiple?: number;
  theoreticalYield?: number;
  targetSurvivalRate?: number;
  targetSurvivalCount?: number;
  [key: string]: unknown;
}

/**
 * 将后端返回的字段名映射到前端 Seedling 类型
 */
function transformSeedlingFromBackend(data: BackendSeedling | BackendSeedling[]): Seedling | Seedling[] {
  if (Array.isArray(data)) {
    return data.map(item => transformSingleSeedling(item));
  }
  return transformSingleSeedling(data);
}

function transformSingleSeedling(item: BackendSeedling): Seedling {
  let pictures: string[] = [];
  if (item.pictures) {
    try {
      pictures = JSON.parse(item.pictures);
    } catch {
      pictures = [];
    }
  }

  // 2026-07-04 修复：6 态全映射（sown/cancelled 漏映射导致取消后闪现又变回 in_progress）
  let status: SeedlingStatus = SeedlingStatus.IN_PROGRESS;
  if (item.status === 'sown') {
    status = SeedlingStatus.SOWN;
  } else if (item.status === 'in_progress') {
    status = SeedlingStatus.IN_PROGRESS;
  } else if (item.status === 'transplant_ready') {
    status = SeedlingStatus.TRANSPLANT_READY;
  } else if (item.status === 'completed') {
    status = SeedlingStatus.COMPLETED;
  } else if (item.status === 'abnormal') {
    status = SeedlingStatus.ABNORMAL;
  } else if (item.status === 'cancelled') {
    status = SeedlingStatus.CANCELLED;
  }

  let survivalRate = item.survivalRate;
  if (typeof survivalRate !== 'number' || isNaN(survivalRate) || survivalRate > 100 || survivalRate < 0) {
    const initialCount = item.seedlingQuantity || 0;
    const survivalCount = item.survivalQuantity || 0;
    survivalRate = initialCount > 0 ? Math.round((survivalCount / initialCount) * 100) : 0;
  }

  const varietyPath = [
    item.categoryName,
    item.typeName,
    item.varietyName,
    item.subVarietyName
  ].filter(Boolean).join(' > ');

  return {
    id: item.id,
    seedlingCode: item.seedlingCode,
    sourceId: item.sourceId || '',
    sourceCode: item.sourceCode || '',
    productionPlanCode: item.productionPlanCode || '',
    cropName: item.cropName,
    cropVariety: item.varietyName || item.cropName || '',
    cropCode: item.cropCode || '',
    seedlingType: item.seedlingType || '',
    seedlingForm: item.seedlingForm || '', // 2026-06-27：种苗形态（花朵/枝条/裸根苗/穴盘苗 等）
    siteId: item.areaName || '',
    siteName: item.greenhouseName || item.areaName || '',
    startDate: item.seedlingDate ? item.seedlingDate.split('T')[0] : '',
    expectedEndDate: item.expectedFinishDate ? item.expectedFinishDate.split('T')[0] : '',
    endDate: item.actualFinishDate ? item.actualFinishDate.split('T')[0] : '',
    initialCount: item.seedlingQuantity || 0,
    survivalCount: item.survivalQuantity || 0,
    // 2026-06-28：移除 plantedCount 映射（业务上已停止使用）
    survivalRate: survivalRate,
    lossCount: item.lossCount || 0,
    lossRate: item.lossRate || 0,
    isFinished: item.isFinished === 1,
    status: status,
    dailyRecords: [],
    pictures: pictures,
    qualityGrade: item.qualityGrade || '',
    printCount: item.printedCount || 0,
    remarks: item.remarks || '',
    createBy: item.createBy || '',
    createTime: item.createTime ? item.createTime.split('T')[0] : '',
    updateTime: item.updateTime || '',
    instanceId: undefined,
    orderId: undefined,
    orderCode: undefined,
    orgName: undefined,
    seedlingTaskTime: typeof item.work_hours === 'number' ? item.work_hours : undefined,
    planType: undefined,
    productionPlanId: undefined,
    calculateMode: undefined,
    categoryName: item.categoryName,
    typeName: item.typeName,
    varietyName: item.varietyName,
    subVarietyName: item.subVarietyName,
    varietyPath: varietyPath,
    // 2026-06-15: 透传繁殖模式 — 修复列表"无论选什么都显示种子育苗"bug
    propagationMode: item.propagationMode || 'one_to_one',  // 2026-06-15: 默认 1:1
    motherPlantCount: item.motherPlantCount ?? 0,
    expandedPlantCount: item.expandedPlantCount ?? 0,
    scionCount: item.scionCount ?? 0,
    // 2026-06-15: 透传负责人 — 修复编辑弹窗"负责人"显示空 bug
    chargePerson: item.chargePerson ?? '',
    // 2026-06-15: 数量体系重构 — 透传 3 业务字段（2026-06-28 移除 transplantedCount/autoPlantedCount）
    motherLossCount: item.motherLossCount ?? 0,
    seedlingLossCount: item.seedlingLossCount ?? 0,
    harvestStockedCount: item.harvestStockedCount ?? 0,
    // 2026-06-16: 透传补苗累计
    replantCount: item.replantCount ?? 0,
    // 2026-06-16: 派生字段 — 可用苗数 = expanded - 损耗 - 采收入库（2026-06-28 移除已定植/自动定植，业务规则：种植管理不再从育苗取苗）
    availableTransplantCount: Math.max(0,
      (item.expandedPlantCount ?? 0)
      - (item.seedlingLossCount ?? 0)
      - (item.harvestStockedCount ?? 0)
    ),
    // 2026-06-15: 5 预估字段
    propagationMultiple: item.propagationMultiple ?? 0,
    customMultiple: item.customMultiple ?? 0,
    theoreticalYield: item.theoreticalYield ?? 0,
    targetSurvivalRate: item.targetSurvivalRate ?? 0,
    targetSurvivalCount: item.targetSurvivalCount ?? 0,
  };
}

/**
 * 获取所有育苗记录
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getSeedlings(): Promise<Seedling[]> {
  const data = await enhancedApiClient.get<BackendSeedling[]>('/seedlings');
  return transformSeedlingFromBackend(data) as Seedling[];
}

/**
 * 根据ID获取单个育苗记录
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getSeedlingById(id: string): Promise<Seedling | undefined> {
  const data = await enhancedApiClient.get<BackendSeedling>(`/seedlings/${id}`);
  return transformSeedlingFromBackend(data) as Seedling;
}

/**
 * 根据ID数组获取多个育苗记录
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getSeedlingsByIds(ids: string[]): Promise<Seedling[]> {
  const data = await enhancedApiClient.get<BackendSeedling[]>(`/seedlings/batch?ids=${ids.join(',')}`);
  return transformSeedlingFromBackend(data) as Seedling[];
}

/**
 * 根据种源ID获取育苗记录
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getSeedlingsBySourceId(sourceId: string): Promise<Seedling[]> {
  const data = await enhancedApiClient.get<BackendSeedling[]>(`/seedlings/source/${sourceId}`);
  return transformSeedlingFromBackend(data) as Seedling[];
}

/**
 * 生成育苗单号
 * 降级策略：API 失败返回空字符串
 */
export async function generateSeedlingCode(): Promise<string> {
  try {
    return await enhancedApiClient.get<string>('/seedlings/generate-code');
  } catch {
    return '';
  }
}

/**
 * 根据日期生成育苗单号
 * 降级策略：API 失败返回空字符串
 */
export async function generateSeedlingCodeByDate(_date: Date | string): Promise<string> {
  try {
    return await enhancedApiClient.get<string>('/seedlings/generate-code');
  } catch {
    return '';
  }
}

/**
 * 创建育苗记录
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 *
 * 注意：前端使用 camelCase，后端期望 snake_case，需要转换
 */
export async function addSeedling(seedling: Omit<Seedling, 'id' | 'createTime' | 'updateTime'>): Promise<Seedling> {
  // 转换为后端期望的 snake_case 格式
  // 注意：source_id 对应 seed_source 的 id，source_name 对应 seed_source 的 source_code
  const backendData: Record<string, unknown> = {
    seedling_code: seedling.seedlingCode,
    source_id: seedling.sourceId,       // seed_source 的 id (如 'SS001')
    source_name: seedling.sourceCode,    // seed_source 的 source_code (如 'ZZ2026-001')
    production_plan_code: seedling.productionPlanCode || '',
    crop_code: seedling.cropCode,
    crop_name: seedling.cropName,
    crop_variety: seedling.cropVariety,
    seedling_type: seedling.seedlingType,
    greenhouse_name: seedling.siteName,
    area_name: seedling.siteId,
    seedling_date: seedling.startDate,
    expected_finish_date: seedling.expectedEndDate,
    actual_finish_date: seedling.endDate,
    seedling_quantity: seedling.initialCount,
    // 2026-06-15: 数量体系重构 — survival_quantity/planted_count/loss_count 停止写入（由新 5 业务字段 + 派生）
    survival_quantity: undefined,
    survival_rate: seedling.survivalRate || 0,
    planted_count: undefined,
    loss_count: undefined,
    loss_rate: undefined,
    target_survival_rate: seedling.targetSurvivalRate ?? null,
    target_survival_count: seedling.targetSurvivalCount ?? null,
    status: seedling.status,
    remarks: seedling.remarks,
    create_by: seedling.createBy,
    work_hours: seedling.seedlingTaskTime,
    pictures: Array.isArray(seedling.pictures) ? JSON.stringify(seedling.pictures) : seedling.pictures,
  };

  const result = await enhancedApiClient.post<any>('/seedlings', backendData);
  return result as Seedling;
}

/**
 * 原子操作：扣减种源 + 创建育苗记录（调用后端 /with-deduct）
 * 替代旧的 addSeedling + decreaseAvailableCount 两步调用
 *
 * 2026-06-14 修复：seedling 子对象必须做业务字段映射（不是机械的 camelCase→snake_case），
 * 否则前端字段（initialCount/siteName/startDate）与后端字段（seedling_quantity/greenhouse_name/seedling_date）
 * 错位，写入数据库全部为 null。同时透传 targetSurvivalRate/targetSurvivalCount/lossCount/sourceMode 等字段，
 * 与 addSeedling 走 POST / 的字段映射保持一致。
 */
function toBackendSeedlingPayload(s: Record<string, unknown>): Record<string, unknown> {
  return {
    seedling_code: s.seedlingCode,
    source_id: s.sourceId,
    source_name: s.sourceCode,
    production_plan_code: s.productionPlanCode || '',
    crop_code: s.cropCode,
    crop_name: s.cropName,
    crop_variety: s.cropVariety,
    seedling_type: s.seedlingType,
    greenhouse_name: s.greenhouseName || s.siteName,
    area_name: s.areaName || s.siteId,
    seedling_date: s.seedlingDate || s.startDate,
    expected_finish_date: s.expectedFinishDate || s.expectedEndDate,
    seedling_quantity: s.seedlingQuantity ?? s.initialCount,
    // 2026-06-15: 停止写入旧字段（由新 5 业务字段 + 派生）
    survival_quantity: undefined,
    survival_rate: s.survivalRate ?? 0,
    planted_count: undefined,
    loss_count: undefined,
    loss_rate: undefined,
    target_survival_rate: s.targetSurvivalRate ?? null,
    target_survival_count: s.targetSurvivalCount ?? null,
    status: s.status,
    seedling_status: s.seedlingStatus,
    remarks: s.remarks,
    create_by: s.createBy,
    work_hours: s.workHours,
    pictures: Array.isArray(s.pictures) ? JSON.stringify(s.pictures) : s.pictures,
    source_mode: s.sourceMode || 'internal',
    external_seed_code: s.externalSeedCode,
    external_seed_name: s.externalSeedName,
    external_seed_quantity: s.externalSeedQuantity,
    external_seed_note: s.externalSeedNote,
    propagation_mode: s.propagationMode || 'one_to_one',  // 2026-06-15: 默认 1:1
    mother_plant_count: s.motherPlantCount ?? 0,
    expanded_plant_count: s.expandedPlantCount ?? 0,
    scion_count: s.scionCount ?? 0,
    // 2026-06-15: 负责人（编辑弹窗显示空 bug 修复）
    charge_person: s.chargePerson ?? null,
    // 2026-06-15: 数量体系重构 — 5 业务字段
    mother_loss_count: s.motherLossCount ?? 0,
    seedling_loss_count: s.seedlingLossCount ?? 0,
    // 2026-06-28：移除 transplanted_count/auto_planted_count 写入（业务规则：种植管理不再从育苗取苗）
    harvest_stocked_count: s.harvestStockedCount ?? 0,
    // 2026-06-15: 5 预估字段
    propagation_multiple: s.propagationMultiple ?? 0,
    custom_multiple: s.customMultiple ?? 0,
    theoretical_yield: s.theoreticalYield ?? 0,
    // 2026-06-27: 种苗形态（花朵/枝条/裸根苗/穴盘苗 等）
    seedling_form: s.seedlingForm ?? null,
  };
}

export async function addSeedlingWithDeduct(data: {
  sourceId: string;
  count: number;
  seedling: Record<string, unknown>;
}): Promise<{ id: string }> {
  const result = await enhancedApiClient.post<{ id: string }>('/seedlings/with-deduct', {
    sourceId: data.sourceId,
    count: data.count,
    seedling: toBackendSeedlingPayload(data.seedling),
  });
  return result;
}

/**
 * 更新育苗记录
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function updateSeedling(id: string, updates: Partial<Seedling>): Promise<Seedling | null> {
  // 后端 PUT 用 Object.keys 原样拼字段，必须 snake_case；前端 camelCase 需转换
  const FIELD_TO_SNAKE: Record<string, string> = {
    seedlingCode: 'seedling_code',
    sourceId: 'source_id',
    sourceCode: 'source_name',
    productionPlanCode: 'production_plan_code',
    cropCode: 'crop_code',
    cropName: 'crop_name',
    cropVariety: 'crop_variety',
    seedlingType: 'seedling_type',
    seedlingForm: 'seedling_form', // 2026-06-27：种苗形态
    greenhouseName: 'greenhouse_name',
    siteName: 'greenhouse_name',
    areaName: 'area_name',
    siteId: 'area_name',
    startDate: 'seedling_date',
    expectedEndDate: 'expected_finish_date',
    endDate: 'actual_finish_date',
    initialCount: 'seedling_quantity',
    // 2026-06-15: survivalCount/plantedCount/lossCount 停止映射到旧字段（保留为派生读取）
    survivalRate: 'survival_rate',
    qualityGrade: 'quality_grade',
    workHours: 'work_hours',
    endType: 'end_type',
    endTime: 'end_time',
    targetSurvivalRate: 'target_survival_rate',
    targetSurvivalCount: 'target_survival_count',
    lossCount: 'loss_count',
    lossRate: 'loss_rate',
    printCount: 'print_count',
    chargePerson: 'charge_person',  // 2026-06-15: 负责人
  };
  const backendUpdates: Record<string, any> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) continue;
    const snake = FIELD_TO_SNAKE[k] ?? k;
    backendUpdates[snake] = v;
  }
  const result = await enhancedApiClient.put<any>(`/seedlings/${id}`, backendUpdates);
  return result as Seedling;
}

/**
 * 删除育苗记录
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function deleteSeedling(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/seedlings/${id}`);
  return true;
}

/**
 * 批量删除育苗记录
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function deleteSeedlings(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/seedlings/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 获取育苗的每日记录列表
 * 2026-06-05: modal 需要独立拉取，因为 GET /seedlings 列表不返回 dailyRecords 字段
 */
export async function getDailyRecords(seedlingId: string): Promise<DailyRecord[]> {
  try {
    const res = await enhancedApiClient.get<{ items?: DailyRecord[]; data?: DailyRecord[] }>(
      `/seedlings/${seedlingId}/daily-records?limit=200`
    );
    // 兼容多种响应结构
    const payload: any = res;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  } catch {
    return [];
  }
}

/**
 * 添加每日记录
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function addDailyRecord(seedlingId: string, record: Omit<DailyRecord, 'id' | 'seedlingId'>): Promise<DailyRecord | null> {
  try {
    return await enhancedApiClient.post<DailyRecord>(`/seedlings/${seedlingId}/daily-records`, record);
  } catch {
    return null;
  }
}

/**
 * 删除每日记录
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function deleteDailyRecord(seedlingId: string, recordId: string): Promise<boolean> {
  await enhancedApiClient.delete(`/seedlings/${seedlingId}/daily-records/${recordId}`);
  return true;
}

/**
 * 更新每日记录
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function updateDailyRecord(seedlingId: string, recordId: string, updates: Partial<DailyRecord>): Promise<boolean> {
  await enhancedApiClient.put(`/seedlings/${seedlingId}/daily-records/${recordId}`, updates);
  return true;
}

/**
 * 增加定植数量
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function increasePlantedCount(id: string, count: number): Promise<boolean> {
  await enhancedApiClient.post(`/seedlings/${id}/increase-planted`, { count });
  return true;
}

/**
 * 获取可移栽的育苗记录
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getTransplantReadySeedlings(): Promise<Seedling[]> {
  const data = await enhancedApiClient.get<BackendSeedling[]>('/seedlings/transplant-ready');
  return transformSeedlingFromBackend(data) as Seedling[];
}

/**
 * 获取可用移栽数量
 * 降级策略：API 失败返回0
 */
export async function getAvailableTransplantCount(id: string): Promise<number> {
  try {
    return await enhancedApiClient.get<number>(`/seedlings/${id}/available-count`);
  } catch {
    return 0;
  }
}

/**
 * 重置育苗数据（仅调用后端）
 */
export async function resetSeedlings(): Promise<void> {
  await enhancedApiClient.post('/seedlings/reset');
}

// ==================== 标签打印相关函数 ====================

/**
 * 生成标签编号
 * 降级策略：API 失败返回空字符串
 */
export async function generateLabelNumber(seedlingCode: string, index: number): Promise<string> {
  try {
    return await enhancedApiClient.get<string>(`/seedlings/label-number?code=${seedlingCode}&index=${index}`);
  } catch {
    return '';
  }
}

/**
 * 打印标签
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function printLabel(
  seedlingId: string,
  printType: string,
  printCount: number,
  operator: string,
  labelNumbers?: string[]
): Promise<PrintRecord | null> {
  try {
    return await enhancedApiClient.post<PrintRecord>(`/seedlings/${seedlingId}/print`, {
      printType,
      printCount,
      operator,
      labelNumbers
    });
  } catch {
    return null;
  }
}

/**
 * 批量打印标签
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function batchPrintLabel(seedlingIds: string[], operator: string): Promise<PrintRecord[]> {
  try {
    return await enhancedApiClient.post<PrintRecord[]>('/seedlings/batch-print', { seedlingIds, operator });
  } catch {
    return [];
  }
}

/**
 * 获取打印记录
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getPrintRecords(seedlingId: string): Promise<PrintRecord[]> {
  try {
    return await enhancedApiClient.get<PrintRecord[]>(`/seedlings/${seedlingId}/print-records`);
  } catch {
    return [];
  }
}

/**
 * 更新打印记录标签编号
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function updatePrintRecordLabelNumbers(seedlingId: string, printRecordId: string, labelNumbers: string[]): Promise<boolean> {
  await enhancedApiClient.put(`/seedlings/${seedlingId}/print-records/${printRecordId}`, { labelNumbers });
  return true;
}

// ==================== 栽种记录相关函数 ====================

/**
 * 添加栽种记录
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function addTransplantRecord(seedlingId: string, record: Omit<TransplantRecord, 'id' | 'createTime'>): Promise<TransplantRecord | null> {
  try {
    return await enhancedApiClient.post<TransplantRecord>(`/seedlings/${seedlingId}/transplant-records`, record);
  } catch {
    return null;
  }
}

/**
 * 获取栽种记录
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getTransplantRecords(seedlingId: string): Promise<TransplantRecord[]> {
  try {
    return await enhancedApiClient.get<TransplantRecord[]>(`/seedlings/${seedlingId}/transplant-records`);
  } catch {
    return [];
  }
}

/**
 * 更新栽种记录状态
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function updateTransplantRecordStatus(
  seedlingId: string,
  recordId: string,
  status: string
): Promise<boolean> {
  await enhancedApiClient.put(`/seedlings/${seedlingId}/transplant-records/${recordId}/status`, { status });
  return true;
}

// ==================== 栽种履历相关函数 ====================

/**
 * 添加栽种履历
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function addTransplantHistoryItem(
  seedlingId: string,
  labelNumber: string,
  historyItem: Omit<TransplantHistory['history'][0], 'id'>
): Promise<TransplantHistory | null> {
  try {
    return await enhancedApiClient.post<TransplantHistory>(`/seedlings/${seedlingId}/transplant-history/${labelNumber}`, historyItem);
  } catch {
    return null;
  }
}

/**
 * 获取栽种履历
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getTransplantHistory(seedlingId: string): Promise<TransplantHistory[]> {
  try {
    return await enhancedApiClient.get<TransplantHistory[]>(`/seedlings/${seedlingId}/transplant-history`);
  } catch {
    return [];
  }
}

/**
 * 获取标签栽种履历
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getLabelTransplantHistory(seedlingId: string, labelNumber: string): Promise<TransplantHistory | undefined> {
  try {
    return await enhancedApiClient.get<TransplantHistory>(`/seedlings/${seedlingId}/transplant-history/${labelNumber}`);
  } catch {
    return undefined;
  }
}

/**
 * 更新标签状态
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function updateLabelStatus(
  seedlingId: string,
  labelNumber: string,
  status: string
): Promise<boolean> {
  await enhancedApiClient.put(`/seedlings/${seedlingId}/transplant-history/${labelNumber}/status`, { status });
  return true;
}

/**
 * 生成所有标签编号
 * 降级策略：API 失败返回空数组
 */
export async function generateAllLabelNumbers(seedlingId: string): Promise<string[]> {
  try {
    return await enhancedApiClient.get<string[]>(`/seedlings/${seedlingId}/all-label-numbers`);
  } catch {
    return [];
  }
}
