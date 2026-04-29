/**
 * 农事任务 API 服务
 * 对接后端 /api/farm-tasks
 */

import { apiClient, USE_API } from './apiClient';
import { Task, TaskFilters, TaskStats, TaskStatus } from '../types/task';

// 导入本地服务作为回退（暂未实现，将来的本地服务）
// import * as localService from './farmTaskService';

/**
 * 获取所有农事任务
 */
export async function getAllTasks(): Promise<Task[]> {
  if (USE_API) {
    return apiClient.get<Task[]>('/farm-tasks');
  }
  // 回退到本地服务（待实现）
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 根据ID获取任务
 */
export async function getTaskById(id: string): Promise<Task | undefined> {
  if (USE_API) {
    return apiClient.get<Task>(`/farm-tasks/${id}`);
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 根据任务编码获取任务
 */
export async function getTaskByCode(taskCode: string): Promise<Task | undefined> {
  if (USE_API) {
    return apiClient.get<Task>(`/farm-tasks/code/${taskCode}`);
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 获取任务列表（支持筛选）
 */
export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  if (USE_API) {
    const params: Record<string, string> = {};
    if (filters) {
      if (filters.status) params.status = filters.status.join(',');
      if (filters.sourceType) params.sourceType = filters.sourceType;
      if (filters.assigneeId) params.assigneeId = filters.assigneeId;
      if (filters.assignerId) params.assignerId = filters.assignerId;
      if (filters.greenhouseId) params.greenhouseId = filters.greenhouseId;
      if (filters.batchId) params.batchId = filters.batchId;
      if (filters.priority) params.priority = filters.priority;
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.dateRange) {
        params.startDate = filters.dateRange.start;
        params.endDate = filters.dateRange.end;
      }
    }
    return apiClient.get<Task[]>('/farm-tasks', params);
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 创建任务
 */
export async function createTask(task: Omit<Task, 'id' | 'taskCode' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  if (USE_API) {
    return apiClient.post<Task>('/farm-tasks', task);
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 更新任务
 */
export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  if (USE_API) {
    return apiClient.put<Task>(`/farm-tasks/${id}`, updates);
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 删除任务
 */
export async function deleteTask(id: string): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/farm-tasks/${id}`);
    return true;
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 批量删除任务
 */
export async function deleteTasks(ids: string[]): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/farm-tasks/batch?ids=${ids.join(',')}`);
    return true;
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 发布任务
 */
export async function publishTask(id: string): Promise<Task | null> {
  if (USE_API) {
    return apiClient.post<Task>(`/farm-tasks/${id}/publish`);
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 撤回任务
 */
export async function withdrawTask(id: string): Promise<Task | null> {
  if (USE_API) {
    return apiClient.post<Task>(`/farm-tasks/${id}/withdraw`);
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 接受任务
 */
export async function acceptTask(id: string): Promise<Task | null> {
  if (USE_API) {
    return apiClient.post<Task>(`/farm-tasks/${id}/accept`);
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 开始执行任务
 */
export async function startTask(id: string): Promise<Task | null> {
  if (USE_API) {
    return apiClient.post<Task>(`/farm-tasks/${id}/start`);
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 提交进度
 */
export async function submitProgress(id: string, progress: number, feedback?: any): Promise<Task | null> {
  if (USE_API) {
    return apiClient.post<Task>(`/farm-tasks/${id}/progress`, { progress, feedback });
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 申请验收
 */
export async function submitForAcceptance(id: string): Promise<Task | null> {
  if (USE_API) {
    return apiClient.post<Task>(`/farm-tasks/${id}/submit-acceptance`);
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 验收通过
 */
export async function completeTask(id: string, comments?: string): Promise<Task | null> {
  if (USE_API) {
    return apiClient.post<Task>(`/farm-tasks/${id}/complete`, { comments });
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 验收驳回（返工）
 */
export async function rejectTask(id: string, reason: string): Promise<Task | null> {
  if (USE_API) {
    return apiClient.post<Task>(`/farm-tasks/${id}/reject`, { reason });
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 取消任务
 */
export async function cancelTask(id: string, reason: string): Promise<Task | null> {
  if (USE_API) {
    return apiClient.post<Task>(`/farm-tasks/${id}/cancel`, { reason });
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 放弃任务
 */
export async function abandonTask(id: string, reason: string): Promise<Task | null> {
  if (USE_API) {
    return apiClient.post<Task>(`/farm-tasks/${id}/abandon`, { reason });
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 超时继续
 */
export async function overtimeContinue(id: string): Promise<Task | null> {
  if (USE_API) {
    return apiClient.post<Task>(`/farm-tasks/${id}/overtime-continue`);
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 超时放弃
 */
export async function overtimeAbandon(id: string, reason: string): Promise<Task | null> {
  if (USE_API) {
    return apiClient.post<Task>(`/farm-tasks/${id}/overtime-abandon`, { reason });
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 重新派发任务
 */
export async function reassignTask(id: string, assigneeId: string): Promise<Task | null> {
  if (USE_API) {
    return apiClient.post<Task>(`/farm-tasks/${id}/reassign`, { assigneeId });
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 延期任务
 */
export async function extendDeadline(id: string, newDeadline: string, reason: string): Promise<Task | null> {
  if (USE_API) {
    return apiClient.post<Task>(`/farm-tasks/${id}/extend-deadline`, { newDeadline, reason });
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 催办任务
 */
export async function remindTask(id: string): Promise<boolean> {
  if (USE_API) {
    await apiClient.post(`/farm-tasks/${id}/remind`);
    return true;
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 获取任务统计
 */
export async function getTaskStats(filters?: TaskFilters): Promise<TaskStats> {
  if (USE_API) {
    return apiClient.get<TaskStats>('/farm-tasks/stats');
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 根据状态获取任务数量
 */
export async function getTaskCountByStatus(status: TaskStatus): Promise<number> {
  if (USE_API) {
    return apiClient.get<number>(`/farm-tasks/count?status=${status}`);
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 获取任务操作记录
 */
export async function getTaskRecords(taskId: string): Promise<any[]> {
  if (USE_API) {
    return apiClient.get<any[]>(`/farm-tasks/${taskId}/records`);
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 获取逾期任务列表
 */
export async function getOverdueTasks(): Promise<Task[]> {
  if (USE_API) {
    return apiClient.get<Task[]>('/farm-tasks/overdue');
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 获取待接受的任务列表
 */
export async function getPendingTasks(): Promise<Task[]> {
  if (USE_API) {
    return apiClient.get<Task[]>('/farm-tasks/pending');
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 获取进行中的任务列表
 */
export async function getInProgressTasks(): Promise<Task[]> {
  if (USE_API) {
    return apiClient.get<Task[]>('/farm-tasks/in-progress');
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}

/**
 * 获取待验收的任务列表
 */
export async function getWaitingAcceptanceTasks(): Promise<Task[]> {
  if (USE_API) {
    return apiClient.get<Task[]>('/farm-tasks/waiting-acceptance');
  }
  throw new Error('本地服务 farmTaskService 尚未实现');
}
