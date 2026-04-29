/**
 * 人工管理 API 服务
 * 对接后端 /api/labor
 */

import { apiClient, USE_API } from './apiClient';
import { Worker } from '../types/views';
import { Employee, EmployeeFilter, CreateEmployeeParams, UpdateEmployeeParams } from '../types/labor/employee';

// 导入本地服务作为回退（暂未实现，将来的本地服务）
// import * as localService from './laborService';

/**
 * 获取所有员工/工人列表
 */
export async function getAllWorkers(): Promise<Worker[]> {
  if (USE_API) {
    return apiClient.get<Worker[]>('/labor/workers');
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 根据ID获取员工/工人
 */
export async function getWorkerById(id: string): Promise<Worker | undefined> {
  if (USE_API) {
    return apiClient.get<Worker>(`/labor/workers/${id}`);
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 获取员工列表（支持筛选）
 */
export async function getWorkers(filters?: EmployeeFilter): Promise<Worker[]> {
  if (USE_API) {
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
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 创建员工
 */
export async function createWorker(worker: CreateEmployeeParams): Promise<Employee> {
  if (USE_API) {
    return apiClient.post<Employee>('/labor/workers', worker);
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 更新员工信息
 */
export async function updateWorker(id: string, updates: UpdateEmployeeParams): Promise<Employee | null> {
  if (USE_API) {
    return apiClient.put<Employee>(`/labor/workers/${id}`, updates);
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 删除员工
 */
export async function deleteWorker(id: string): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/labor/workers/${id}`);
    return true;
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 批量删除员工
 */
export async function deleteWorkers(ids: string[]): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/labor/workers/batch?ids=${ids.join(',')}`);
    return true;
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 根据姓名搜索员工
 */
export async function searchWorkers(keyword: string): Promise<Worker[]> {
  if (USE_API) {
    return apiClient.get<Worker[]>(`/labor/workers/search?keyword=${encodeURIComponent(keyword)}`);
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 根据部门获取员工
 */
export async function getWorkersByDepartment(deptId: string): Promise<Worker[]> {
  if (USE_API) {
    return apiClient.get<Worker[]>(`/labor/workers/department/${deptId}`);
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 根据岗位获取员工
 */
export async function getWorkersByPosition(positionId: string): Promise<Worker[]> {
  if (USE_API) {
    return apiClient.get<Worker[]>(`/labor/workers/position/${positionId}`);
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 根据员工类型获取员工
 */
export async function getWorkersByType(employeeType: string): Promise<Worker[]> {
  if (USE_API) {
    return apiClient.get<Worker[]>(`/labor/workers/type/${employeeType}`);
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 根据状态获取员工
 */
export async function getWorkersByStatus(status: string): Promise<Worker[]> {
  if (USE_API) {
    return apiClient.get<Worker[]>(`/labor/workers/status/${status}`);
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 获取在职员工列表
 */
export async function getActiveWorkers(): Promise<Worker[]> {
  if (USE_API) {
    return apiClient.get<Worker[]>('/labor/workers/active');
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 获取离职员工列表
 */
export async function getLeftWorkers(): Promise<Worker[]> {
  if (USE_API) {
    return apiClient.get<Worker[]>('/labor/workers/left');
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 员工离职
 */
export async function leaveWorker(id: string, leaveDate: string, leaveReason: string): Promise<boolean> {
  if (USE_API) {
    await apiClient.post(`/labor/workers/${id}/leave`, { leaveDate, leaveReason });
    return true;
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 员工复职
 */
export async function rejoinWorker(id: string, rejoinDate: string): Promise<boolean> {
  if (USE_API) {
    await apiClient.post(`/labor/workers/${id}/rejoin`, { rejoinDate });
    return true;
  }
  throw new Error('本地服务 laborService 尚未实现');
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
  if (USE_API) {
    return apiClient.get('/labor/workers/stats');
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 获取员工技能标签列表
 */
export async function getWorkerSkillTags(): Promise<string[]> {
  if (USE_API) {
    return apiClient.get<string[]>('/labor/workers/skill-tags');
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 根据技能标签获取员工
 */
export async function getWorkersBySkillTag(skillTag: string): Promise<Worker[]> {
  if (USE_API) {
    return apiClient.get<Worker[]>(`/labor/workers/skill-tag/${encodeURIComponent(skillTag)}`);
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 获取员工培训记录
 */
export async function getWorkerTrainingRecords(workerId: string): Promise<any[]> {
  if (USE_API) {
    return apiClient.get<any[]>(`/labor/workers/${workerId}/training-records`);
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 添加培训记录
 */
export async function addTrainingRecord(workerId: string, record: any): Promise<boolean> {
  if (USE_API) {
    await apiClient.post(`/labor/workers/${workerId}/training-records`, record);
    return true;
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 获取员工考核记录
 */
export async function getWorkerAssessmentRecords(workerId: string): Promise<any[]> {
  if (USE_API) {
    return apiClient.get<any[]>(`/labor/workers/${workerId}/assessment-records`);
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 添加考核记录
 */
export async function addAssessmentRecord(workerId: string, record: any): Promise<boolean> {
  if (USE_API) {
    await apiClient.post(`/labor/workers/${workerId}/assessment-records`, record);
    return true;
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 获取员工工作经验
 */
export async function getWorkerWorkExperiences(workerId: string): Promise<any[]> {
  if (USE_API) {
    return apiClient.get<any[]>(`/labor/workers/${workerId}/work-experiences`);
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 添加工作经验
 */
export async function addWorkExperience(workerId: string, experience: any): Promise<boolean> {
  if (USE_API) {
    await apiClient.post(`/labor/workers/${workerId}/work-experiences`, experience);
    return true;
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 生成员工工号
 */
export async function generateWorkerId(): Promise<string> {
  if (USE_API) {
    return apiClient.get<string>('/labor/workers/generate-id');
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 批量导入员工
 */
export async function importWorkers(workers: CreateEmployeeParams[]): Promise<{ success: number; failed: number }> {
  if (USE_API) {
    return apiClient.post('/labor/workers/import', { workers });
  }
  throw new Error('本地服务 laborService 尚未实现');
}

/**
 * 导出员工数据
 */
export async function exportWorkers(filters?: EmployeeFilter): Promise<Blob> {
  if (USE_API) {
    return apiClient.get('/labor/workers/export');
  }
  throw new Error('本地服务 laborService 尚未实现');
}
