/**
 * 临时任务 Zustand Store
 *
 * V2.1 架构 - 已简化
 *
 * 对接后端: /api/temp-tasks
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型定义 ==========

export interface TempTaskData {
  id: string;
  task_code?: string;
  taskCode?: string;
  task_title?: string;
  title?: string;
  task_type?: string;
  type?: string;
  task_content?: string;
  description?: string;
  requester_id?: string;
  requester_name?: string;
  requesterId?: string;
  requesterName?: string;
  assignee_id?: string;
  assignee_name?: string;
  assigneeId?: string;
  assigneeName?: string;
  greenhouse_id?: string;
  greenhouse_name?: string;
  greenhouseId?: string;
  greenhouseName?: string;
  area_name?: string;
  location?: string;
  request_date?: string;
  request_time?: string;
  priority?: string;
  urgency?: string;
  status: string;
  completion_date?: string;
  completion_note?: string;
  completionRemarks?: string;
  remarks?: string;
  dueDate?: string;
  estimatedHours?: number;
  workerCount?: number;
  actualHours?: number;
  progress?: number;
  rejectCount?: number;
  rejectReason?: string;
  reject_reason?: string;
  acceptanceRemarks?: string;
  acceptance_remarks?: string;
  required_feedback?: string | string[];
  requiredFeedback?: string | string[];
  create_time?: string;
  createTime?: string;
  createdAt?: string;
  update_time?: string;
  updateTime?: string;
  updatedAt?: string;
}

/** 后端字段名 → 前端字段名 */
const FIELD_MAP: Record<string, string> = {
  task_code: 'taskCode',
  task_title: 'title',
  task_type: 'type',
  task_content: 'description',
  requester_id: 'requesterId',
  requester_name: 'requesterName',
  assignee_id: 'assigneeId',
  assignee_name: 'assigneeName',
  greenhouse_id: 'greenhouseId',
  greenhouse_name: 'greenhouseName',
  area_name: 'location',
  request_date: 'requestDate',
  request_time: 'requestTime',
  completion_date: 'completionDate',
  completion_note: 'completionRemarks',
  create_time: 'createdAt',
  update_time: 'updatedAt',
  reject_reason: 'rejectReason',
  acceptance_remarks: 'acceptanceRemarks',
  // 新增字段映射
  due_date: 'dueDate',
  estimated_hours: 'estimatedHours',
  estimated_days: 'estimatedDays',
  worker_count: 'workerCount',
  actual_hours: 'actualHours',
  progress: 'progress',
  reject_count: 'rejectCount',
  urgency: 'urgency',
  operation_records: 'operationRecords',
  // 状态流转字段（与农事任务一致）
  start_time: 'startTime',
  accepted_at: 'acceptedAt',
  completed_at: 'completedAt',
  assigner_id: 'assignerId',
  assigner_name: 'assignerName',
  source_type: 'sourceType',
  dispatch_mode: 'dispatchMode',
  version: 'version',
  required_feedback: 'requiredFeedback',
  title: 'title',
  location: 'location',
  priority: 'priority',
  status: 'status',
  remarks: 'remarks',
};

/** 后端 → 前端 字段映射 */
function normalizeTask(db: Record<string, unknown>): TempTaskData {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  // 确保必要字段
  result.title = result.title || result.taskTitle || result.task_title || '';
  result.type = result.type || result.taskType || result.task_type || '';
  result.description = result.description || result.taskContent || result.task_content || '';
  result.taskCode = result.taskCode || result.task_code || '';
  result.priority = result.priority || result.urgency || 'normal';
  result.status = result.status || 'draft';
  result.createdAt = result.createdAt || result.create_time || new Date().toISOString();
  // 解析 requiredFeedback JSON 字符串为数组（兼容双重编码）
  if (typeof result.requiredFeedback === 'string') {
    try {
      const parsed = JSON.parse(result.requiredFeedback as string);
      // 兼容双重 JSON 编码：如果解析结果仍是字符串，再解一层
      if (typeof parsed === 'string') {
        try { result.requiredFeedback = JSON.parse(parsed); } catch { result.requiredFeedback = []; }
      } else {
        result.requiredFeedback = parsed;
      }
    } catch { result.requiredFeedback = []; }
  }
  if (!Array.isArray(result.requiredFeedback)) result.requiredFeedback = [];
  return result as TempTaskData;
}

/** 前端 → 后端 字段映射 */
function denormalizeTask(task: Partial<TempTaskData>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    // 跳过自映射条目（如 title: 'title'），保留正确的 DB 列名映射（如 task_title: 'title'）
    if (!(camel in reverse) || snake !== camel) {
      reverse[camel] = snake;
    }
  }
  for (const [key, value] of Object.entries(task)) {
    const backendKey = reverse[key] || key;
    // requiredFeedback 数组需要序列化为 JSON 字符串
    if (backendKey === 'required_feedback' && Array.isArray(value)) {
      result[backendKey] = JSON.stringify(value);
    } else {
      result[backendKey] = value;
    }
  }
  return result;
}

// ========== Store ==========

interface TempTaskState {
  tasks: TempTaskData[];
  isLoading: boolean;
  error: string | null;

  fetchTasks: (filters?: Record<string, string>) => Promise<void>;
  createTask: (task: Partial<TempTaskData>) => Promise<TempTaskData | null>;
  updateTask: (id: string, updates: Partial<TempTaskData>) => Promise<void>;
  deleteTask: (id: string) => Promise<boolean>;
  deleteTasks: (ids: string[]) => Promise<boolean>;
}

export const useTempTaskStore = create<TempTaskState>()(
  (set, get) => ({
      tasks: [],
      isLoading: false,
      error: null,

      fetchTasks: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (filters) {
            Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
          }
          const query = params.toString();
          const url = `/temp-tasks${query ? `?${query}` : ''}`;
          const response = await enhancedApiClient.get<{ success: boolean; data: TempTaskData[]; meta?: { total: number } }>(url);
          // enhancedApiClient 已提取 .data，response 即为实际数据数组
          const data = Array.isArray(response) ? response : [];
          // logger.warn('[TempTaskStore] fetchTasks 成功, 数据条数:', data.length, '示例requiredFeedback:', data.slice(0, 2).map((t: Record<string, unknown>) => ({ id: t.id || t.taskCode, rf: t.requiredFeedback, rfType: typeof t.requiredFeedback })));
          const normalized = data.map(normalizeTask);
          // logger.warn('[TempTaskStore] normalizeTask后, 示例requiredFeedback:', normalized.slice(0, 2).map(t => ({ id: t.id || t.taskCode, rf: t.requiredFeedback, rfType: typeof t.requiredFeedback, isArr: Array.isArray(t.requiredFeedback) })));
          set({ tasks: normalized, isLoading: false });
        } catch (error) {
          // logger.warn('[TempTaskStore] API获取失败，使用本地数据:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createTask: async (task) => {
        const body = denormalizeTask(task);
        const tempId = task.id || `TEMP-${Date.now()}`;
        const now = new Date().toISOString();

        // 乐观更新：先添加到本地状态，再调API（与farmTaskStore.addTask一致）
        const optimisticTask = normalizeTask({
          ...task,
          id: tempId,
          createTime: now,
          create_time: now,
          createdAt: now,
          updateTime: now,
          update_time: now,
          updatedAt: now,
        } as Record<string, unknown>);
        set((state) => ({ tasks: [optimisticTask, ...state.tasks] }));

        try {
          const savedTask = await enhancedApiClient.post(
            '/temp-tasks', body
          );
          // API成功：用服务端返回数据合并乐观任务
          const normalized = savedTask ? normalizeTask(savedTask as Record<string, unknown>) : null;
          if (normalized && normalized.id) {
            set((state) => ({
              tasks: state.tasks.map(t =>
                t.id === tempId ? { ...t, ...normalized, id: normalized.id || tempId } : t
              ),
            }));
            return normalized;
          }
          return optimisticTask;
        } catch (error) {
          // logger.warn('[TempTaskStore] 创建任务API失败，保留本地乐观数据:', error);
          return optimisticTask;
        }
      },

      updateTask: async (id, updates) => {
        const body = denormalizeTask(updates);
        // 通过 id 或 taskCode 查找实际任务（兼容 unified task 使用 taskCode 作为 id 的情况）
        const existing = get().tasks.find(t => t.id === id || t.taskCode === id);
        const realId = existing?.id || id;
        // 乐观更新
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === realId || t.taskCode === id ? { ...t, ...updates } : t)),
        }));
        try {
          await enhancedApiClient.put(`/temp-tasks/${realId}`, body);
        } catch (error) {
          // logger.warn('[TempTaskStore] 更新任务API失败，API 失败抛错（V2.1 铁律：无离线队列）:', error);
        }
      },

      deleteTask: async (id) => {
        // 通过 id 或 taskCode 查找实际任务
        const existing = get().tasks.find(t => t.id === id || t.taskCode === id);
        const realId = existing?.id || id;
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== realId && t.taskCode !== id) }));
        try {
          await enhancedApiClient.delete(`/temp-tasks/${realId}`);
          return true;
        } catch (error) {
          // logger.warn('[TempTaskStore] 删除任务API失败，API 失败抛错（V2.1 铁律：无离线队列）:', error);
          return false;
        }
      },

      deleteTasks: async (ids) => {
        // 通过 id 或 taskCode 查找实际任务ID
        const allTasks = get().tasks;
        const realIds = ids.map(id => {
          const existing = allTasks.find(t => t.id === id || t.taskCode === id);
          return existing?.id || id;
        });
        const idSet = new Set(ids);
        const realIdSet = new Set(realIds);
        set((state) => ({
          tasks: state.tasks.filter((t) => !realIdSet.has(t.id) && !idSet.has(t.taskCode || '')),
        }));
        try {
          await Promise.all(realIds.map((rid) =>
            enhancedApiClient.delete(`/temp-tasks/${rid}`).catch(() => {})
          ));
          return true;
        } catch {
          return false;
        }
      },
    }
  )
);
