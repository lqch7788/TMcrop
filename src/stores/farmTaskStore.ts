/**
 * 农事任务 Store - FarmTaskStore
 *
 * V2.1 架构 - 已简化
 *
 * 注意：此Store专注于数据管理，业务逻辑（如状态流转、操作记录）保留在useTasks中
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
import { applyListLimit } from '../config/apiLimits';

// ========== 类型定义 ==========

// 2026-10-10：新增 pending_approval（派发审批中）——任务派发接线审批后，
// 「确认执行人」先把任务置为审批中，审批通过才转「待接受」；缺此枚举导致
// FarmTaskHub 两处 `status: 'pending_approval'` 的 updateTask 调用 TS2322 编译错误
export type TaskStatus = 'draft' | 'pending' | 'pending_approval' | 'accepted' | 'in_progress' | 'waiting_acceptance' | 'completed' | 'rejected' | 'failed' | 'cancelled' | 'abandoned';

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
  /** 2026-10-21：人工数量（临时任务合并前置；总工时 =（天数×8+小时）×人工） */
  workerCount?: number;
  /** 2026-10-21：紧急程度（仅迁移保真，新建任务统一用 priority） */
  urgency?: 'urgent' | 'high' | 'normal';
  /** 后端 rejected_reason 的 camelCase（FIELD_NAME_MAP 映射为 rejectReason） */
  rejectReason?: string;
  /** 执行人拒绝次数（后端 executor_reject_count） */
  executorRejectCount?: number;
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
  /** P0-5：关联种植实例 / 生产计划 */
  plantingId?: string;
  productionPlanId?: string;
  productionPlanCode?: string;
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
  /** @param options.force 跳过 3 秒节流（写操作后立即刷新用） */
  fetchTasks: (options?: { force?: boolean }) => Promise<void>;
  fetchTasksByDate: (date: string) => Promise<Task[]>;

  // Actions - 增删改
  // 2026-10-11：id/taskCode 由调用方按需传入（前端 form 已生成 NS+日期+序号 编号），此处放开为可选
  addTask: (task: Omit<Task, 'id' | 'taskCode' | 'version' | 'createdAt' | 'updatedAt'> & { id?: string; taskCode?: string }) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;


  // Actions - 状态更新（快捷方法）
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;

  // Actions - 筛选
  setFilters: (filters: Partial<FarmTaskFilters>) => void;

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

      fetchTasks: async (options?: { force?: boolean }) => {
        // P2-4：防重复调用 — 3 秒内连续 fetchTasks 跳过（消除 useTasks/useFarmHub/FarmTaskHub 三重触发）
        // 2026-10-23：加 force —— 写操作成功后必须能立即刷新。
        //   否则「提交巡查记录 → 立刻刷新列表」会被节流吞掉，界面停在旧状态，
        //   用户再点按钮就直接撞 409。
        const now = Date.now();
        const lastFetch = ((get() as any)._lastFetchAt as number) || 0;
        if (!options?.force && now - lastFetch < 3000) {
          return;
        }
        (get() as any)._lastFetchAt = now;

        set({ isLoading: true, error: null });

        try {
          // 尝试从API获取
          // API返回格式: { success: true, data: Task[], meta: {...} }
          // 2026-10-21（P2a）：显式传 limit。后端 GET /farm-tasks 默认 limit=200，
          //   而本 Store 既不传 limit 也不读 meta.total，却在这个数组上做全量
          //   统计 / 筛选 / 徽章计数 —— 记录超 200 条后第 201 条起静默消失。
          //   （后端默认值见 server/src/routes/farmTask.ts 的 router.get('/')）
          const params = new URLSearchParams();
          applyListLimit(params);
          // 说明：巡查计划实例任务（source_type='inspection_plan'）在此**仍然拉取**——
          //   「我的任务」要显示它们。只有农事任务中心列表才传 exclude_source_type 排除，
          //   那是 UI 层的取舍（P3/P4），不能写死在本 Store 里，否则「我的任务」会丢失计划任务。
          const query = params.toString();
          const apiData = await enhancedApiClient.get<Task[]>(`/farm-tasks?${query}`);

          // 正确处理 API 返回的 { success, data, meta } 结构
          // API 正常返回（含空数组）即以此为准，空数组清空旧数据避免陈旧残留
          if (Array.isArray(apiData)) {
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
        // 优先使用用户生成的任务编号（前端 form 已经生成了正确的 NS+日期+序号 格式）
        // 如果前端没有传递，则使用前端传入的 id 或 taskCode
        // 只有当前两者都没有时，才生成新的（这不应该发生，因为前端总是会生成）
        const taskCode = task.taskCode || task.id || `NS${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
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
          console.error('[FarmTaskStore] 创建任务API失败，回滚乐观更新:', error);
          // P1-3：API 失败必须从 store 删除 tempId，否则用户看到幽灵数据（刷新后消失）
          set(state => ({
            tasks: state.tasks.filter(t => t.id !== tempId),
            error: (error as Error).message,
          }));
          throw error;
        }
      },

      updateTask: async (id, updates) => {
        // 先乐观更新本地（保存旧值用于回滚）
        const oldTask = get().tasks.find(t => t.id === id);
        set(state => ({
          tasks: state.tasks.map(t =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString(), version: t.version + 1 } : t
          ),
        }));

        try {
          await enhancedApiClient.put(`/farm-tasks/${id}`, updates);
        } catch (error) {
          console.error('[FarmTaskStore] 更新任务API失败，回滚乐观更新:', error);
          // P1-3：API 失败回滚到旧值
          if (oldTask) {
            set(state => ({
              tasks: state.tasks.map(t => t.id === id ? oldTask : t),
            }));
          }
          set(state => ({ error: (error as Error).message }));
          throw error;
        }
      },

      deleteTask: async (id) => {
        // 先乐观更新本地（保存旧值用于回滚）
        const oldTask = get().tasks.find(t => t.id === id);
        set(state => ({
          tasks: state.tasks.filter(t => t.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/farm-tasks/${id}`);
        } catch (error) {
          console.error('[FarmTaskStore] 删除任务API失败，回滚乐观更新:', error);
          // P1-3：API 失败恢复被删的任务
          if (oldTask) {
            set(state => ({
              tasks: [...state.tasks, oldTask],
            }));
          }
          set(state => ({ error: (error as Error).message }));
          throw error;
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
