/**
 * 采收入库数据 API 服务
 * 对接后端 /api/harvest
 *
 * 数据流：组件 → enhancedApiClient → 后端 Express → SQLite
 * 架构铁律：API 直接对接数据库，不做降级缓存。
 */

import { enhancedApiClient } from '../lib/apiClient';
import { HarvestRecord } from '../types/index';

/**
 * 初始化数据
 */
export async function initHarvestRecords(): Promise<HarvestRecord[]> {
  return await enhancedApiClient.get<HarvestRecord[]>('/harvest/init');
}

/**
 * 获取所有采收记录
 */
export async function getHarvestRecords(): Promise<HarvestRecord[]> {
  return await enhancedApiClient.get<HarvestRecord[]>('/harvest');
}

/**
 * 根据ID获取单条记录
 */
export async function getHarvestRecordById(id: string): Promise<HarvestRecord | undefined> {
  return await enhancedApiClient.get<HarvestRecord>(`/harvest/${id}`);
}

/**
 * 根据ID数组获取多条记录
 */
export async function getHarvestRecordsByIds(ids: string[]): Promise<HarvestRecord[]> {
  return await enhancedApiClient.get<HarvestRecord[]>(`/harvest/batch?ids=${ids.join(',')}`);
}

/**
 * 根据批次号获取采收记录
 */
export async function getHarvestRecordsByBatchCode(batchCode: string): Promise<HarvestRecord[]> {
  return await enhancedApiClient.get<HarvestRecord[]>(`/harvest/batch-code/${batchCode}`);
}

/**
 * 添加新记录
 */
export async function addHarvestRecord(record: Omit<HarvestRecord, 'id'>): Promise<HarvestRecord> {
  const result = await enhancedApiClient.post<{ id: string }>('/harvest', record);
  return { ...record, id: result.id } as HarvestRecord;
}

/**
 * 批量添加记录
 */
export async function addHarvestRecords(newRecords: Omit<HarvestRecord, 'id'>[]): Promise<HarvestRecord[]> {
  return await enhancedApiClient.post<HarvestRecord[]>('/harvest/batch', newRecords);
}

/**
 * 更新记录
 */
export async function updateHarvestRecord(id: string, updates: Partial<HarvestRecord>): Promise<HarvestRecord | null> {
  const result = await enhancedApiClient.put<{ id: string }>(`/harvest/${id}`, updates);
  return result ? { ...updates, id } as HarvestRecord : null;
}

/**
 * 删除记录
 */
export async function deleteHarvestRecord(id: string): Promise<boolean> {
  // 防御空 id：避免 DELETE /api/harvest/ 这种无效请求打到后端
  if (!id || id === 'undefined' || id === 'null' || String(id).trim() === '') {
    console.warn('[apiHarvestService] deleteHarvestRecord 收到空 id，已跳过');
    return false;
  }
  await enhancedApiClient.delete(`/harvest/${id}`);
  return true;
}

/**
 * 批量删除记录
 */
export async function deleteHarvestRecords(ids: string[]): Promise<boolean> {
  // 防御空 id 数组 / 空字符串：过滤掉无效项，避免后端 ids=,,, 这种查询
  const validIds = (ids || []).filter(id =>
    id && id !== 'undefined' && id !== 'null' && String(id).trim() !== ''
  );
  if (validIds.length === 0) {
    console.warn('[apiHarvestService] deleteHarvestRecords 收到空数组，已跳过');
    return false;
  }
  await enhancedApiClient.delete(`/harvest/batch?ids=${validIds.join(',')}`);
  return true;
}

/**
 * 生成采收单号
 */
export async function generateHarvestCode(): Promise<string> {
  const result = await enhancedApiClient.get<{ code: string }>('/harvest/generate-code');
  return result?.code || '';
}

/**
 * 重置数据到默认状态
 */
export async function resetHarvestRecords(): Promise<void> {
  await enhancedApiClient.post('/harvest/reset');
}
