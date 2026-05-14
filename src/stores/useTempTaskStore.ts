/**
 * 临时任务 Zustand Store
 *
 * 架构：enhancedApiClient → API → IndexedDB → localStorage (三级降级)
 * 数据流：Store → 组件 (组件不直接读写localStorage)
 *
 * 对接后端: /api/temp-tasks
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  result.title = result.title || result.task_title || '';
  result.type = result.type || result.task_type || '';
  result.description = result.description || result.task_content || '';
  result.taskCode = result.taskCode || result.task_code || '';
  result.priority = result.priority || result.urgency || 'normal';
  result.status = result.status || 'draft';
  result.createdAt = result.createdAt || result.create_time || new Date().toISOString();
  return result as TempTaskData;
}

/** 前端 → 后端 字段映射 */
function denormalizeTask(task: Partial<TempTaskData>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  for (const [key, value] of Object.entries(task)) {
    const backendKey = reverse[key] || key;
    result[backendKey] = value;
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
  persist(
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
          let data = response?.data || [];
          if (!Array.isArray(data) && (response as any)?.data) {
            data = Array.isArray((response as any).data) ? (response as any).data : [];
          }
          const normalized = (Array.isArray(data) ? data : []).map(normalizeTask);
          set({ tasks: normalized, isLoading: false });
        } catch (error) {
          console.warn('[TempTaskStore] API获取失败，使用本地数据:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createTask: async (task) => {
        try {
          const body = denormalizeTask(task);
          const response = await enhancedApiClient.post<{ success: boolean; data: { id: string } }>(
            '/temp-tasks', body, { priority: 0 }
          );
          const newId = (response as any)?.data?.id || `TT${Date.now()}`;
          const newTask = normalizeTask({ ...task, id: newId } as Record<string, unknown>);
          set((state) => ({ tasks: [newTask, ...state.tasks] }));
          return newTask;
        } catch (error) {
          console.warn('[TempTaskStore] 创建任务API失败，已加入离线队列:', error);
          set({ error: (error as Error).message });
          return null;
        }
      },

      updateTask: async (id, updates) => {
        const body = denormalizeTask(updates);
        // 乐观更新
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
        try {
          await enhancedApiClient.put(`/temp-tasks/${id}`, body, { priority: 0 });
        } catch (error) {
          console.warn('[TempTaskStore] 更新任务API失败，已加入离线队列:', error);
        }
      },

      deleteTask: async (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        try {
          await enhancedApiClient.delete(`/temp-tasks/${id}`, { priority: 0 });
          return true;
        } catch (error) {
          console.warn('[TempTaskStore] 删除任务API失败，已加入离线队列:', error);
          return false;
        }
      },

      deleteTasks: async (ids) => {
        set((state) => ({ tasks: state.tasks.filter((t) => !ids.includes(t.id)) }));
        try {
          await Promise.all(ids.map((id) =>
            enhancedApiClient.delete(`/temp-tasks/${id}`, { priority: 0 }).catch(() => {})
          ));
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'temp-task-storage',
      partialize: (state) => ({ tasks: state.tasks }),
    }
  )
);
