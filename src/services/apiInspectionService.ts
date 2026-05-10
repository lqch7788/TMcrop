/**
 * 巡查管理 API 服务
 * 对接后端 /api/inspections
 * API失败时降级到 localStorage
 */

import { apiClient } from './apiClient';
import { InspectionRecord } from '../types/views';

// localStorage 配置
const STORAGE_KEY = 'yuanxingtu_inspections';

// 默认空数据
const defaultInspections: InspectionRecord[] = [];

// 从 localStorage 读取数据
function getStoredInspections(): InspectionRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultInspections;
  } catch {
    return defaultInspections;
  }
}

// 保存数据到 localStorage
function saveToStorage(data: InspectionRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * 获取所有巡查记录（带localStorage降级）
 */
export async function getAllInspections(): Promise<InspectionRecord[]> {
  try {
    const data = await apiClient.get<InspectionRecord[]>('/inspections');
    saveToStorage(data);
    return data;
  } catch (error) {
    console.warn('[巡查API] 获取列表失败，降级到localStorage:', error);
    return getStoredInspections();
  }
}

/**
 * 根据ID获取巡查记录（带localStorage降级）
 */
export async function getInspectionById(id: string): Promise<InspectionRecord | undefined> {
  try {
    return await apiClient.get<InspectionRecord>(`/inspections/${id}`);
  } catch (error) {
    console.warn('[巡查API] 获取单个失败，降级到localStorage:', error);
    const stored = getStoredInspections();
    return stored.find(i => i.id === id);
  }
}

/**
 * 根据巡查编码获取巡查记录（带localStorage降级）
 */
export async function getInspectionByCode(recordCode: string): Promise<InspectionRecord | undefined> {
  try {
    return await apiClient.get<InspectionRecord>(`/inspections/code/${recordCode}`);
  } catch (error) {
    console.warn('[巡查API] 获取单个失败，降级到localStorage:', error);
    const stored = getStoredInspections();
    return stored.find(i => (i as any).recordCode === recordCode);
  }
}

/**
 * 获取巡查记录列表（支持筛选）（带localStorage降级）
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
  try {
    const data = await apiClient.get<InspectionRecord[]>('/inspections', params);
    saveToStorage(data);
    return data;
  } catch (error) {
    console.warn('[巡查API] 获取列表失败，降级到localStorage:', error);
    return getStoredInspections();
  }
}

/**
 * 创建巡查记录（带localStorage降级）
 */
export async function createInspection(inspection: Omit<InspectionRecord, 'id' | 'recordCode'>): Promise<InspectionRecord> {
  try {
    const result = await apiClient.post<InspectionRecord>('/inspections', inspection);
    // 同步到 localStorage
    const stored = getStoredInspections();
    stored.unshift(result);
    saveToStorage(stored);
    return result;
  } catch (error) {
    console.warn('[巡查API] 创建失败，降级到localStorage:', error);
    const localRecord: InspectionRecord = {
      ...inspection,
      id: `INSP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recordCode: `I${Date.now()}`,
    } as InspectionRecord;
    const stored = getStoredInspections();
    stored.unshift(localRecord);
    saveToStorage(stored);
    return localRecord;
  }
}

/**
 * 更新巡查记录（带localStorage降级）
 */
export async function updateInspection(id: string, updates: Partial<InspectionRecord>): Promise<InspectionRecord | null> {
  try {
    const result = await apiClient.put<InspectionRecord>(`/inspections/${id}`, updates);
    // 同步到 localStorage
    const stored = getStoredInspections();
    const index = stored.findIndex(i => i.id === id);
    if (index !== -1) {
      stored[index] = { ...stored[index], ...updates };
      saveToStorage(stored);
    }
    return result;
  } catch (error) {
    console.warn('[巡查API] 更新失败，降级到localStorage:', error);
    const stored = getStoredInspections();
    const index = stored.findIndex(i => i.id === id);
    if (index !== -1) {
      stored[index] = { ...stored[index], ...updates };
      saveToStorage(stored);
      return stored[index];
    }
    return null;
  }
}

/**
 * 删除巡查记录（带localStorage降级）
 */
export async function deleteInspection(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/inspections/${id}`);
    // 从 localStorage 移除
    const stored = getStoredInspections();
    const filtered = stored.filter(i => i.id !== id);
    saveToStorage(filtered);
    return true;
  } catch (error) {
    console.warn('[巡查API] 删除失败，降级到localStorage:', error);
    const stored = getStoredInspections();
    const filtered = stored.filter(i => i.id !== id);
    saveToStorage(filtered);
    return true;
  }
}

/**
 * 批量删除巡查记录（带localStorage降级）
 */
export async function deleteInspections(ids: string[]): Promise<boolean> {
  try {
    await apiClient.delete(`/inspections/batch?ids=${ids.join(',')}`);
    // 从 localStorage 移除
    const stored = getStoredInspections();
    const filtered = stored.filter(i => !ids.includes(i.id));
    saveToStorage(filtered);
    return true;
  } catch (error) {
    console.warn('[巡查API] 批量删除失败，降级到localStorage:', error);
    const stored = getStoredInspections();
    const filtered = stored.filter(i => !ids.includes(i.id));
    saveToStorage(filtered);
    return true;
  }
}

/**
 * 根据大棚ID获取巡查记录（带localStorage降级）
 */
export async function getInspectionsByGreenhouse(greenhouseId: string): Promise<InspectionRecord[]> {
  try {
    return await apiClient.get<InspectionRecord[]>(`/inspections/greenhouse/${greenhouseId}`);
  } catch (error) {
    console.warn('[巡查API] 按大棚获取失败，降级到localStorage:', error);
    const stored = getStoredInspections();
    return stored.filter(i => (i as any).greenhouseId === greenhouseId);
  }
}

/**
 * 根据巡查人员ID获取巡查记录（带localStorage降级）
 */
export async function getInspectionsByInspector(inspectorId: string): Promise<InspectionRecord[]> {
  try {
    return await apiClient.get<InspectionRecord[]>(`/inspections/inspector/${inspectorId}`);
  } catch (error) {
    console.warn('[巡查API] 按巡查人员获取失败，降级到localStorage:', error);
    const stored = getStoredInspections();
    return stored.filter(i => (i as any).inspectorId === inspectorId);
  }
}

/**
 * 根据日期范围获取巡查记录（带localStorage降级）
 */
export async function getInspectionsByDateRange(startDate: string, endDate: string): Promise<InspectionRecord[]> {
  try {
    return await apiClient.get<InspectionRecord[]>(`/inspections/date-range?start=${startDate}&end=${endDate}`);
  } catch (error) {
    console.warn('[巡查API] 按日期范围获取失败，降级到localStorage:', error);
    const stored = getStoredInspections();
    return stored.filter(i => {
      const date = (i as any).inspectionDate;
      return date && date >= startDate && date <= endDate;
    });
  }
}

/**
 * 根据状态获取巡查记录（带localStorage降级）
 */
export async function getInspectionsByStatus(status: 'normal' | 'attention' | 'critical'): Promise<InspectionRecord[]> {
  try {
    return await apiClient.get<InspectionRecord[]>(`/inspections/status/${status}`);
  } catch (error) {
    console.warn('[巡查API] 按状态获取失败，降级到localStorage:', error);
    const stored = getStoredInspections();
    return stored.filter(i => i.status === status);
  }
}

/**
 * 获取异常的巡查记录（带localStorage降级）
 */
export async function getCriticalInspections(): Promise<InspectionRecord[]> {
  try {
    return await apiClient.get<InspectionRecord[]>('/inspections/critical');
  } catch (error) {
    console.warn('[巡查API] 获取异常记录失败，降级到localStorage:', error);
    const stored = getStoredInspections();
    return stored.filter(i => i.status === 'critical');
  }
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
 * 根据批次获取巡查记录（带localStorage降级）
 */
export async function getInspectionsByBatch(batchId: string): Promise<InspectionRecord[]> {
  try {
    return await apiClient.get<InspectionRecord[]>(`/inspections/batch/${batchId}`);
  } catch (error) {
    console.warn('[巡查API] 按批次获取失败，降级到localStorage:', error);
    const stored = getStoredInspections();
    return stored.filter(i => (i as any).batchId === batchId);
  }
}

/**
 * 关联任务
 */
export async function linkTask(inspectionId: string, taskId: string, taskCode: string): Promise<boolean> {
  await apiClient.post(`/inspections/${inspectionId}/link-task`, { taskId, taskCode });
  return true;
}
