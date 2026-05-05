/**
 * 人工管理 API 服务
 * 对接后端 /api/labor
 */

import { apiClient } from './apiClient';
import { Worker } from '../types/views';
import { Employee, EmployeeFilter, CreateEmployeeParams, UpdateEmployeeParams } from '../types/labor/employee';
import { TrainingRecord, AssessmentRecord, WorkExperience } from '../types';

// 导入本地服务作为回退（暂未实现，将来的本地服务）
// import * as localService from './laborService';

/**
 * 获取所有员工/工人列表
 */
export async function getAllWorkers(): Promise<Worker[]> {
  return apiClient.get<Worker[]>('/labor/workers');
}

/**
 * 根据ID获取员工/工人
 */
export async function getWorkerById(id: string): Promise<Worker | undefined> {
  return apiClient.get<Worker>(`/labor/workers/${id}`);
}

/**
 * 获取员工列表（支持筛选）
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
  return apiClient.get<Worker[]>('/labor/workers', params);
}

/**
 * 创建员工
 */
export async function createWorker(worker: CreateEmployeeParams): Promise<Employee> {
  return apiClient.post<Employee>('/labor/workers', worker);
}

/**
 * 更新员工信息
 */
export async function updateWorker(id: string, updates: UpdateEmployeeParams): Promise<Employee | null> {
  return apiClient.put<Employee>(`/labor/workers/${id}`, updates);
}

/**
 * 删除员工
 */
export async function deleteWorker(id: string): Promise<boolean> {
  await apiClient.delete(`/labor/workers/${id}`);
  return true;
}

/**
 * 批量删除员工
 */
export async function deleteWorkers(ids: string[]): Promise<boolean> {
  await apiClient.delete(`/labor/workers/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 根据姓名搜索员工
 */
export async function searchWorkers(keyword: string): Promise<Worker[]> {
  return apiClient.get<Worker[]>(`/labor/workers/search?keyword=${encodeURIComponent(keyword)}`);
}

/**
 * 根据部门获取员工
 */
export async function getWorkersByDepartment(deptId: string): Promise<Worker[]> {
  return apiClient.get<Worker[]>(`/labor/workers/department/${deptId}`);
}

/**
 * 根据岗位获取员工
 */
export async function getWorkersByPosition(positionId: string): Promise<Worker[]> {
  return apiClient.get<Worker[]>(`/labor/workers/position/${positionId}`);
}

/**
 * 根据员工类型获取员工
 */
export async function getWorkersByType(employeeType: string): Promise<Worker[]> {
  return apiClient.get<Worker[]>(`/labor/workers/type/${employeeType}`);
}

/**
 * 根据状态获取员工
 */
export async function getWorkersByStatus(status: string): Promise<Worker[]> {
  return apiClient.get<Worker[]>(`/labor/workers/status/${status}`);
}

/**
 * 获取在职员工列表
 */
export async function getActiveWorkers(): Promise<Worker[]> {
  return apiClient.get<Worker[]>('/labor/workers/active');
}

/**
 * 获取离职员工列表
 */
export async function getLeftWorkers(): Promise<Worker[]> {
  return apiClient.get<Worker[]>('/labor/workers/left');
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
 * 根据技能标签获取员工
 */
export async function getWorkersBySkillTag(skillTag: string): Promise<Worker[]> {
  return apiClient.get<Worker[]>(`/labor/workers/skill-tag/${encodeURIComponent(skillTag)}`);
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
