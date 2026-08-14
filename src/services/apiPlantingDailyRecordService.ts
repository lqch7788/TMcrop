/**
 * 种植管理每日记录 API Service（2026-06-28）
 *
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 * 复用 daily_records 通用表，record_type='planting'
 */

import { enhancedApiClient } from '../lib/apiClient';
import type { PlantingDailyRecord } from '../types/crop';

/**
 * 获取某种植批次的所有每日记录
 */
export async function getPlantingDailyRecords(plantingId: string): Promise<PlantingDailyRecord[]> {
  try {
    const res = await enhancedApiClient.get<{ items?: PlantingDailyRecord[]; data?: PlantingDailyRecord[] }>(
      `/plantings/${plantingId}/daily-records?limit=200`
    );
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
 * 新增每日记录
 */
export async function addPlantingDailyRecord(
  plantingId: string,
  record: Omit<PlantingDailyRecord, 'id' | 'plantingId'>
): Promise<PlantingDailyRecord | null> {
  try {
    return await enhancedApiClient.post<PlantingDailyRecord>(
      `/plantings/${plantingId}/daily-records`,
      record
    );
  } catch (e) {
    // 2026-08-14：错误上抛（与育苗对齐）— 弹窗显示具体失败原因（后端校验文案）
    throw e instanceof Error ? e : new Error('添加每日记录请求失败');
  }
}

/**
 * 更新每日记录
 */
export async function updatePlantingDailyRecord(
  plantingId: string,
  recordId: string,
  updates: Partial<PlantingDailyRecord>
): Promise<boolean> {
  try {
    await enhancedApiClient.put(`/plantings/${plantingId}/daily-records/${recordId}`, updates);
    return true;
  } catch (e) {
    // 2026-08-14：错误上抛（与育苗对齐）
    throw e instanceof Error ? e : new Error('更新每日记录请求失败');
  }
}

/**
 * 删除每日记录
 */
export async function deletePlantingDailyRecord(plantingId: string, recordId: string): Promise<boolean> {
  try {
    await enhancedApiClient.delete(`/plantings/${plantingId}/daily-records/${recordId}`);
    return true;
  } catch (e) {
    // 2026-08-14：错误上抛（与育苗对齐）
    throw e instanceof Error ? e : new Error('删除每日记录请求失败');
  }
}