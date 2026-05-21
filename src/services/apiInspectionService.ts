/**
 * 巡查管理 API 服务
 * 对接后端 /api/inspections
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { InspectionRecord } from '../types/views';

/**
 * 获取所有巡查记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getAllInspections(): Promise<InspectionRecord[]> {
  return await enhancedApiClient.get<InspectionRecord[]>('/inspections');
}

/**
 * 根据ID获取巡查记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getInspectionById(id: string): Promise<InspectionRecord | undefined> {
  return await enhancedApiClient.get<InspectionRecord>(`/inspections/${id}`);
}

/**
 * 根据巡查编码获取巡查记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getInspectionByCode(recordCode: string): Promise<InspectionRecord | undefined> {
  return await enhancedApiClient.get<InspectionRecord>(`/inspections/code/${recordCode}`);
}

/**
 * 获取巡查记录列表（支持筛选）
 * 降级策略：API → IndexedDB 缓存
 */
export async function getInspections(filters?: {
  greenhouseId?: string;
  inspectorId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  inspectionType?: string;
}): Promise<InspectionRecord[]> {
  const params: Record<string, string> = {};
  if (filters) {
    if (filters.greenhouseId) params.greenhouseId = filters.greenhouseId;
    if (filters.inspectorId) params.inspectorId = filters.inspectorId;
    if (filters.status) params.status = filters.status;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.inspectionType) params.inspectionType = filters.inspectionType;
  }
  const paramsStr = new URLSearchParams(params).toString();
  const url = paramsStr ? `/inspections?${paramsStr}` : '/inspections';
  return await enhancedApiClient.get<InspectionRecord[]>(url);
}

/**
 * 创建巡查记录
 * 降级策略：API → 离线队列
 */
export async function createInspection(inspection: Omit<InspectionRecord, 'id' | 'recordCode'>): Promise<InspectionRecord> {
  return await enhancedApiClient.post<InspectionRecord>('/inspections', inspection);
}

/**
 * 更新巡查记录
 * 降级策略：API → 离线队列
 */
export async function updateInspection(id: string, updates: Partial<InspectionRecord>): Promise<InspectionRecord | null> {
  const result = await enhancedApiClient.put<InspectionRecord>(`/inspections/${id}`, updates);
  return result;
}

/**
 * 删除巡查记录
 * 降级策略：API → 离线队列
 */
export async function deleteInspection(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/inspections/${id}`);
  return true;
}

/**
 * 批量删除巡查记录
 * 降级策略：API → 离线队列
 */
export async function deleteInspections(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/inspections/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 根据大棚ID获取巡查记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getInspectionsByGreenhouse(greenhouseId: string): Promise<InspectionRecord[]> {
  return await enhancedApiClient.get<InspectionRecord[]>(`/inspections/greenhouse/${greenhouseId}`);
}

/**
 * 根据巡查人员ID获取巡查记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getInspectionsByInspector(inspectorId: string): Promise<InspectionRecord[]> {
  return await enhancedApiClient.get<InspectionRecord[]>(`/inspections/inspector/${inspectorId}`);
}

/**
 * 根据日期范围获取巡查记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getInspectionsByDateRange(startDate: string, endDate: string): Promise<InspectionRecord[]> {
  return await enhancedApiClient.get<InspectionRecord[]>(`/inspections/date-range?start=${startDate}&end=${endDate}`);
}

/**
 * 根据状态获取巡查记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getInspectionsByStatus(status: 'normal' | 'attention' | 'critical'): Promise<InspectionRecord[]> {
  return await enhancedApiClient.get<InspectionRecord[]>(`/inspections/status/${status}`);
}

/**
 * 获取异常的巡查记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getCriticalInspections(): Promise<InspectionRecord[]> {
  return await enhancedApiClient.get<InspectionRecord[]>('/inspections/critical');
}

/**
 * 生成巡查编码
 */
export async function generateInspectionCode(): Promise<string> {
  return await enhancedApiClient.get<string>('/inspections/generate-code');
}

/**
 * 关联问题分派
 * 降级策略：API → 离线队列
 */
export async function assignProblem(inspectionId: string, problemId: number): Promise<boolean> {
  await enhancedApiClient.post(`/inspections/${inspectionId}/assign-problem`, { problemId });
  return true;
}

/**
 * 创建问题并关联
 * 降级策略：API → 离线队列
 */
export async function createProblemFromInspection(inspectionId: string, problemData: Record<string, unknown>): Promise<number> {
  const result = await enhancedApiClient.post<{ id: number }>(`/inspections/${inspectionId}/create-problem`, problemData);
  return result.id;
}

/**
 * 获取巡查统计
 */
export async function getInspectionStats(filters?: {
  startDate?: string;
  endDate?: string;
  greenhouseId?: string;
}): Promise<{
  total: number;
  normal: number;
  attention: number;
  critical: number;
}> {
  const params: Record<string, string> = {};
  if (filters?.startDate) params.startDate = filters.startDate;
  if (filters?.endDate) params.endDate = filters.endDate;
  if (filters?.greenhouseId) params.greenhouseId = filters.greenhouseId;
  const paramsStr = new URLSearchParams(params).toString();
  const url = paramsStr ? `/inspections/stats?${paramsStr}` : '/inspections/stats';
  return await enhancedApiClient.get(url);
}

/**
 * 根据批次获取巡查记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getInspectionsByBatch(batchId: string): Promise<InspectionRecord[]> {
  return await enhancedApiClient.get<InspectionRecord[]>(`/inspections/batch/${batchId}`);
}

/**
 * 关联任务
 * 降级策略：API → 离线队列
 */
export async function linkTask(inspectionId: string, taskId: string, taskCode: string): Promise<boolean> {
  await enhancedApiClient.post(`/inspections/${inspectionId}/link-task`, { taskId, taskCode });
  return true;
}
