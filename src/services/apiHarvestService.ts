/**
 * 采收入库数据 API 服务
 * 对接后端 /api/harvest
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { HarvestRecord } from '../types/index';

/**
 * 初始化数据
 * 降级策略：API → IndexedDB 缓存
 */
export async function initHarvestRecords(): Promise<HarvestRecord[]> {
  return await enhancedApiClient.get<HarvestRecord[]>('/harvest/init');
}

/**
 * 获取所有采收记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getHarvestRecords(): Promise<HarvestRecord[]> {
  return await enhancedApiClient.get<HarvestRecord[]>('/harvest');
}

/**
 * 根据ID获取单条记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getHarvestRecordById(id: string): Promise<HarvestRecord | undefined> {
  return await enhancedApiClient.get<HarvestRecord>(`/harvest/${id}`);
}

/**
 * 根据ID数组获取多条记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getHarvestRecordsByIds(ids: string[]): Promise<HarvestRecord[]> {
  return await enhancedApiClient.get<HarvestRecord[]>(`/harvest/batch?ids=${ids.join(',')}`);
}

/**
 * 根据批次号获取采收记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getHarvestRecordsByBatchCode(batchCode: string): Promise<HarvestRecord[]> {
  return await enhancedApiClient.get<HarvestRecord[]>(`/harvest/batch-code/${batchCode}`);
}

/**
 * 添加新记录
 * 降级策略：API → 离线队列
 */
export async function addHarvestRecord(record: Omit<HarvestRecord, 'id'>): Promise<HarvestRecord> {
  const result = await enhancedApiClient.post<{ id: string }>('/harvest', record);
  return { ...record, id: result.id } as HarvestRecord;
}

/**
 * 批量添加记录
 * 降级策略：API → 离线队列
 */
export async function addHarvestRecords(newRecords: Omit<HarvestRecord, 'id'>[]): Promise<HarvestRecord[]> {
  return await enhancedApiClient.post<HarvestRecord[]>('/harvest/batch', newRecords);
}

/**
 * 更新记录
 * 降级策略：API → 离线队列
 */
export async function updateHarvestRecord(id: string, updates: Partial<HarvestRecord>): Promise<HarvestRecord | null> {
  const result = await enhancedApiClient.put<{ id: string }>(`/harvest/${id}`, updates);
  return result ? { ...updates, id } as HarvestRecord : null;
}

/**
 * 删除记录
 * 降级策略：API → 离线队列
 */
export async function deleteHarvestRecord(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/harvest/${id}`);
  return true;
}

/**
 * 批量删除记录
 * 降级策略：API → 离线队列
 */
export async function deleteHarvestRecords(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/harvest/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 生成采收单号
 * 降级策略：API 失败返回空字符串
 */
export async function generateHarvestCode(): Promise<string> {
  try {
    return await enhancedApiClient.get<string>('/harvest/generate-code');
  } catch {
    return '';
  }
}

/**
 * 重置数据到默认状态（仅调用后端）
 */
export async function resetHarvestRecords(): Promise<void> {
  await enhancedApiClient.post('/harvest/reset');
}
