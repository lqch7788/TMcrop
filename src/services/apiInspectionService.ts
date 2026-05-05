/**
 * 巡查管理 API 服务
 * 对接后端 /api/inspections
 */

import { apiClient } from './apiClient';
import { InspectionRecord } from '../types/views';

// 导入本地服务作为回退（暂未实现，将来的本地服务）
// import * as localService from './inspectionService';

/**
 * 获取所有巡查记录
 */
export async function getAllInspections(): Promise<InspectionRecord[]> {
  return apiClient.get<InspectionRecord[]>('/inspections');
}

/**
 * 根据ID获取巡查记录
 */
export async function getInspectionById(id: string): Promise<InspectionRecord | undefined> {
  return apiClient.get<InspectionRecord>(`/inspections/${id}`);
}

/**
 * 根据巡查编码获取巡查记录
 */
export async function getInspectionByCode(recordCode: string): Promise<InspectionRecord | undefined> {
  return apiClient.get<InspectionRecord>(`/inspections/code/${recordCode}`);
}

/**
 * 获取巡查记录列表（支持筛选）
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
  return apiClient.get<InspectionRecord[]>('/inspections', params);
}

/**
 * 创建巡查记录
 */
export async function createInspection(inspection: Omit<InspectionRecord, 'id' | 'recordCode'>): Promise<InspectionRecord> {
  return apiClient.post<InspectionRecord>('/inspections', inspection);
}

/**
 * 更新巡查记录
 */
export async function updateInspection(id: string, updates: Partial<InspectionRecord>): Promise<InspectionRecord | null> {
  return apiClient.put<InspectionRecord>(`/inspections/${id}`, updates);
}

/**
 * 删除巡查记录
 */
export async function deleteInspection(id: string): Promise<boolean> {
  await apiClient.delete(`/inspections/${id}`);
  return true;
}

/**
 * 批量删除巡查记录
 */
export async function deleteInspections(ids: string[]): Promise<boolean> {
  await apiClient.delete(`/inspections/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 根据大棚ID获取巡查记录
 */
export async function getInspectionsByGreenhouse(greenhouseId: string): Promise<InspectionRecord[]> {
  return apiClient.get<InspectionRecord[]>(`/inspections/greenhouse/${greenhouseId}`);
}

/**
 * 根据巡查人员ID获取巡查记录
 */
export async function getInspectionsByInspector(inspectorId: string): Promise<InspectionRecord[]> {
  return apiClient.get<InspectionRecord[]>(`/inspections/inspector/${inspectorId}`);
}

/**
 * 根据日期范围获取巡查记录
 */
export async function getInspectionsByDateRange(startDate: string, endDate: string): Promise<InspectionRecord[]> {
  return apiClient.get<InspectionRecord[]>(`/inspections/date-range?start=${startDate}&end=${endDate}`);
}

/**
 * 根据状态获取巡查记录
 */
export async function getInspectionsByStatus(status: 'normal' | 'attention' | 'critical'): Promise<InspectionRecord[]> {
  return apiClient.get<InspectionRecord[]>(`/inspections/status/${status}`);
}

/**
 * 获取异常的巡查记录
 */
export async function getCriticalInspections(): Promise<InspectionRecord[]> {
  return apiClient.get<InspectionRecord[]>('/inspections/critical');
}

/**
 * 生成巡查编码
 */
export async function generateInspectionCode(): Promise<string> {
  return apiClient.get<string>('/inspections/generate-code');
}

/**
 * 关联问题分派
 */
export async function assignProblem(inspectionId: string, problemId: number): Promise<boolean> {
  await apiClient.post(`/inspections/${inspectionId}/assign-problem`, { problemId });
  return true;
}

/**
 * 创建问题并关联
 * @param inspectionId 巡检记录ID
 * @param problemData 问题数据（字段名与后端API匹配）
 */
export async function createProblemFromInspection(inspectionId: string, problemData: Record<string, unknown>): Promise<number> {
  const result = await apiClient.post<{ id: number }>(`/inspections/${inspectionId}/create-problem`, problemData);
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
  return apiClient.get('/inspections/stats', { params });
}

/**
 * 根据批次获取巡查记录
 */
export async function getInspectionsByBatch(batchId: string): Promise<InspectionRecord[]> {
  return apiClient.get<InspectionRecord[]>(`/inspections/batch/${batchId}`);
}

/**
 * 关联任务
 */
export async function linkTask(inspectionId: string, taskId: string, taskCode: string): Promise<boolean> {
  await apiClient.post(`/inspections/${inspectionId}/link-task`, { taskId, taskCode });
  return true;
}
