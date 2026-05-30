/**
 * 工作日志 Zustand Store (V2.0 架构 - API 模式)
 *
 * 架构：Zustand → enhancedApiClient → 后端 API
 * 数据流：Store → 组件 (组件不直接读写 localStorage)
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 类型定义 ====================

/** 工作日志数据 */
export interface WorkLog {
  id: string;
  code: string;
  date: string;
  worker: string;
  weather: string;
  temperature: string;
  crop: string;
  greenhouse: string;
  growthStatus: '良好' | '一般';
  tasks: string;
  problems: string;
  solutions: string;
  taskId?: string;
  batchId?: string;
  batchCode?: string;
  taskCode?: string;
  taskType?: string;
  taskTypeName?: string;
  progress?: number;
  workloadHours?: number;
  workloadDays?: number;
  workers?: number;
  submitTime?: string;
  feedbackText?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 筛选条件 */
export interface WorkLogFilters {
  date: string;
  worker: string;
  greenhouse: string;
}

// ==================== API 响应类型 ====================

interface WorkLogsResponse {
  data: WorkLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ==================== Store 接口 ====================

interface WorkLogState {
  /** 工作日志列表 */
  workLogs: WorkLog[];
  /** 筛选条件（UI状态） */
  filters: WorkLogFilters;
  /** 加载状态 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 分页信息 */
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // CRUD
  fetchWorkLogs: () => Promise<void>;
  addWorkLog: (data: Partial<WorkLog>) => Promise<WorkLog>;
  updateWorkLog: (id: string, updates: Partial<WorkLog>) => Promise<void>;
  deleteWorkLog: (id: string) => Promise<void>;

  // 筛选
  setFilters: (filters: Partial<WorkLogFilters>) => void;
}

// ==================== 创建 Store ====================

export const useWorkLogStore = create<WorkLogState>()((set, get) => ({
  workLogs: [],
  filters: { date: '', worker: '', greenhouse: '全部' },
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  },

  fetchWorkLogs: async () => {
    const { filters } = get();
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.worker) params.append('worker', filters.worker);
      if (filters.greenhouse && filters.greenhouse !== '全部') params.append('greenhouse', filters.greenhouse);

      const response = await enhancedApiClient.get<WorkLogsResponse>(`/work-logs?${params.toString()}`);

      // 兼容处理：可能是数组或 {data: [], meta: {}} 格式
      if (Array.isArray(response)) {
        set({ workLogs: response, isLoading: false });
      } else if (response && typeof response === 'object' && 'data' in response) {
        const resp = response as WorkLogsResponse;
        set({
          workLogs: resp.data || [],
          pagination: {
            page: resp.meta?.page || 1,
            limit: resp.meta?.limit || 50,
            total: resp.meta?.total || 0,
            totalPages: resp.meta?.totalPages || 0,
          },
          isLoading: false,
        });
      } else {
        set({ workLogs: [], isLoading: false });
      }
    } catch (error) {
      // logger.error('获取工作日志失败:', error);
      set({
        error: error instanceof Error ? error.message : '获取工作日志失败',
        isLoading: false,
        workLogs: [],
      });
    }
  },

  addWorkLog: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await enhancedApiClient.post<WorkLog>('/work-logs', data);

      // 兼容处理：可能是直接返回数据或 {success: true, data: {}} 格式
      let newLog: WorkLog;
      if (response && typeof response === 'object' && 'id' in response) {
        newLog = response as WorkLog;
      } else if (response && typeof response === 'object' && 'success' in response) {
        newLog = (response as { data: WorkLog }).data;
      } else {
        throw new Error('创建工作日志失败：无效的响应格式');
      }

      set((state) => ({
        workLogs: [newLog, ...state.workLogs],
        isLoading: false,
      }));
      return newLog;
    } catch (error) {
      // logger.error('创建工作日志失败:', error);
      set({
        error: error instanceof Error ? error.message : '创建工作日志失败',
        isLoading: false,
      });
      throw error;
    }
  },

  updateWorkLog: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const response = await enhancedApiClient.put<WorkLog>(`/work-logs/${id}`, updates);

      // 兼容处理：可能是直接返回数据或 {success: true, data: {}} 格式
      let updatedLog: WorkLog;
      if (response && typeof response === 'object' && 'id' in response) {
        updatedLog = response as WorkLog;
      } else if (response && typeof response === 'object' && 'success' in response) {
        updatedLog = (response as { data: WorkLog }).data;
      } else {
        throw new Error('更新工作日志失败：无效的响应格式');
      }

      set((state) => ({
        workLogs: state.workLogs.map((log) =>
          log.id === id ? { ...log, ...updatedLog } : log
        ),
        isLoading: false,
      }));
    } catch (error) {
      // logger.error('更新工作日志失败:', error);
      set({
        error: error instanceof Error ? error.message : '更新工作日志失败',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteWorkLog: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await enhancedApiClient.delete(`/work-logs/${id}`);
      set((state) => ({
        workLogs: state.workLogs.filter((log) => log.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      // logger.error('删除工作日志失败:', error);
      set({
        error: error instanceof Error ? error.message : '删除工作日志失败',
        isLoading: false,
      });
      throw error;
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },
}));

// ==================== 辅助函数 ====================

/** 根据日期筛选 */
export const getWorkLogsByDate = (date: string) => {
  return useWorkLogStore.getState().workLogs.filter((log) => log.date === date);
};

/** 根据工人名称筛选 */
export const getWorkLogsByWorker = (worker: string) => {
  return useWorkLogStore.getState().workLogs.filter((log) => log.worker === worker);
};

/** 根据大棚筛选 */
export const getWorkLogsByGreenhouse = (greenhouse: string) => {
  return useWorkLogStore.getState().workLogs.filter((log) => log.greenhouse === greenhouse);
};
