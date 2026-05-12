/**
 * 农事任务 API 服务
 * 对接后端 /api/farm-tasks
 * 使用 enhancedApiClient 内置三级降级（API → IndexedDB → localStorage）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { Task, TaskFilters, TaskStats, TaskStatus } from '../types/task';

/**
 * 获取所有农事任务
 */
export async function getAllTasks(): Promise<Task[]> {
  const data = await enhancedApiClient.get<Task[]>('/farm-tasks');
  return data || [];
}

/**
 * 根据ID获取任务
 */
export async function getTaskById(id: string): Promise<Task | undefined> {
  return await enhancedApiClient.get<Task>(`/farm-tasks/${id}`);
}

/**
 * 根据任务编码获取任务
 */
export async function getTaskByCode(taskCode: string): Promise<Task | undefined> {
  return await enhancedApiClient.get<Task>(`/farm-tasks/code/${taskCode}`);
}

/**
 * 获取任务列表（支持筛选）
 */
export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
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
  const data = await enhancedApiClient.get<Task[]>('/farm-tasks', params);
  return data || [];
}

/**
 * 创建任务
 */
export async function createTask(task: Omit<Task, 'id' | 'taskCode' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  const result = await enhancedApiClient.post<Task>('/farm-tasks', task);
  return result;
}

/**
 * 更新任务
 */
export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const result = await enhancedApiClient.put<Task>(`/farm-tasks/${id}`, updates);
  return result;
}

/**
 * 删除任务
 */
export async function deleteTask(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/farm-tasks/${id}`);
  return true;
}

/**
 * 批量删除任务
 */
export async function deleteTasks(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/farm-tasks/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 发布任务
 */
export async function publishTask(id: string): Promise<Task | null> {
  return enhancedApiClient.post<Task>(`/farm-tasks/${id}/publish`);
}

/**
 * 撤回任务
 */
export async function withdrawTask(id: string): Promise<Task | null> {
  return enhancedApiClient.post<Task>(`/farm-tasks/${id}/withdraw`);
}

/**
 * 接受任务
 */
export async function acceptTask(id: string): Promise<Task | null> {
  return enhancedApiClient.post<Task>(`/farm-tasks/${id}/accept`);
}

/**
 * 开始执行任务
 */
export async function startTask(id: string): Promise<Task | null> {
  return enhancedApiClient.post<Task>(`/farm-tasks/${id}/start`);
}

/**
 * 提交进度
 * @param id 任务ID
 * @param progress 进度值（0-100）
 * @param feedback 反馈信息
 */
export async function submitProgress(id: string, progress: number, feedback?: Record<string, unknown>): Promise<Task | null> {
  return enhancedApiClient.post<Task>(`/farm-tasks/${id}/progress`, { progress, feedback });
}

/**
 * 申请验收
 */
export async function submitForAcceptance(id: string): Promise<Task | null> {
  return enhancedApiClient.post<Task>(`/farm-tasks/${id}/submit-acceptance`);
}

/**
 * 验收通过
 */
export async function completeTask(id: string, comments?: string): Promise<Task | null> {
  return enhancedApiClient.post<Task>(`/farm-tasks/${id}/complete`, { comments });
}

/**
 * 验收驳回（返工）
 */
export async function rejectTask(id: string, reason: string): Promise<Task | null> {
  return enhancedApiClient.post<Task>(`/farm-tasks/${id}/reject`, { reason });
}

/**
 * 取消任务
 */
export async function cancelTask(id: string, reason: string): Promise<Task | null> {
  return enhancedApiClient.post<Task>(`/farm-tasks/${id}/cancel`, { reason });
}

/**
 * 放弃任务
 */
export async function abandonTask(id: string, reason: string): Promise<Task | null> {
  return enhancedApiClient.post<Task>(`/farm-tasks/${id}/abandon`, { reason });
}

/**
 * 超时继续
 */
export async function overtimeContinue(id: string): Promise<Task | null> {
  return enhancedApiClient.post<Task>(`/farm-tasks/${id}/overtime-continue`);
}

/**
 * 超时放弃
 */
export async function overtimeAbandon(id: string, reason: string): Promise<Task | null> {
  return enhancedApiClient.post<Task>(`/farm-tasks/${id}/overtime-abandon`, { reason });
}

/**
 * 重新派发任务
 */
export async function reassignTask(id: string, assigneeId: string): Promise<Task | null> {
  return enhancedApiClient.post<Task>(`/farm-tasks/${id}/reassign`, { assigneeId });
}

/**
 * 延期任务
 */
export async function extendDeadline(id: string, newDeadline: string, reason: string): Promise<Task | null> {
  return enhancedApiClient.post<Task>(`/farm-tasks/${id}/extend-deadline`, { newDeadline, reason });
}

/**
 * 催办任务
 */
export async function remindTask(id: string): Promise<boolean> {
  await enhancedApiClient.post(`/farm-tasks/${id}/remind`);
  return true;
}

/**
 * 获取任务统计
 */
export async function getTaskStats(filters?: TaskFilters): Promise<TaskStats> {
  return enhancedApiClient.get<TaskStats>('/farm-tasks/stats');
}

/**
 * 根据状态获取任务数量
 */
export async function getTaskCountByStatus(status: TaskStatus): Promise<number> {
  return enhancedApiClient.get<number>(`/farm-tasks/count?status=${status}`);
}

/**
 * 获取任务操作记录
 */
export async function getTaskRecords(taskId: string): Promise<any[]> {
  return enhancedApiClient.get<any[]>(`/farm-tasks/${taskId}/records`);
}

/**
 * 获取逾期任务列表
 */
export async function getOverdueTasks(): Promise<Task[]> {
  const data = await enhancedApiClient.get<Task[]>('/farm-tasks/overdue');
  return data || [];
}

/**
 * 获取待接受的任务列表
 */
export async function getPendingTasks(): Promise<Task[]> {
  const data = await enhancedApiClient.get<Task[]>('/farm-tasks/pending');
  return data || [];
}

/**
 * 获取进行中的任务列表
 */
export async function getInProgressTasks(): Promise<Task[]> {
  const data = await enhancedApiClient.get<Task[]>('/farm-tasks/in-progress');
  return data || [];
}

/**
 * 获取待验收的任务列表
 */
export async function getWaitingAcceptanceTasks(): Promise<Task[]> {
  const data = await enhancedApiClient.get<Task[]>('/farm-tasks/waiting-acceptance');
  return data || [];
}

/**
 * 归档任务
 * 将任务归档到历史记录中
 */
export async function archiveTask(id: string): Promise<Task | null> {
  return enhancedApiClient.post<Task>(`/farm-tasks/${id}/archive`);
}

/**
 * 批量归档任务
 * 将多个任务归档到历史记录中
 */
export async function archiveTasks(ids: string[]): Promise<boolean> {
  await enhancedApiClient.post(`/farm-tasks/batch-archive`, { ids });
  return true;
}
