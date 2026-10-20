import { useState, useEffect, useCallback } from 'react';
import { enhancedApiClient } from '../lib/apiClient';

/**
 * 农事任务排班数据
 *
 * 2026-10-20 P0-6 修正：接口返回的是 **camelCase**（服务端 /api 全局响应中间件统一转换），
 * 原类型定义为 snake_case，与实际响应不匹配 —— 这是本 Hook 从未被任何页面使用的原因。
 */
export interface FarmTaskSchedule {
  id: string;
  taskId: string;
  taskTitle?: string;
  taskCode?: string;
  workerId: string;
  workerName: string;
  teamId: string | null;
  teamName: string | null;
  planDate: string;
  planStart: string | null;
  planEnd: string | null;
  shiftType: string;
  status: string;
  remarks: string | null;
}

/**
 * 待排班任务数据（服务端直接返回 farm_tasks 原始行，经 camelCase 转换）
 */
export interface UnscheduledTask {
  id: string;
  taskCode: string;
  taskTitle?: string;
  title?: string;
  typeName?: string;
  type?: string;
  assigneeId: string;
  assigneeName: string;
  planDate: string;
  planTime?: string;
  greenhouseName?: string;
  areaName?: string;
  priority?: string;
}

/**
 * useFarmTaskSchedule Hook 返回结果
 */
export interface UseFarmTaskScheduleResult {
  schedules: FarmTaskSchedule[];
  unscheduledTasks: UnscheduledTask[];
  loading: boolean;
  error: string | null;
  createSchedule: (input: Partial<FarmTaskSchedule>) => Promise<FarmTaskSchedule>;
  updateSchedule: (id: string, updates: Partial<FarmTaskSchedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  refresh: () => void;
}

// 班次类型（与服务端 shift_type 对应）
export const FARM_TASK_SHIFT_TYPES = [
  { value: 'day', label: '白班' },
  { value: 'night', label: '夜班' },
  { value: 'morning', label: '早班' },
  { value: 'afternoon', label: '午班' },
] as const;

/**
 * useFarmTaskSchedule Hook
 * @param filters 可选的筛选条件：日期、执行人、班组
 */
export function useFarmTaskSchedule(filters?: {
  date?: string;
  workerId?: string;
  teamId?: string;
}): UseFarmTaskScheduleResult {
  const [schedules, setSchedules] = useState<FarmTaskSchedule[]>([]);
  const [unscheduledTasks, setUnscheduledTasks] = useState<UnscheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.date) params.append('date', filters.date);
      if (filters?.workerId) params.append('workerId', filters.workerId);
      if (filters?.teamId) params.append('teamId', filters.teamId);

      const url = `/farm-task-schedules/list${params.toString() ? `?${params.toString()}` : ''}`;
      const result = await enhancedApiClient.get<FarmTaskSchedule[]>(url);
      setSchedules(Array.isArray(result) ? result : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters?.date, filters?.workerId, filters?.teamId]);

  const fetchUnscheduledTasks = useCallback(async () => {
    try {
      const result = await enhancedApiClient.get<UnscheduledTask[]>('/farm-task-schedules/unscheduled');
      setUnscheduledTasks(Array.isArray(result) ? result : []);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void fetchSchedules();
    void fetchUnscheduledTasks();
  }, [fetchSchedules, fetchUnscheduledTasks]);

  const createSchedule = useCallback(async (input: Partial<FarmTaskSchedule>): Promise<FarmTaskSchedule> => {
    const response = await enhancedApiClient.rawPost('/farm-task-schedules', {
      body: JSON.stringify(input),
    });

    // 处理 409 冲突错误
    if (response.status === 409) {
      const result = await response.json();
      throw new Error(result.error || '该执行人在同日已有排班');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '创建排班失败');
    }

    void fetchSchedules();
    void fetchUnscheduledTasks();
    return result.data as FarmTaskSchedule;
  }, [fetchSchedules, fetchUnscheduledTasks]);

  const updateSchedule = useCallback(async (id: string, updates: Partial<FarmTaskSchedule>): Promise<void> => {
    const response = await enhancedApiClient.rawPut(`/farm-task-schedules/${id}`, {
      body: JSON.stringify(updates),
    });

    if (response.status === 409) {
      const result = await response.json();
      throw new Error(result.error || '该执行人在同日已有排班');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '更新排班失败');
    }

    void fetchSchedules();
  }, [fetchSchedules]);

  const deleteSchedule = useCallback(async (id: string): Promise<void> => {
    const result = await enhancedApiClient.delete<{ success: boolean; error?: string }>(
      `/farm-task-schedules/${id}`
    );
    if (!result.success) {
      throw new Error(result.error || '删除排班失败');
    }

    void fetchSchedules();
    void fetchUnscheduledTasks();
  }, [fetchSchedules, fetchUnscheduledTasks]);

  const refresh = useCallback(() => {
    void fetchSchedules();
    void fetchUnscheduledTasks();
  }, [fetchSchedules, fetchUnscheduledTasks]);

  return {
    schedules,
    unscheduledTasks,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    refresh,
  };
}

export default useFarmTaskSchedule;
