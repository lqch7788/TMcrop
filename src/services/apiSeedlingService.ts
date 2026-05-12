/**
 * 育苗数据 API 服务
 * 对接后端 /api/seedlings
 * API失败时降级到 localStorage (seedlingService)
 */

import { enhancedApiClient } from '../lib/apiClient';
import { Seedling, DailyRecord, PrintRecord, TransplantRecord, TransplantHistory, SeedlingStatus } from '../types/crop';
import * as seedlingService from './seedlingService';

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
    categoryName: item.categoryName,
    typeName: item.typeName,
    varietyName: item.varietyName,
    subVarietyName: item.subVarietyName,
    varietyPath: varietyPath,
  };
}

// ==================== API 函数（降级到localStorage）====================

export async function getSeedlings(): Promise<Seedling[]> {
  try {
    const data = await apiClient.get<BackendSeedling[]>('/seedlings');
    return transformSeedlingFromBackend(data) as Seedling[];
  } catch (error) {
    console.warn('[育苗API] 获取失败，降级到localStorage:', error);
    return seedlingService.getSeedlings();
  }
}

export async function getSeedlingById(id: string): Promise<Seedling | undefined> {
  try {
    const data = await apiClient.get<BackendSeedling>(`/seedlings/${id}`);
    return transformSeedlingFromBackend(data) as Seedling;
  } catch (error) {
    console.warn('[育苗API] 获取单个失败，降级到localStorage:', error);
    return seedlingService.getSeedlingById(id);
  }
}

export async function getSeedlingsByIds(ids: string[]): Promise<Seedling[]> {
  try {
    const data = await apiClient.get<BackendSeedling[]>(`/seedlings/batch?ids=${ids.join(',')}`);
    return transformSeedlingFromBackend(data) as Seedling[];
  } catch (error) {
    console.warn('[育苗API] 批量获取失败，降级到localStorage:', error);
    return seedlingService.getSeedlingsByIds(ids);
  }
}

export async function getSeedlingsBySourceId(sourceId: string): Promise<Seedling[]> {
  try {
    const data = await apiClient.get<BackendSeedling[]>(`/seedlings/source/${sourceId}`);
    return transformSeedlingFromBackend(data) as Seedling[];
  } catch (error) {
    console.warn('[育苗API] 按种源获取失败，降级到localStorage:', error);
    return seedlingService.getSeedlingsBySourceId(sourceId);
  }
}

export async function generateSeedlingCode(): Promise<string> {
  return await apiClient.get<string>('/seedlings/generate-code');
}

export async function generateSeedlingCodeByDate(date: Date | string): Promise<string> {
  return await apiClient.get<string>('/seedlings/generate-code');
}

export async function addSeedling(seedling: Omit<Seedling, 'id' | 'createTime' | 'updateTime'>): Promise<Seedling> {
  try {
    const result = await apiClient.post<{ id: string }>('/seedlings', seedling);
    return { ...seedling, id: result.id } as Seedling;
  } catch (error) {
    console.warn('[育苗API] 创建失败，降级到localStorage:', error);
    return seedlingService.addSeedling(seedling);
  }
}

export async function updateSeedling(id: string, updates: Partial<Seedling>): Promise<Seedling | null> {
  try {
    const result = await apiClient.put<{ id: string }>(`/seedlings/${id}`, updates);
    return result ? { ...updates, id } as Seedling : null;
  } catch (error) {
    console.warn('[育苗API] 更新失败，降级到localStorage:', error);
    return seedlingService.updateSeedling(id, updates);
  }
}

export async function deleteSeedling(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/seedlings/${id}`);
    return true;
  } catch (error) {
    console.warn('[育苗API] 删除失败，降级到localStorage:', error);
    return seedlingService.deleteSeedling(id);
  }
}

export async function deleteSeedlings(ids: string[]): Promise<boolean> {
  try {
    await apiClient.delete(`/seedlings/batch?ids=${ids.join(',')}`);
    return true;
  } catch (error) {
    console.warn('[育苗API] 批量删除失败，降级到localStorage:', error);
    return seedlingService.deleteSeedlings(ids);
  }
}

export async function addDailyRecord(seedlingId: string, record: Omit<DailyRecord, 'id' | 'seedlingId'>): Promise<DailyRecord | null> {
  try {
    return await apiClient.post<DailyRecord>(`/seedlings/${seedlingId}/daily-records`, record);
  } catch (error) {
    console.warn('[育苗API] 添加每日记录失败，降级到localStorage:', error);
    return seedlingService.addDailyRecord(seedlingId, record);
  }
}

export async function deleteDailyRecord(seedlingId: string, recordId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/seedlings/${seedlingId}/daily-records/${recordId}`);
    return true;
  } catch (error) {
    console.warn('[育苗API] 删除每日记录失败，降级到localStorage:', error);
    return seedlingService.deleteDailyRecord(seedlingId, recordId);
  }
}

export async function updateDailyRecord(seedlingId: string, recordId: string, updates: Partial<DailyRecord>): Promise<boolean> {
  try {
    await apiClient.put(`/seedlings/${seedlingId}/daily-records/${recordId}`, updates);
    return true;
  } catch (error) {
    console.warn('[育苗API] 更新每日记录失败，降级到localStorage:', error);
    return seedlingService.updateDailyRecord(seedlingId, recordId, updates);
  }
}

export async function increasePlantedCount(id: string, count: number): Promise<boolean> {
  try {
    await apiClient.post(`/seedlings/${id}/increase-planted`, { count });
    return true;
  } catch (error) {
    console.warn('[育苗API] 增加定植数量失败，降级到localStorage:', error);
    return seedlingService.increasePlantedCount(id, count);
  }
}

export async function getTransplantReadySeedlings(): Promise<Seedling[]> {
  return await apiClient.get<Seedling[]>('/seedlings/transplant-ready');
}

export async function getAvailableTransplantCount(id: string): Promise<number> {
  return await apiClient.get<number>(`/seedlings/${id}/available-count`);
}

export async function resetSeedlings(): Promise<void> {
  await apiClient.post('/seedlings/reset');
}

// ==================== 标签打印相关函数 ====================

export async function generateLabelNumber(seedlingCode: string, index: number): Promise<string> {
  return await apiClient.get<string>(`/seedlings/label-number?code=${seedlingCode}&index=${index}`);
}

export async function printLabel(
  seedlingId: string,
  printType: string,
  printCount: number,
  operator: string,
  labelNumbers?: string[]
): Promise<PrintRecord | null> {
  return await apiClient.post<PrintRecord>(`/seedlings/${seedlingId}/print`, {
    printType,
    printCount,
    operator,
    labelNumbers
  });
}

export async function batchPrintLabel(seedlingIds: string[], operator: string): Promise<PrintRecord[]> {
  return await apiClient.post<PrintRecord[]>('/seedlings/batch-print', { seedlingIds, operator });
}

export async function getPrintRecords(seedlingId: string): Promise<PrintRecord[]> {
  return await apiClient.get<PrintRecord[]>(`/seedlings/${seedlingId}/print-records`);
}

export async function updatePrintRecordLabelNumbers(seedlingId: string, printRecordId: string, labelNumbers: string[]): Promise<boolean> {
  await apiClient.put(`/seedlings/${seedlingId}/print-records/${printRecordId}`, { labelNumbers });
  return true;
}

// ==================== 栽种记录相关函数 ====================

export async function addTransplantRecord(seedlingId: string, record: Omit<TransplantRecord, 'id' | 'createTime'>): Promise<TransplantRecord | null> {
  return await apiClient.post<TransplantRecord>(`/seedlings/${seedlingId}/transplant-records`, record);
}

export async function getTransplantRecords(seedlingId: string): Promise<TransplantRecord[]> {
  return await apiClient.get<TransplantRecord[]>(`/seedlings/${seedlingId}/transplant-records`);
}

export async function updateTransplantRecordStatus(
  seedlingId: string,
  recordId: string,
  status: string
): Promise<boolean> {
  await apiClient.put(`/seedlings/${seedlingId}/transplant-records/${recordId}/status`, { status });
  return true;
}

// ==================== 栽种履历相关函数 ====================

export async function addTransplantHistoryItem(
  seedlingId: string,
  labelNumber: string,
  historyItem: Omit<TransplantHistory['history'][0], 'id'>
): Promise<TransplantHistory | null> {
  return await apiClient.post<TransplantHistory>(`/seedlings/${seedlingId}/transplant-history/${labelNumber}`, historyItem);
}

export async function getTransplantHistory(seedlingId: string): Promise<TransplantHistory[]> {
  return await apiClient.get<TransplantHistory[]>(`/seedlings/${seedlingId}/transplant-history`);
}

export async function getLabelTransplantHistory(seedlingId: string, labelNumber: string): Promise<TransplantHistory | undefined> {
  return await apiClient.get<TransplantHistory>(`/seedlings/${seedlingId}/transplant-history/${labelNumber}`);
}

export async function updateLabelStatus(
  seedlingId: string,
  labelNumber: string,
  status: string
): Promise<boolean> {
  await apiClient.put(`/seedlings/${seedlingId}/transplant-history/${labelNumber}/status`, { status });
  return true;
}

export async function generateAllLabelNumbers(seedlingId: string): Promise<string[]> {
  return await apiClient.get<string[]>(`/seedlings/${seedlingId}/all-label-numbers`);
}
