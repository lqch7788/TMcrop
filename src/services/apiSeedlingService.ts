/**
 * 育苗数据 API 服务
 * 对接后端 /api/seedlings
 */

import { apiClient, USE_API } from './apiClient';
import { Seedling, DailyRecord, PrintRecord, TransplantRecord, TransplantHistory, SeedlingStatus } from '../types/crop';

// 导入本地服务作为回退
import * as localService from './seedlingService';

// 后端返回的原始数据字段类型（已经过 queryToObjects 转换为驼峰命名）
// 但字段名与前端 Seedling 类型不完全匹配，需要转换
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
  [key: string]: any;
}

/**
 * 将后端返回的字段名映射到前端 Seedling 类型
 * 后端 queryToObjects 已将下划线转为驼峰，但字段名与前端不完全匹配
 */
function transformSeedlingFromBackend(data: BackendSeedling | BackendSeedling[]): Seedling | BackendSeedling[] {
  if (Array.isArray(data)) {
    return data.map(item => transformSingleSeedling(item));
  }
  return transformSingleSeedling(data);
}

function transformSingleSeedling(item: BackendSeedling): Seedling {
  // 解析图片字段（可能是 JSON 字符串）
  let pictures: string[] = [];
  if (item.pictures) {
    try {
      pictures = JSON.parse(item.pictures);
    } catch {
      pictures = [];
    }
  }

  // 处理状态映射
  let status: SeedlingStatus = SeedlingStatus.IN_PROGRESS;
  if (item.status === 'transplant_ready') {
    status = SeedlingStatus.TRANSPLANT_READY;
  } else if (item.status === 'completed') {
    status = SeedlingStatus.COMPLETED;
  } else if (item.status === 'abnormal') {
    status = SeedlingStatus.ABNORMAL;
  }

  // 处理 survivalRate：如果后端存储的是无效值（如日期字符串或大于100），则用 survivalCount / initialCount 计算
  let survivalRate = item.survivalRate;
  if (typeof survivalRate !== 'number' || isNaN(survivalRate) || survivalRate > 100 || survivalRate < 0) {
    // survivalRate 可能是日期或其他无效值，重新计算
    const initialCount = item.seedlingQuantity || 0;
    const survivalCount = item.survivalQuantity || 0;
    survivalRate = initialCount > 0 ? Math.round((survivalCount / initialCount) * 100) : 0;
  }

  return {
    id: item.id,
    seedlingCode: item.seedlingCode,
    sourceId: item.sourceId || '',
    sourceCode: item.sourceName || '', // 使用 sourceName 显示种源名称
    productionPlanCode: item.productionPlanCode || '',
    cropName: item.cropName,
    cropVariety: item.cropName || '', // 后端没有单独的 cropVariety，用 cropName 代替（显示作物品种）
    cropCode: '', // 后端没有 cropCode，留空让表格组件从品种库查询
    seedlingType: item.seedlingType || '',
    siteId: '',
    siteName: item.greenhouseName || item.areaName || '', // 优先使用 greenhouseName
    startDate: item.seedlingDate ? item.seedlingDate.split('T')[0] : '', // 格式化日期为 YYYY-MM-DD
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
    createTime: item.createTime ? item.createTime.split('T')[0] : '', // 格式化日期为 YYYY-MM-DD
    updateTime: item.updateTime || '',
    // 关联字段
    instanceId: undefined,
    orderId: undefined,
    orderCode: undefined,
    // 补充字段
    orgName: undefined,
    seedlingTaskTime: undefined,
    planType: undefined,
    targetSurvivalRate: undefined,
    targetSurvivalCount: item.targetSurvivalCount,
    chargePerson: item.chargePerson,
    productionPlanId: undefined,
    calculateMode: undefined,
    motherPlantCount: undefined,
    propagationMultiple: undefined,
    theoreticalYield: undefined,
  };
}

/**
 * 获取所有育苗数据
 */
export async function getSeedlings(): Promise<Seedling[]> {
  if (USE_API) {
    const data = await apiClient.get<BackendSeedling[]>('/seedlings');
    return transformSeedlingFromBackend(data) as Seedling[];
  }
  return localService.getSeedlings();
}

/**
 * 根据ID获取单条育苗记录
 */
export async function getSeedlingById(id: string): Promise<Seedling | undefined> {
  if (USE_API) {
    const data = await apiClient.get<BackendSeedling>(`/seedlings/${id}`);
    return transformSeedlingFromBackend(data) as Seedling;
  }
  return localService.getSeedlingById(id);
}

/**
 * 根据ID数组获取多条育苗记录
 */
export async function getSeedlingsByIds(ids: string[]): Promise<Seedling[]> {
  if (USE_API) {
    const data = await apiClient.get<BackendSeedling[]>(`/seedlings/batch?ids=${ids.join(',')}`);
    return transformSeedlingFromBackend(data) as Seedling[];
  }
  return localService.getSeedlingsByIds(ids);
}

/**
 * 根据来源ID获取育苗记录（用于级联查询）
 */
export async function getSeedlingsBySourceId(sourceId: string): Promise<Seedling[]> {
  if (USE_API) {
    const data = await apiClient.get<BackendSeedling[]>(`/seedlings/source/${sourceId}`);
    return transformSeedlingFromBackend(data) as Seedling[];
  }
  return localService.getSeedlingsBySourceId(sourceId);
}

/**
 * 生成育苗批号
 */
export async function generateSeedlingCode(): Promise<string> {
  if (USE_API) {
    return apiClient.get<string>('/seedlings/generate-code');
  }
  return localService.generateSeedlingCode();
}

/**
 * 添加新育苗记录
 */
export async function addSeedling(seedling: Omit<Seedling, 'id' | 'createTime' | 'updateTime'>): Promise<Seedling> {
  if (USE_API) {
    const result = await apiClient.post<{ id: string }>('/seedlings', seedling);
    return { ...seedling, id: result.id } as Seedling;
  }
  return localService.addSeedling(seedling);
}

/**
 * 更新育苗记录
 */
export async function updateSeedling(id: string, updates: Partial<Seedling>): Promise<Seedling | null> {
  if (USE_API) {
    const result = await apiClient.put<{ id: string }>(`/seedlings/${id}`, updates);
    return result ? { ...updates, id } as Seedling : null;
  }
  return localService.updateSeedling(id, updates);
}

/**
 * 删除育苗记录
 */
export async function deleteSeedling(id: string): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/seedlings/${id}`);
    return true;
  }
  return localService.deleteSeedling(id);
}

/**
 * 批量删除育苗记录
 */
export async function deleteSeedlings(ids: string[]): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/seedlings/batch?ids=${ids.join(',')}`);
    return true;
  }
  return localService.deleteSeedlings(ids);
}

/**
 * 添加每日记录
 */
export async function addDailyRecord(seedlingId: string, record: Omit<DailyRecord, 'id' | 'seedlingId'>): Promise<DailyRecord | null> {
  if (USE_API) {
    const result = await apiClient.post<DailyRecord>(`/seedlings/${seedlingId}/daily-records`, record);
    return result;
  }
  return localService.addDailyRecord(seedlingId, record);
}

/**
 * 删除每日记录
 */
export async function deleteDailyRecord(seedlingId: string, recordId: string): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/seedlings/${seedlingId}/daily-records/${recordId}`);
    return true;
  }
  return localService.deleteDailyRecord(seedlingId, recordId);
}

/**
 * 更新每日记录
 */
export async function updateDailyRecord(seedlingId: string, recordId: string, updates: Partial<DailyRecord>): Promise<boolean> {
  if (USE_API) {
    await apiClient.put(`/seedlings/${seedlingId}/daily-records/${recordId}`, updates);
    return true;
  }
  return localService.updateDailyRecord(seedlingId, recordId, updates);
}

/**
 * 增加已定植数量（定植操作时调用）
 */
export async function increasePlantedCount(id: string, count: number): Promise<boolean> {
  if (USE_API) {
    await apiClient.post(`/seedlings/${id}/increase-planted`, { count });
    return true;
  }
  return localService.increasePlantedCount(id, count);
}

/**
 * 获取可定植的育苗列表
 */
export async function getTransplantReadySeedlings(): Promise<Seedling[]> {
  if (USE_API) {
    return apiClient.get<Seedling[]>('/seedlings/transplant-ready');
  }
  return localService.getTransplantReadySeedlings();
}

/**
 * 获取指定育苗的可定植数量
 */
export async function getAvailableTransplantCount(id: string): Promise<number> {
  if (USE_API) {
    return apiClient.get<number>(`/seedlings/${id}/available-count`);
  }
  return localService.getAvailableTransplantCount(id);
}

/**
 * 重置数据到默认状态
 */
export async function resetSeedlings(): Promise<void> {
  if (USE_API) {
    await apiClient.post('/seedlings/reset');
  }
  return localService.resetSeedlings();
}

// ==================== 标签打印相关函数 ====================

/**
 * 生成单个二维码编号
 */
export async function generateLabelNumber(seedlingCode: string, index: number): Promise<string> {
  if (USE_API) {
    return apiClient.get<string>(`/seedlings/label-number?code=${seedlingCode}&index=${index}`);
  }
  return localService.generateLabelNumber(seedlingCode, index);
}

/**
 * 打印标签
 */
export async function printLabel(
  seedlingId: string,
  printType: string,
  printCount: number,
  operator: string,
  labelNumbers?: string[]
): Promise<PrintRecord | null> {
  if (USE_API) {
    return apiClient.post<PrintRecord>(`/seedlings/${seedlingId}/print`, {
      printType,
      printCount,
      operator,
      labelNumbers
    });
  }
  return localService.printLabel(seedlingId, printType as any, printCount, operator, labelNumbers);
}

/**
 * 批量打印标签
 */
export async function batchPrintLabel(seedlingIds: string[], operator: string): Promise<PrintRecord[]> {
  if (USE_API) {
    return apiClient.post<PrintRecord[]>('/seedlings/batch-print', { seedlingIds, operator });
  }
  return localService.batchPrintLabel(seedlingIds, operator);
}

/**
 * 获取打印记录
 */
export async function getPrintRecords(seedlingId: string): Promise<PrintRecord[]> {
  if (USE_API) {
    return apiClient.get<PrintRecord[]>(`/seedlings/${seedlingId}/print-records`);
  }
  return localService.getPrintRecords(seedlingId);
}

/**
 * 更新打印记录（用于追加二维码编号）
 */
export async function updatePrintRecordLabelNumbers(seedlingId: string, printRecordId: string, labelNumbers: string[]): Promise<boolean> {
  if (USE_API) {
    await apiClient.put(`/seedlings/${seedlingId}/print-records/${printRecordId}`, { labelNumbers });
    return true;
  }
  return localService.updatePrintRecordLabelNumbers(seedlingId, printRecordId, labelNumbers);
}

// ==================== 栽种记录相关函数 ====================

/**
 * 添加栽种记录
 */
export async function addTransplantRecord(seedlingId: string, record: Omit<TransplantRecord, 'id' | 'createTime'>): Promise<TransplantRecord | null> {
  if (USE_API) {
    return apiClient.post<TransplantRecord>(`/seedlings/${seedlingId}/transplant-records`, record);
  }
  return localService.addTransplantRecord(seedlingId, record);
}

/**
 * 获取栽种记录列表
 */
export async function getTransplantRecords(seedlingId: string): Promise<TransplantRecord[]> {
  if (USE_API) {
    return apiClient.get<TransplantRecord[]>(`/seedlings/${seedlingId}/transplant-records`);
  }
  return localService.getTransplantRecords(seedlingId);
}

/**
 * 更新栽种记录状态
 */
export async function updateTransplantRecordStatus(
  seedlingId: string,
  recordId: string,
  status: string
): Promise<boolean> {
  if (USE_API) {
    await apiClient.put(`/seedlings/${seedlingId}/transplant-records/${recordId}/status`, { status });
    return true;
  }
  return localService.updateTransplantRecordStatus(seedlingId, recordId, status as any);
}

// ==================== 栽种履历相关函数 ====================

/**
 * 添加栽种履历条目
 */
export async function addTransplantHistoryItem(
  seedlingId: string,
  labelNumber: string,
  historyItem: Omit<TransplantHistory['history'][0], 'id'>
): Promise<TransplantHistory | null> {
  if (USE_API) {
    return apiClient.post<TransplantHistory>(`/seedlings/${seedlingId}/transplant-history/${labelNumber}`, historyItem);
  }
  return localService.addTransplantHistoryItem(seedlingId, labelNumber, historyItem);
}

/**
 * 获取栽种履历列表
 */
export async function getTransplantHistory(seedlingId: string): Promise<TransplantHistory[]> {
  if (USE_API) {
    return apiClient.get<TransplantHistory[]>(`/seedlings/${seedlingId}/transplant-history`);
  }
  return localService.getTransplantHistory(seedlingId);
}

/**
 * 获取指定二维码的履历
 */
export async function getLabelTransplantHistory(seedlingId: string, labelNumber: string): Promise<TransplantHistory | undefined> {
  if (USE_API) {
    return apiClient.get<TransplantHistory>(`/seedlings/${seedlingId}/transplant-history/${labelNumber}`);
  }
  return localService.getLabelTransplantHistory(seedlingId, labelNumber);
}

/**
 * 更新履历中二维码的状态
 */
export async function updateLabelStatus(
  seedlingId: string,
  labelNumber: string,
  status: string
): Promise<boolean> {
  if (USE_API) {
    await apiClient.put(`/seedlings/${seedlingId}/transplant-history/${labelNumber}/status`, { status });
    return true;
  }
  return localService.updateLabelStatus(seedlingId, labelNumber, status as any);
}

/**
 * 生成育苗批号对应的所有二维码编号
 */
export async function generateAllLabelNumbers(seedlingId: string): Promise<string[]> {
  if (USE_API) {
    return apiClient.get<string[]>(`/seedlings/${seedlingId}/all-label-numbers`);
  }
  return localService.generateAllLabelNumbers(seedlingId);
}
