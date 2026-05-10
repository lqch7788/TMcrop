/**
 * 人工管理 API 服务
 * 对接后端 /api/labor
 * API失败时降级到 localStorage
 */

import { apiClient } from './apiClient';
import { Worker } from '../types/views';
import { Employee, EmployeeFilter, CreateEmployeeParams, UpdateEmployeeParams } from '../types/labor/employee';
import { TrainingRecord, AssessmentRecord, WorkExperience } from '../types';

// localStorage 配置
const STORAGE_KEY = 'yuanxingtu_labor_workers';

// 默认空数据
const defaultWorkers: Worker[] = [];

// 从 localStorage 读取数据
function getStoredWorkers(): Worker[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultWorkers;
  } catch {
    return defaultWorkers;
  }
}

// 保存数据到 localStorage
function saveToStorage(data: Worker[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * 获取所有员工/工人列表（带localStorage降级）
 */
export async function getAllWorkers(): Promise<Worker[]> {
  try {
    const data = await apiClient.get<Worker[]>('/labor/workers');
    saveToStorage(data);
    return data;
  } catch (error) {
    console.warn('[人工管理API] 获取列表失败，降级到localStorage:', error);
    return getStoredWorkers();
  }
}

/**
 * 根据ID获取员工/工人（带localStorage降级）
 */
export async function getWorkerById(id: string): Promise<Worker | undefined> {
  try {
    return await apiClient.get<Worker>(`/labor/workers/${id}`);
  } catch (error) {
    console.warn('[人工管理API] 获取单个失败，降级到localStorage:', error);
    const stored = getStoredWorkers();
    return stored.find(w => w.id === id);
  }
}

/**
 * 获取员工列表（支持筛选）（带localStorage降级）
 */
export async function getWorkers(filters?: EmployeeFilter): Promise<Worker[]> {
  const params: Record<string, string> = {};
  if (filters) {
    if (filters.deptId) params.deptId = filters.deptId;
    if (filters.positionId) params.positionId = filters.positionId;
    if (filters.employeeType) params.employeeType = filters.employeeType;
    if (filters.status) params.status = filters.status;
    if (filters.name) params.name = filters.name;
  }
  try {
    const data = await apiClient.get<Worker[]>('/labor/workers', params);
    saveToStorage(data);
    return data;
  } catch (error) {
    console.warn('[人工管理API] 获取列表失败，降级到localStorage:', error);
    return getStoredWorkers();
  }
}

/**
 * 创建员工（带localStorage降级）
 */
export async function createWorker(worker: CreateEmployeeParams): Promise<Employee> {
  try {
    const result = await apiClient.post<Employee>('/labor/workers', worker);
    // 同步到 localStorage
    const stored = getStoredWorkers();
    stored.unshift(result as unknown as Worker);
    saveToStorage(stored);
    return result;
  } catch (error) {
    console.warn('[人工管理API] 创建失败，降级到localStorage:', error);
    const localWorker: Employee = {
      ...worker,
      id: `WORKER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    } as Employee;
    const stored = getStoredWorkers();
    stored.unshift(localWorker as unknown as Worker);
    saveToStorage(stored);
    return localWorker;
  }
}

/**
 * 更新员工信息（带localStorage降级）
 */
export async function updateWorker(id: string, updates: UpdateEmployeeParams): Promise<Employee | null> {
  try {
    const result = await apiClient.put<Employee>(`/labor/workers/${id}`, updates);
    // 同步到 localStorage
    const stored = getStoredWorkers();
    const index = stored.findIndex(w => w.id === id);
    if (index !== -1) {
      stored[index] = { ...stored[index], ...updates } as unknown as Worker;
      saveToStorage(stored);
    }
    return result;
  } catch (error) {
    console.warn('[人工管理API] 更新失败，降级到localStorage:', error);
    const stored = getStoredWorkers();
    const index = stored.findIndex(w => w.id === id);
    if (index !== -1) {
      stored[index] = { ...stored[index], ...updates } as unknown as Worker;
      saveToStorage(stored);
      return stored[index] as unknown as Employee;
    }
    return null;
  }
}

/**
 * 删除员工（带localStorage降级）
 */
export async function deleteWorker(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/labor/workers/${id}`);
    // 从 localStorage 移除
    const stored = getStoredWorkers();
    const filtered = stored.filter(w => w.id !== id);
    saveToStorage(filtered);
    return true;
  } catch (error) {
    console.warn('[人工管理API] 删除失败，降级到localStorage:', error);
    const stored = getStoredWorkers();
    const filtered = stored.filter(w => w.id !== id);
    saveToStorage(filtered);
    return true;
  }
}

/**
 * 批量删除员工（带localStorage降级）
 */
export async function deleteWorkers(ids: string[]): Promise<boolean> {
  try {
    await apiClient.delete(`/labor/workers/batch?ids=${ids.join(',')}`);
    // 从 localStorage 移除
    const stored = getStoredWorkers();
    const filtered = stored.filter(w => !ids.includes(w.id));
    saveToStorage(filtered);
    return true;
  } catch (error) {
    console.warn('[人工管理API] 批量删除失败，降级到localStorage:', error);
    const stored = getStoredWorkers();
    const filtered = stored.filter(w => !ids.includes(w.id));
    saveToStorage(filtered);
    return true;
  }
}

/**
 * 根据姓名搜索员工（带localStorage降级）
 */
export async function searchWorkers(keyword: string): Promise<Worker[]> {
  try {
    return await apiClient.get<Worker[]>(`/labor/workers/search?keyword=${encodeURIComponent(keyword)}`);
  } catch (error) {
    console.warn('[人工管理API] 搜索失败，降级到localStorage:', error);
    const stored = getStoredWorkers();
    return stored.filter(w => w.name?.includes(keyword));
  }
}

/**
 * 根据部门获取员工（带localStorage降级）
 */
export async function getWorkersByDepartment(deptId: string): Promise<Worker[]> {
  try {
    return await apiClient.get<Worker[]>(`/labor/workers/department/${deptId}`);
  } catch (error) {
    console.warn('[人工管理API] 按部门获取失败，降级到localStorage:', error);
    const stored = getStoredWorkers();
    return stored.filter(w => (w as any).deptId === deptId);
  }
}

/**
 * 根据岗位获取员工（带localStorage降级）
 */
export async function getWorkersByPosition(positionId: string): Promise<Worker[]> {
  try {
    return await apiClient.get<Worker[]>(`/labor/workers/position/${positionId}`);
  } catch (error) {
    console.warn('[人工管理API] 按岗位获取失败，降级到localStorage:', error);
    const stored = getStoredWorkers();
    return stored.filter(w => (w as any).positionId === positionId);
  }
}

/**
 * 根据员工类型获取员工（带localStorage降级）
 */
export async function getWorkersByType(employeeType: string): Promise<Worker[]> {
  try {
    return await apiClient.get<Worker[]>(`/labor/workers/type/${employeeType}`);
  } catch (error) {
    console.warn('[人工管理API] 按类型获取失败，降级到localStorage:', error);
    const stored = getStoredWorkers();
    return stored.filter(w => (w as any).employeeType === employeeType);
  }
}

/**
 * 根据状态获取员工（带localStorage降级）
 */
export async function getWorkersByStatus(status: string): Promise<Worker[]> {
  try {
    return await apiClient.get<Worker[]>(`/labor/workers/status/${status}`);
  } catch (error) {
    console.warn('[人工管理API] 按状态获取失败，降级到localStorage:', error);
    const stored = getStoredWorkers();
    return stored.filter(w => w.status === status);
  }
}

/**
 * 获取在职员工列表（带localStorage降级）
 */
export async function getActiveWorkers(): Promise<Worker[]> {
  try {
    const data = await apiClient.get<Worker[]>('/labor/workers/active');
    return data;
  } catch (error) {
    console.warn('[人工管理API] 获取在职员工失败，降级到localStorage:', error);
    const stored = getStoredWorkers();
    return stored.filter(w => w.status === 'active');
  }
}

/**
 * 获取离职员工列表（带localStorage降级）
 */
export async function getLeftWorkers(): Promise<Worker[]> {
  try {
    return await apiClient.get<Worker[]>('/labor/workers/left');
  } catch (error) {
    console.warn('[人工管理API] 获取离职员工失败，降级到localStorage:', error);
    const stored = getStoredWorkers();
    return stored.filter(w => w.status === 'left');
  }
}

/**
 * 员工离职
 */
export async function leaveWorker(id: string, leaveDate: string, leaveReason: string): Promise<boolean> {
  await apiClient.post(`/labor/workers/${id}/leave`, { leaveDate, leaveReason });
  return true;
}

/**
 * 员工复职
 */
export async function rejoinWorker(id: string, rejoinDate: string): Promise<boolean> {
  await apiClient.post(`/labor/workers/${id}/rejoin`, { rejoinDate });
  return true;
}

/**
 * 获取员工统计
 */
export async function getWorkerStats(): Promise<{
  total: number;
  active: number;
  left: number;
  byType: Record<string, number>;
  byDepartment: Record<string, number>;
}> {
  return apiClient.get('/labor/workers/stats');
}

/**
 * 获取员工技能标签列表
 */
export async function getWorkerSkillTags(): Promise<string[]> {
  return apiClient.get<string[]>('/labor/workers/skill-tags');
}

/**
 * 根据技能标签获取员工（带localStorage降级）
 */
export async function getWorkersBySkillTag(skillTag: string): Promise<Worker[]> {
  try {
    return await apiClient.get<Worker[]>(`/labor/workers/skill-tag/${encodeURIComponent(skillTag)}`);
  } catch (error) {
    console.warn('[人工管理API] 按技能标签获取失败，降级到localStorage:', error);
    const stored = getStoredWorkers();
    return stored.filter(w => (w as any).skillTags?.includes(skillTag));
  }
}

/**
 * 获取员工培训记录
 */
export async function getWorkerTrainingRecords(workerId: string): Promise<any[]> {
  return apiClient.get<any[]>(`/labor/workers/${workerId}/training-records`);
}

/**
 * 添加培训记录
 */
export async function addTrainingRecord(workerId: string, record: Partial<TrainingRecord>): Promise<boolean> {
  await apiClient.post(`/labor/workers/${workerId}/training-records`, record);
  return true;
}

/**
 * 获取员工考核记录
 */
export async function getWorkerAssessmentRecords(workerId: string): Promise<AssessmentRecord[]> {
  return apiClient.get<AssessmentRecord[]>(`/labor/workers/${workerId}/assessment-records`);
}

/**
 * 添加考核记录
 */
export async function addAssessmentRecord(workerId: string, record: Partial<AssessmentRecord>): Promise<boolean> {
  await apiClient.post(`/labor/workers/${workerId}/assessment-records`, record);
  return true;
}

/**
 * 获取员工工作经验
 */
export async function getWorkerWorkExperiences(workerId: string): Promise<WorkExperience[]> {
  return apiClient.get<WorkExperience[]>(`/labor/workers/${workerId}/work-experiences`);
}

/**
 * 添加工作经验
 */
export async function addWorkExperience(workerId: string, experience: Partial<WorkExperience>): Promise<boolean> {
  await apiClient.post(`/labor/workers/${workerId}/work-experiences`, experience);
  return true;
}

/**
 * 生成员工工号
 */
export async function generateWorkerId(): Promise<string> {
  return apiClient.get<string>('/labor/workers/generate-id');
}

/**
 * 批量导入员工
 */
export async function importWorkers(workers: CreateEmployeeParams[]): Promise<{ success: number; failed: number }> {
  return apiClient.post('/labor/workers/import', { workers });
}

/**
 * 导出员工数据
 */
export async function exportWorkers(filters?: EmployeeFilter): Promise<Blob> {
  return apiClient.get('/labor/workers/export');
}
