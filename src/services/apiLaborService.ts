/**
 * 人工管理 API 服务
 * 对接后端 /api/labor
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { Worker } from '../types/views';
import { Employee, EmployeeFilter, CreateEmployeeParams, UpdateEmployeeParams } from '../types/labor/employee';
import { TrainingRecord, AssessmentRecord, WorkExperience } from '../types';

/**
 * 获取所有员工/工人列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getAllWorkers(): Promise<Worker[]> {
  const data = await enhancedApiClient.get<Worker[]>('/labor/workers');
  return data || [];
}

/**
 * 根据ID获取员工/工人
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWorkerById(id: string): Promise<Worker | undefined> {
  return await enhancedApiClient.get<Worker>(`/labor/workers/${id}`);
}

/**
 * 获取员工列表（支持筛选）
 * 降级策略：API → IndexedDB 缓存
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
  const paramsStr = new URLSearchParams(params).toString();
  const url = paramsStr ? `/labor/workers?${paramsStr}` : '/labor/workers';
  const data = await enhancedApiClient.get<Worker[]>(url);
  return data || [];
}

/**
 * 创建员工
 * 降级策略：API → 离线队列
 */
export async function createWorker(worker: CreateEmployeeParams): Promise<Employee> {
  const result = await enhancedApiClient.post<Employee>('/labor/workers', worker);
  return result;
}

/**
 * 更新员工信息
 * 降级策略：API → 离线队列
 */
export async function updateWorker(id: string, updates: UpdateEmployeeParams): Promise<Employee | null> {
  const result = await enhancedApiClient.put<Employee>(`/labor/workers/${id}`, updates);
  return result;
}

/**
 * 删除员工
 * 降级策略：API → 离线队列
 */
export async function deleteWorker(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/labor/workers/${id}`);
  return true;
}

/**
 * 批量删除员工
 * 降级策略：API → 离线队列
 */
export async function deleteWorkers(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/labor/workers/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 根据姓名搜索员工
 * 降级策略：API → IndexedDB 缓存
 */
export async function searchWorkers(keyword: string): Promise<Worker[]> {
  const data = await enhancedApiClient.get<Worker[]>(`/labor/workers/search?keyword=${encodeURIComponent(keyword)}`);
  return data || [];
}

/**
 * 根据部门获取员工
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWorkersByDepartment(deptId: string): Promise<Worker[]> {
  const data = await enhancedApiClient.get<Worker[]>(`/labor/workers/department/${deptId}`);
  return data || [];
}

/**
 * 根据岗位获取员工
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWorkersByPosition(positionId: string): Promise<Worker[]> {
  const data = await enhancedApiClient.get<Worker[]>(`/labor/workers/position/${positionId}`);
  return data || [];
}

/**
 * 根据员工类型获取员工
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWorkersByType(employeeType: string): Promise<Worker[]> {
  const data = await enhancedApiClient.get<Worker[]>(`/labor/workers/type/${employeeType}`);
  return data || [];
}

/**
 * 根据状态获取员工
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWorkersByStatus(status: string): Promise<Worker[]> {
  const data = await enhancedApiClient.get<Worker[]>(`/labor/workers/status/${status}`);
  return data || [];
}

/**
 * 获取在职员工列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getActiveWorkers(): Promise<Worker[]> {
  const data = await enhancedApiClient.get<Worker[]>('/labor/workers/active');
  return data || [];
}

/**
 * 获取离职员工列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getLeftWorkers(): Promise<Worker[]> {
  const data = await enhancedApiClient.get<Worker[]>('/labor/workers/left');
  return data || [];
}

/**
 * 员工离职
 * 降级策略：API → 离线队列
 */
export async function leaveWorker(id: string, leaveDate: string, leaveReason: string): Promise<boolean> {
  await enhancedApiClient.post(`/labor/workers/${id}/leave`, { leaveDate, leaveReason });
  return true;
}

/**
 * 员工复职
 * 降级策略：API → 离线队列
 */
export async function rejoinWorker(id: string, rejoinDate: string): Promise<boolean> {
  await enhancedApiClient.post(`/labor/workers/${id}/rejoin`, { rejoinDate });
  return true;
}

/**
 * 获取员工统计
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWorkerStats(): Promise<{
  total: number;
  active: number;
  left: number;
  byType: Record<string, number>;
  byDepartment: Record<string, number>;
}> {
  return await enhancedApiClient.get('/labor/workers/stats');
}

/**
 * 获取员工技能标签列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWorkerSkillTags(): Promise<string[]> {
  return await enhancedApiClient.get<string[]>('/labor/workers/skill-tags');
}

/**
 * 根据技能标签获取员工
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWorkersBySkillTag(skillTag: string): Promise<Worker[]> {
  const data = await enhancedApiClient.get<Worker[]>(`/labor/workers/skill-tag/${encodeURIComponent(skillTag)}`);
  return data || [];
}

/**
 * 获取员工培训记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWorkerTrainingRecords(workerId: string): Promise<any[]> {
  return await enhancedApiClient.get<any[]>(`/labor/workers/${workerId}/training-records`);
}

/**
 * 添加培训记录
 * 降级策略：API → 离线队列
 */
export async function addTrainingRecord(workerId: string, record: Partial<TrainingRecord>): Promise<boolean> {
  await enhancedApiClient.post(`/labor/workers/${workerId}/training-records`, record);
  return true;
}

/**
 * 获取员工考核记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWorkerAssessmentRecords(workerId: string): Promise<AssessmentRecord[]> {
  return await enhancedApiClient.get<AssessmentRecord[]>(`/labor/workers/${workerId}/assessment-records`);
}

/**
 * 添加考核记录
 * 降级策略：API → 离线队列
 */
export async function addAssessmentRecord(workerId: string, record: Partial<AssessmentRecord>): Promise<boolean> {
  await enhancedApiClient.post(`/labor/workers/${workerId}/assessment-records`, record);
  return true;
}

/**
 * 获取员工工作经验
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWorkerWorkExperiences(workerId: string): Promise<WorkExperience[]> {
  return await enhancedApiClient.get<WorkExperience[]>(`/labor/workers/${workerId}/work-experiences`);
}

/**
 * 添加工作经验
 * 降级策略：API → 离线队列
 */
export async function addWorkExperience(workerId: string, experience: Partial<WorkExperience>): Promise<boolean> {
  await enhancedApiClient.post(`/labor/workers/${workerId}/work-experiences`, experience);
  return true;
}

/**
 * 生成员工工号
 */
export async function generateWorkerId(): Promise<string> {
  return await enhancedApiClient.get<string>('/labor/workers/generate-id');
}

/**
 * 批量导入员工
 * 降级策略：API → 离线队列
 */
export async function importWorkers(workers: CreateEmployeeParams[]): Promise<{ success: number; failed: number }> {
  return await enhancedApiClient.post('/labor/workers/import', { workers });
}

/**
 * 导出员工数据
 */
export async function exportWorkers(filters?: EmployeeFilter): Promise<Blob> {
  return await enhancedApiClient.get('/labor/workers/export');
}
