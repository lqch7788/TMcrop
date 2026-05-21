/**
 * 育苗数据 API 服务
 * 对接后端 /api/seedlings
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
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
  targetSurvivalCount?: number;
  categoryName?: string;
  typeName?: string;
  varietyName?: string;
  subVarietyName?: string;
  sourceCode?: string;
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

  let status: SeedlingStatus = SeedlingStatus.IN_PROGRESS;
  if (item.status === 'transplant_ready') {
    status = SeedlingStatus.TRANSPLANT_READY;
  } else if (item.status === 'completed') {
    status = SeedlingStatus.COMPLETED;
  } else if (item.status === 'abnormal') {
    status = SeedlingStatus.ABNORMAL;
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
    siteId: '',
    siteName: item.greenhouseName || item.areaName || '',
    startDate: item.seedlingDate ? item.seedlingDate.split('T')[0] : '',
    expectedEndDate: item.expectedFinishDate ? item.expectedFinishDate.split('T')[0] : '',
    endDate: item.actualFinishDate ? item.actualFinishDate.split('T')[0] : '',
    initialCount: item.seedlingQuantity || 0,
    survivalCount: item.survivalQuantity || 0,
    plantedCount: 0,
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
    seedlingTaskTime: item.workHours || item.work_hours || undefined,
    planType: undefined,
    targetSurvivalRate: undefined,
    targetSurvivalCount: item.targetSurvivalCount,
    chargePerson: item.chargePerson,
    productionPlanId: undefined,
    calculateMode: undefined,
    motherPlantCount: undefined,
    propagationMultiple: undefined,
    theoreticalYield: undefined,
    categoryName: item.categoryName,
    typeName: item.typeName,
    varietyName: item.varietyName,
    subVarietyName: item.subVarietyName,
    varietyPath: varietyPath,
  };
}

/**
 * 获取所有育苗记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getSeedlings(): Promise<Seedling[]> {
  const data = await enhancedApiClient.get<BackendSeedling[]>('/seedlings');
  return transformSeedlingFromBackend(data) as Seedling[];
}

/**
 * 根据ID获取单个育苗记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getSeedlingById(id: string): Promise<Seedling | undefined> {
  const data = await enhancedApiClient.get<BackendSeedling>(`/seedlings/${id}`);
  return transformSeedlingFromBackend(data) as Seedling;
}

/**
 * 根据ID数组获取多个育苗记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getSeedlingsByIds(ids: string[]): Promise<Seedling[]> {
  const data = await enhancedApiClient.get<BackendSeedling[]>(`/seedlings/batch?ids=${ids.join(',')}`);
  return transformSeedlingFromBackend(data) as Seedling[];
}

/**
 * 根据种源ID获取育苗记录
 * 降级策略：API → IndexedDB 缓存
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
export async function generateSeedlingCodeByDate(date: Date | string): Promise<string> {
  try {
    return await enhancedApiClient.get<string>('/seedlings/generate-code');
  } catch {
    return '';
  }
}

/**
 * 创建育苗记录
 * 降级策略：API → 离线队列
 */
export async function addSeedling(seedling: Omit<Seedling, 'id' | 'createTime' | 'updateTime'>): Promise<Seedling> {
  const result = await enhancedApiClient.post<{ id: string }>('/seedlings', seedling);
  return { ...seedling, id: result.id } as Seedling;
}

/**
 * 更新育苗记录
 * 降级策略：API → 离线队列
 */
export async function updateSeedling(id: string, updates: Partial<Seedling>): Promise<Seedling | null> {
  const result = await enhancedApiClient.put<{ id: string }>(`/seedlings/${id}`, updates);
  return result ? { ...updates, id } as Seedling : null;
}

/**
 * 删除育苗记录
 * 降级策略：API → 离线队列
 */
export async function deleteSeedling(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/seedlings/${id}`);
  return true;
}

/**
 * 批量删除育苗记录
 * 降级策略：API → 离线队列
 */
export async function deleteSeedlings(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/seedlings/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 添加每日记录
 * 降级策略：API → 离线队列
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
 * 降级策略：API → 离线队列
 */
export async function deleteDailyRecord(seedlingId: string, recordId: string): Promise<boolean> {
  await enhancedApiClient.delete(`/seedlings/${seedlingId}/daily-records/${recordId}`);
  return true;
}

/**
 * 更新每日记录
 * 降级策略：API → 离线队列
 */
export async function updateDailyRecord(seedlingId: string, recordId: string, updates: Partial<DailyRecord>): Promise<boolean> {
  await enhancedApiClient.put(`/seedlings/${seedlingId}/daily-records/${recordId}`, updates);
  return true;
}

/**
 * 增加定植数量
 * 降级策略：API → 离线队列
 */
export async function increasePlantedCount(id: string, count: number): Promise<boolean> {
  await enhancedApiClient.post(`/seedlings/${id}/increase-planted`, { count });
  return true;
}

/**
 * 获取可移栽的育苗记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getTransplantReadySeedlings(): Promise<Seedling[]> {
  const data = await enhancedApiClient.get<Seedling[]>('/seedlings/transplant-ready');
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
 * 降级策略：API → 离线队列
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
 * 降级策略：API → 离线队列
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
 * 降级策略：API → IndexedDB 缓存
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
 * 降级策略：API → 离线队列
 */
export async function updatePrintRecordLabelNumbers(seedlingId: string, printRecordId: string, labelNumbers: string[]): Promise<boolean> {
  await enhancedApiClient.put(`/seedlings/${seedlingId}/print-records/${printRecordId}`, { labelNumbers });
  return true;
}

// ==================== 栽种记录相关函数 ====================

/**
 * 添加栽种记录
 * 降级策略：API → 离线队列
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
 * 降级策略：API → IndexedDB 缓存
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
 * 降级策略：API → 离线队列
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
 * 降级策略：API → 离线队列
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
 * 降级策略：API → IndexedDB 缓存
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
 * 降级策略：API → IndexedDB 缓存
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
 * 降级策略：API → 离线队列
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
