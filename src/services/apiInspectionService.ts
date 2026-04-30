/**
 * 巡查管理 API 服务
 * 对接后端 /api/inspections
 */

import { apiClient, USE_API } from './apiClient';
import { InspectionRecord } from '../types/views';

// 导入本地服务作为回退（暂未实现，将来的本地服务）
// import * as localService from './inspectionService';

/**
 * 获取所有巡查记录
 */
export async function getAllInspections(): Promise<InspectionRecord[]> {
  if (USE_API) {
    return apiClient.get<InspectionRecord[]>('/inspections');
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 根据ID获取巡查记录
 */
export async function getInspectionById(id: string): Promise<InspectionRecord | undefined> {
  if (USE_API) {
    return apiClient.get<InspectionRecord>(`/inspections/${id}`);
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 根据巡查编码获取巡查记录
 */
export async function getInspectionByCode(recordCode: string): Promise<InspectionRecord | undefined> {
  if (USE_API) {
    return apiClient.get<InspectionRecord>(`/inspections/code/${recordCode}`);
  }
  throw new Error('本地服务 inspectionService 尚未实现');
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
  if (USE_API) {
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
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 创建巡查记录
 */
export async function createInspection(inspection: Omit<InspectionRecord, 'id' | 'recordCode'>): Promise<InspectionRecord> {
  if (USE_API) {
    return apiClient.post<InspectionRecord>('/inspections', inspection);
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 更新巡查记录
 */
export async function updateInspection(id: string, updates: Partial<InspectionRecord>): Promise<InspectionRecord | null> {
  if (USE_API) {
    return apiClient.put<InspectionRecord>(`/inspections/${id}`, updates);
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 删除巡查记录
 */
export async function deleteInspection(id: string): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/inspections/${id}`);
    return true;
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 批量删除巡查记录
 */
export async function deleteInspections(ids: string[]): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/inspections/batch?ids=${ids.join(',')}`);
    return true;
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 根据大棚ID获取巡查记录
 */
export async function getInspectionsByGreenhouse(greenhouseId: string): Promise<InspectionRecord[]> {
  if (USE_API) {
    return apiClient.get<InspectionRecord[]>(`/inspections/greenhouse/${greenhouseId}`);
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 根据巡查人员ID获取巡查记录
 */
export async function getInspectionsByInspector(inspectorId: string): Promise<InspectionRecord[]> {
  if (USE_API) {
    return apiClient.get<InspectionRecord[]>(`/inspections/inspector/${inspectorId}`);
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 根据日期范围获取巡查记录
 */
export async function getInspectionsByDateRange(startDate: string, endDate: string): Promise<InspectionRecord[]> {
  if (USE_API) {
    return apiClient.get<InspectionRecord[]>(`/inspections/date-range?start=${startDate}&end=${endDate}`);
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 根据状态获取巡查记录
 */
export async function getInspectionsByStatus(status: 'normal' | 'attention' | 'critical'): Promise<InspectionRecord[]> {
  if (USE_API) {
    return apiClient.get<InspectionRecord[]>(`/inspections/status/${status}`);
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 获取异常的巡查记录
 */
export async function getCriticalInspections(): Promise<InspectionRecord[]> {
  if (USE_API) {
    return apiClient.get<InspectionRecord[]>('/inspections/critical');
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 生成巡查编码
 */
export async function generateInspectionCode(): Promise<string> {
  if (USE_API) {
    return apiClient.get<string>('/inspections/generate-code');
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 关联问题分派
 */
export async function assignProblem(inspectionId: string, problemId: number): Promise<boolean> {
  if (USE_API) {
    await apiClient.post(`/inspections/${inspectionId}/assign-problem`, { problemId });
    return true;
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 创建问题并关联
 */
export async function createProblemFromInspection(inspectionId: string, problemData: any): Promise<number> {
  if (USE_API) {
    const result = await apiClient.post<{ id: number }>(`/inspections/${inspectionId}/create-problem`, problemData);
    return result.id;
  }
  throw new Error('本地服务 inspectionService 尚未实现');
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
  if (USE_API) {
    const params: Record<string, string> = {};
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    if (filters?.greenhouseId) params.greenhouseId = filters.greenhouseId;
    return apiClient.get('/inspections/stats', { params });
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 根据批次获取巡查记录
 */
export async function getInspectionsByBatch(batchId: string): Promise<InspectionRecord[]> {
  if (USE_API) {
    return apiClient.get<InspectionRecord[]>(`/inspections/batch/${batchId}`);
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}

/**
 * 关联任务
 */
export async function linkTask(inspectionId: string, taskId: string, taskCode: string): Promise<boolean> {
  if (USE_API) {
    await apiClient.post(`/inspections/${inspectionId}/link-task`, { taskId, taskCode });
    return true;
  }
  throw new Error('本地服务 inspectionService 尚未实现');
}
