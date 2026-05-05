/**
 * 采收入库数据 API 服务
 * 对接后端 /api/harvest
 */

import { apiClient } from './apiClient';
import { HarvestRecord } from '../types/index';

// 导入本地服务作为回退
import * as localService from './harvestService';

/**
 * 初始化数据 - 从localStorage读取或使用默认数据
 */
export async function initHarvestRecords(): Promise<HarvestRecord[]> {
  try {
    return await apiClient.get<HarvestRecord[]>('/harvest/init');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.initHarvestRecords();
  }
}

/**
 * 获取所有采收记录
 */
export async function getHarvestRecords(): Promise<HarvestRecord[]> {
  try {
    return await apiClient.get<HarvestRecord[]>('/harvest');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getHarvestRecords();
  }
}

/**
 * 根据ID获取单条记录
 */
export async function getHarvestRecordById(id: string): Promise<HarvestRecord | undefined> {
  try {
    return await apiClient.get<HarvestRecord>(`/harvest/${id}`);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getHarvestRecordById(id);
  }
}

/**
 * 根据ID数组获取多条记录
 */
export async function getHarvestRecordsByIds(ids: string[]): Promise<HarvestRecord[]> {
  try {
    return await apiClient.get<HarvestRecord[]>(`/harvest/batch?ids=${ids.join(',')}`);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getHarvestRecordsByIds(ids);
  }
}

/**
 * 根据批次号获取采收记录
 */
export async function getHarvestRecordsByBatchCode(batchCode: string): Promise<HarvestRecord[]> {
  try {
    return await apiClient.get<HarvestRecord[]>(`/harvest/batch-code/${batchCode}`);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getHarvestRecordsByBatchCode(batchCode);
  }
}

/**
 * 添加新记录
 */
export async function addHarvestRecord(record: Omit<HarvestRecord, 'id'>): Promise<HarvestRecord> {
  try {
    const result = await apiClient.post<{ id: string }>('/harvest', record);
    return { ...record, id: result.id } as HarvestRecord;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.addHarvestRecord(record);
  }
}

/**
 * 批量添加记录
 */
export async function addHarvestRecords(newRecords: Omit<HarvestRecord, 'id'>[]): Promise<HarvestRecord[]> {
  try {
    return await apiClient.post<HarvestRecord[]>('/harvest/batch', newRecords);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.addHarvestRecords(newRecords);
  }
}

/**
 * 更新记录
 */
export async function updateHarvestRecord(id: string, updates: Partial<HarvestRecord>): Promise<HarvestRecord | null> {
  try {
    const result = await apiClient.put<{ id: string }>(`/harvest/${id}`, updates);
    return result ? { ...updates, id } as HarvestRecord : null;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.updateHarvestRecord(id, updates);
  }
}

/**
 * 删除记录
 */
export async function deleteHarvestRecord(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/harvest/${id}`);
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.deleteHarvestRecord(id);
  }
}

/**
 * 批量删除记录
 */
export async function deleteHarvestRecords(ids: string[]): Promise<boolean> {
  try {
    await apiClient.delete(`/harvest/batch?ids=${ids.join(',')}`);
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.deleteHarvestRecords(ids);
  }
}

/**
 * 生成采收单号
 */
export async function generateHarvestCode(): Promise<string> {
  try {
    return await apiClient.get<string>('/harvest/generate-code');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.generateHarvestCode();
  }
}

/**
 * 重置数据到默认状态
 */
export async function resetHarvestRecords(): Promise<void> {
  try {
    await apiClient.post('/harvest/reset');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
  }
  return localService.resetHarvestRecords();
}
