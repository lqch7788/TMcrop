/**
 * 农事任务 Store - FarmTaskStore
 *
 * V2.1 架构 - 已简化
 *
 * 注意：此Store专注于数据管理，业务逻辑（如状态流转、操作记录）保留在useTasks中
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型定义 ==========

export type TaskStatus = 'draft' | 'pending' | 'accepted' | 'in_progress' | 'waiting_acceptance' | 'completed' | 'rejected' | 'failed' | 'cancelled' | 'abandoned';

export interface Task {
  id: string;
  taskCode: string;
  title: string;
  type: string;
  typeName: string;
  status: TaskStatus;
  priority: 'urgent' | 'high' | 'normal';
  progress: number;
  sourceType: 'dispatch' | 'tempTask' | 'smart';
  dispatchMode?: 'farm' | 'tempTask' | 'smart';
  assigneeId: string;
  assigneeName: string;
  assignerId: string;
  assignerName: string;
  dueDate?: string;
  startTime?: string;
  endTime?: string;
  acceptedAt?: string;
  completedAt?: string;
  greenhouseId?: string;
  greenhouseName?: string;
  cropName?: string;
  field?: string;
  assignee?: string;
  crop?: string;
  planStart?: string;
  planEnd?: string;
  estimatedDays?: number;
  estimatedHours?: number;
  materials?: string[];
  tools?: string[];
  sopContent?: string;
  typeConfig?: Record<string, unknown>;
  sourceProblemId?: string;
  sourceInspectionId?: string;
  feedbackRequirements?: Array<{
    type: 'gps' | 'image_before' | 'image_after' | 'text' | 'materials';
    label: string;
    required: boolean;
  }>;
  reworkCount: number;
  reworkHistory: Array<{
    reworkCount: number;
    reworkReason: string;
    reworkBy: string;
    reworkAt: string;
    taskStatusBeforeRework: TaskStatus;
  }>;
  deadlineExtensions: Array<{
    id: string;
    originalDeadline: string;
    newDeadline: string;
    reason: string;
    extendedBy: string;
    extendedAt: string;
  }>;
  version: number;
  createdAt: string;
  updatedAt: string;
  remarks?: string;
  description?: string;
  batchId?: string;
  batchCode?: string;
}

export interface FarmTaskFilters {
  status?: TaskStatus;
  priority?: 'urgent' | 'high' | 'normal';
  assigneeId?: string;
  greenhouseId?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

// ========== Store 类型 ==========

interface FarmTaskState {
  // 数据
  tasks: Task[];

  // 视图状态
  filters: FarmTaskFilters;

  // 加载状态
  isLoading: boolean;
  error: string | null;

  // 离线状态
  isOnline: boolean;
  pendingSyncCount: number;

  // Actions - 数据获取
  fetchTasks: () => Promise<void>;
  fetchTasksByDate: (date: string) => Promise<Task[]>;

  // Actions - 增删改
  addTask: (task: Omit<Task, 'id' | 'taskCode' | 'version' | 'createdAt' | 'updatedAt'>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;


  // Actions - 状态更新（快捷方法）
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;

  // Actions - 筛选
  setFilters: (filters: Partial<FarmTaskFilters>) => void;

  // Actions - 同步
  syncPendingChanges: () => Promise<void>;

  // 内部方法
  _initializeSeedData: () => void;
}

// ========== Store 实现 ==========

export const useFarmTaskStore = create<FarmTaskState>()(
  (set, get) => ({
      // 初始状态
      tasks: [],
      filters: {},
      isLoading: false,
      error: null,
      isOnline: navigator.onLine,
      pendingSyncCount: 0,

      // ========== 数据获取 ==========

      fetchTasks: async () => {
        set({ isLoading: true, error: null });

        try {
          // 尝试从API获取
          // API返回格式: { success: true, data: Task[], meta: {...} }
          const apiData = await enhancedApiClient.get<Task[]>('/farm-tasks');

          // 正确处理 API 返回的 { success, data, meta } 结构
          if (Array.isArray(apiData) && apiData.length > 0) {
            set({ tasks: apiData, isLoading: false });
            return;
          }

          // API返回空或失败，使用本地数据
          const localTasks = get().tasks;
          if (localTasks.length === 0) {
            // 首次使用，初始化种子数据
            get()._initializeSeedData();
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.warn('[FarmTaskStore] API获取失败，使用本地数据:', error);

          // API失败，检查本地是否有数据
          const localTasks = get().tasks;
          if (localTasks.length === 0) {
            get()._initializeSeedData();
          }
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      fetchTasksByDate: async (date: string) => {
        const { tasks } = get();
        return tasks.filter(task => task.dueDate === date);
      },

      // ========== 增删改 ==========

      addTask: async (task) => {
        const tempId = `TEMP-${Date.now()}`;
        const taskCode = `NS${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        const now = new Date().toISOString();

        const newTask: Task = {
          ...task,
          id: tempId,
          taskCode,
          version: 1,
          createdAt: now,
          updatedAt: now,
          reworkCount: 0,
          reworkHistory: [],
          deadlineExtensions: [],
        } as Task;

        // 先乐观更新本地
        set(state => ({
          tasks: [newTask, ...state.tasks],
        }));

        try {
          // 尝试调用API（包含 taskCode，确保后端使用 NS 前缀而非 TK 默认值）
          const savedTask = await enhancedApiClient.post<Task>(
            '/farm-tasks',
            { ...task, taskCode }
          );

          // API成功，将API返回数据合并到本地任务（保留本地字段，仅用API数据补充）
          const realId = savedTask.id || savedTask.taskCode || tempId;
          set(state => ({
            tasks: state.tasks.map(t =>
              t.id === tempId ? { ...t, ...savedTask, id: realId, taskCode: savedTask.taskCode || t.taskCode || taskCode } : t
            ),
          }));

          return savedTask;
        } catch (error) {
          console.warn('[FarmTaskStore] 创建任务API失败，已加入离线队列:', error);

          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));

          return newTask;
        }
      },

      updateTask: async (id, updates) => {
        // 先乐观更新本地
        set(state => ({
          tasks: state.tasks.map(t =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString(), version: t.version + 1 } : t
          ),
        }));

        try {
          await enhancedApiClient.put(`/farm-tasks/${id}`, updates);
        } catch (error) {
          console.warn('[FarmTaskStore] 更新任务API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
        }
      },

      deleteTask: async (id) => {
        // 先乐观更新本地
        set(state => ({
          tasks: state.tasks.filter(t => t.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/farm-tasks/${id}`);
        } catch (error) {
          console.warn('[FarmTaskStore] 删除任务API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
        }
      },

      updateTaskStatus: async (id, status) => {
        await get().updateTask(id, { status });
      },


      // ========== 筛选 ==========

      setFilters: (filters) => {
        set(state => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      // ========== 内部方法 ==========

      _initializeSeedData: () => {
        // 注意：由于农事任务数据复杂，种子数据初始化逻辑保留在 useTasks 中
        // 这里只设置加载状态
        set({ isLoading: false });
        // 种子数据初始化完成（使用空数据，由 useTasks 填充）
      },
  })
);

// ========== 辅助函数 ==========

/**
 * 获取指定状态的任务
 */
export const getTasksByStatus = (status: TaskStatus) => {
  return useFarmTaskStore.getState().tasks.filter(task => task.status === status);
};

/**
 * 获取指定执行人的任务
 */
export const getTasksByAssignee = (assigneeId: string) => {
  return useFarmTaskStore.getState().tasks.filter(task => task.assigneeId === assigneeId);
};

/**
 * 获取指定日期范围的任务
 */
export const getTasksByDateRange = (startDate: string, endDate: string) => {
  return useFarmTaskStore.getState().tasks.filter(
    task => task.dueDate && task.dueDate >= startDate && task.dueDate <= endDate
  );
};

/**
 * 获取超时任务
 */
export const getOverdueTasks = () => {
  const now = new Date().toISOString().split('T')[0];
  return useFarmTaskStore.getState().tasks.filter(
    task => task.dueDate && task.dueDate < now && !['completed', 'cancelled', 'abandoned'].includes(task.status)
  );
};
