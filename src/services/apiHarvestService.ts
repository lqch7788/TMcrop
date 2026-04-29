/**
 * 采收入库数据 API 服务
 * 对接后端 /api/harvest
 */

import { apiClient, USE_API } from './apiClient';
import { HarvestRecord } from '../types/index';

// 导入本地服务作为回退
import * as localService from './harvestService';

/**
 * 初始化数据 - 从localStorage读取或使用默认数据
 */
export async function initHarvestRecords(): Promise<HarvestRecord[]> {
  if (USE_API) {
    return apiClient.get<HarvestRecord[]>('/harvest/init');
  }
  return localService.initHarvestRecords();
}

/**
 * 获取所有采收记录
 */
export async function getHarvestRecords(): Promise<HarvestRecord[]> {
  if (USE_API) {
    return apiClient.get<HarvestRecord[]>('/harvest');
  }
  return localService.getHarvestRecords();
}

/**
 * 根据ID获取单条记录
 */
export async function getHarvestRecordById(id: string): Promise<HarvestRecord | undefined> {
  if (USE_API) {
    return apiClient.get<HarvestRecord>(`/harvest/${id}`);
  }
  return localService.getHarvestRecordById(id);
}

/**
 * 根据ID数组获取多条记录
 */
export async function getHarvestRecordsByIds(ids: string[]): Promise<HarvestRecord[]> {
  if (USE_API) {
    return apiClient.get<HarvestRecord[]>(`/harvest/batch?ids=${ids.join(',')}`);
  }
  return localService.getHarvestRecordsByIds(ids);
}

/**
 * 根据批次号获取采收记录
 */
export async function getHarvestRecordsByBatchCode(batchCode: string): Promise<HarvestRecord[]> {
  if (USE_API) {
    return apiClient.get<HarvestRecord[]>(`/harvest/batch-code/${batchCode}`);
  }
  return localService.getHarvestRecordsByBatchCode(batchCode);
}

/**
 * 添加新记录
 */
export async function addHarvestRecord(record: Omit<HarvestRecord, 'id'>): Promise<HarvestRecord> {
  if (USE_API) {
    const result = await apiClient.post<{ id: string }>('/harvest', record);
    return { ...record, id: result.id } as HarvestRecord;
  }
  return localService.addHarvestRecord(record);
}

/**
 * 批量添加记录
 */
export async function addHarvestRecords(newRecords: Omit<HarvestRecord, 'id'>[]): Promise<HarvestRecord[]> {
  if (USE_API) {
    return apiClient.post<HarvestRecord[]>('/harvest/batch', newRecords);
  }
  return localService.addHarvestRecords(newRecords);
}

/**
 * 更新记录
 */
export async function updateHarvestRecord(id: string, updates: Partial<HarvestRecord>): Promise<HarvestRecord | null> {
  if (USE_API) {
    const result = await apiClient.put<{ id: string }>(`/harvest/${id}`, updates);
    return result ? { ...updates, id } as HarvestRecord : null;
  }
  return localService.updateHarvestRecord(id, updates);
}

/**
 * 删除记录
 */
export async function deleteHarvestRecord(id: string): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/harvest/${id}`);
    return true;
  }
  return localService.deleteHarvestRecord(id);
}

/**
 * 批量删除记录
 */
export async function deleteHarvestRecords(ids: string[]): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/harvest/batch?ids=${ids.join(',')}`);
    return true;
  }
  return localService.deleteHarvestRecords(ids);
}

/**
 * 生成采收单号
 */
export async function generateHarvestCode(): Promise<string> {
  if (USE_API) {
    return apiClient.get<string>('/harvest/generate-code');
  }
  return localService.generateHarvestCode();
}

/**
 * 重置数据到默认状态
 */
export async function resetHarvestRecords(): Promise<void> {
  if (USE_API) {
    await apiClient.post('/harvest/reset');
  }
  return localService.resetHarvestRecords();
}
