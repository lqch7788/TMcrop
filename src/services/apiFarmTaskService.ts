/**
 * 农事任务 API 服务
 * 对接后端 /api/farm-tasks
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { Task, TaskFilters, TaskStats, TaskStatus } from '../types/task';

/**
 * 获取所有农事任务
 * 降级策略：API → IndexedDB 缓存
 */
export async function getAllTasks(): Promise<Task[]> {
  const data = await enhancedApiClient.get<Task[]>('/farm-tasks', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  return data || [];
}

/**
 * 根据ID获取任务
 * 降级策略：API → IndexedDB 缓存
 */
export async function getTaskById(id: string): Promise<Task | undefined> {
  return await enhancedApiClient.get<Task>(`/farm-tasks/${id}`, {
    useCache: true,
    cacheStrategy: 'network-first',
  });
}

/**
 * 根据任务编码获取任务
 * 降级策略：API → IndexedDB 缓存
 */
export async function getTaskByCode(taskCode: string): Promise<Task | undefined> {
  return await enhancedApiClient.get<Task>(`/farm-tasks/code/${taskCode}`, {
    useCache: true,
    cacheStrategy: 'network-first',
  });
}

/**
 * 获取任务列表（支持筛选）
 * 降级策略：API → IndexedDB 缓存
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
  const data = await enhancedApiClient.get<Task[]>('/farm-tasks', { params, useCache: true, cacheStrategy: 'network-first' });
  return data || [];
}

/**
 * 创建任务
 * 降级策略：API → 离线队列
 */
export async function createTask(task: Omit<Task, 'id' | 'taskCode' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  const result = await enhancedApiClient.post<Task>('/farm-tasks', task, {
    offlineQueue: true,
    useCache: true,
  });
  return result;
}

/**
 * 更新任务
 * 降级策略：API → 离线队列
 */
export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const result = await enhancedApiClient.put<Task>(`/farm-tasks/${id}`, updates, {
    offlineQueue: true,
  });
  return result;
}

/**
 * 删除任务
 * 降级策略：API → 离线队列
 */
export async function deleteTask(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/farm-tasks/${id}`, {
    offlineQueue: true,
  });
  return true;
}

/**
 * 批量删除任务
 * 降级策略：API → 离线队列
 */
export async function deleteTasks(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/farm-tasks/batch?ids=${ids.join(',')}`, {
    offlineQueue: true,
  });
  return true;
}

/**
 * 发布任务
 * 降级策略：API → 离线队列
 */
export async function publishTask(id: string): Promise<Task | null> {
  return await enhancedApiClient.post<Task>(`/farm-tasks/${id}/publish`, undefined, {
    offlineQueue: true,
  });
}

/**
 * 撤回任务
 * 降级策略：API → 离线队列
 */
export async function withdrawTask(id: string): Promise<Task | null> {
  return await enhancedApiClient.post<Task>(`/farm-tasks/${id}/withdraw`, undefined, {
    offlineQueue: true,
  });
}

/**
 * 接受任务
 * 降级策略：API → 离线队列
 */
export async function acceptTask(id: string): Promise<Task | null> {
  return await enhancedApiClient.post<Task>(`/farm-tasks/${id}/accept`, undefined, {
    offlineQueue: true,
  });
}

/**
 * 开始执行任务
 * 降级策略：API → 离线队列
 */
export async function startTask(id: string): Promise<Task | null> {
  return await enhancedApiClient.post<Task>(`/farm-tasks/${id}/start`, undefined, {
    offlineQueue: true,
  });
}

/**
 * 提交进度
 * 降级策略：API → 离线队列
 */
export async function submitProgress(id: string, progress: number, feedback?: Record<string, unknown>): Promise<Task | null> {
  return await enhancedApiClient.post<Task>(`/farm-tasks/${id}/progress`, { progress, feedback }, {
    offlineQueue: true,
  });
}

/**
 * 申请验收
 * 降级策略：API → 离线队列
 */
export async function submitForAcceptance(id: string): Promise<Task | null> {
  return await enhancedApiClient.post<Task>(`/farm-tasks/${id}/submit-acceptance`, undefined, {
    offlineQueue: true,
  });
}

/**
 * 验收通过
 * 降级策略：API → 离线队列
 */
export async function completeTask(id: string, comments?: string): Promise<Task | null> {
  return await enhancedApiClient.post<Task>(`/farm-tasks/${id}/complete`, { comments }, {
    offlineQueue: true,
  });
}

/**
 * 验收驳回（返工）
 * 降级策略：API → 离线队列
 */
export async function rejectTask(id: string, reason: string): Promise<Task | null> {
  return await enhancedApiClient.post<Task>(`/farm-tasks/${id}/reject`, { reason }, {
    offlineQueue: true,
  });
}

/**
 * 取消任务
 * 降级策略：API → 离线队列
 */
export async function cancelTask(id: string, reason: string): Promise<Task | null> {
  return await enhancedApiClient.post<Task>(`/farm-tasks/${id}/cancel`, { reason }, {
    offlineQueue: true,
  });
}

/**
 * 放弃任务
 * 降级策略：API → 离线队列
 */
export async function abandonTask(id: string, reason: string): Promise<Task | null> {
  return await enhancedApiClient.post<Task>(`/farm-tasks/${id}/abandon`, { reason }, {
    offlineQueue: true,
  });
}

/**
 * 超时继续
 * 降级策略：API → 离线队列
 */
export async function overtimeContinue(id: string): Promise<Task | null> {
  return await enhancedApiClient.post<Task>(`/farm-tasks/${id}/overtime-continue`, undefined, {
    offlineQueue: true,
  });
}

/**
 * 超时放弃
 * 降级策略：API → 离线队列
 */
export async function overtimeAbandon(id: string, reason: string): Promise<Task | null> {
  return await enhancedApiClient.post<Task>(`/farm-tasks/${id}/overtime-abandon`, { reason }, {
    offlineQueue: true,
  });
}

/**
 * 重新派发任务
 * 降级策略：API → 离线队列
 */
export async function reassignTask(id: string, assigneeId: string): Promise<Task | null> {
  return await enhancedApiClient.post<Task>(`/farm-tasks/${id}/reassign`, { assigneeId }, {
    offlineQueue: true,
  });
}

/**
 * 延期任务
 * 降级策略：API → 离线队列
 */
export async function extendDeadline(id: string, newDeadline: string, reason: string): Promise<Task | null> {
  return await enhancedApiClient.post<Task>(`/farm-tasks/${id}/extend-deadline`, { newDeadline, reason }, {
    offlineQueue: true,
  });
}

/**
 * 催办任务
 * 降级策略：API → 离线队列
 */
export async function remindTask(id: string): Promise<boolean> {
  await enhancedApiClient.post(`/farm-tasks/${id}/remind`, undefined, {
    offlineQueue: true,
  });
  return true;
}

/**
 * 获取任务统计
 * 降级策略：API → IndexedDB 缓存
 */
export async function getTaskStats(filters?: TaskFilters): Promise<TaskStats> {
  return await enhancedApiClient.get<TaskStats>('/farm-tasks/stats', {
    useCache: true,
    cacheStrategy: 'stale-while-revalidate',
  });
}

/**
 * 根据状态获取任务数量
 * 降级策略：API → IndexedDB 缓存
 */
export async function getTaskCountByStatus(status: TaskStatus): Promise<number> {
  return await enhancedApiClient.get<number>(`/farm-tasks/count?status=${status}`, {
    useCache: true,
    cacheStrategy: 'network-first',
  });
}

/**
 * 获取任务操作记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getTaskRecords(taskId: string): Promise<any[]> {
  return await enhancedApiClient.get<any[]>(`/farm-tasks/${taskId}/records`, {
    useCache: true,
    cacheStrategy: 'network-first',
  });
}

/**
 * 获取逾期任务列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getOverdueTasks(): Promise<Task[]> {
  const data = await enhancedApiClient.get<Task[]>('/farm-tasks/overdue', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  return data || [];
}

/**
 * 获取待接受的任务列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getPendingTasks(): Promise<Task[]> {
  const data = await enhancedApiClient.get<Task[]>('/farm-tasks/pending', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  return data || [];
}

/**
 * 获取进行中的任务列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getInProgressTasks(): Promise<Task[]> {
  const data = await enhancedApiClient.get<Task[]>('/farm-tasks/in-progress', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  return data || [];
}

/**
 * 获取待验收的任务列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWaitingAcceptanceTasks(): Promise<Task[]> {
  const data = await enhancedApiClient.get<Task[]>('/farm-tasks/waiting-acceptance', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  return data || [];
}

/**
 * 归档任务
 * 降级策略：API → 离线队列
 */
export async function archiveTask(id: string): Promise<Task | null> {
  return await enhancedApiClient.post<Task>(`/farm-tasks/${id}/archive`, undefined, {
    offlineQueue: true,
  });
}

/**
 * 批量归档任务
 * 降级策略：API → 离线队列
 */
export async function archiveTasks(ids: string[]): Promise<boolean> {
  await enhancedApiClient.post(`/farm-tasks/batch-archive`, { ids }, {
    offlineQueue: true,
  });
  return true;
}
