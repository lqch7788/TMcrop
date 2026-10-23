import { useState, useEffect, useCallback } from 'react';
import { enhancedApiClient } from '../lib/apiClient';
import { useShiftStore } from '../stores/useShiftStore';
import type { Shift } from '../services/apiBasicDataService';

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
  /** 班次名称（后端 JOIN shifts 表得出，2026-10-20 新增） */
  shiftName?: string | null;
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
  /**
   * 班次字典（来源 shifts 表，唯一数据源，由 ShiftEditor 维护）。
   * 2026-10-20：替代原硬编码枚举 FARM_TASK_SHIFT_TYPES（day/night/morning/afternoon），
   * 那套码与排班调度的班次表对不上，两边班次无法互相理解。
   */
  shifts: Shift[];
  loading: boolean;
  error: string | null;
  createSchedule: (input: Partial<FarmTaskSchedule>) => Promise<FarmTaskSchedule>;
  updateSchedule: (id: string, updates: Partial<FarmTaskSchedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  refresh: () => void;
}

/**
 * useFarmTaskSchedule Hook
 * @param filters 可选的筛选条件：日期区间（startDate/endDate）、单日精确匹配（date）、执行人、班组
 *   2026-10-23：起止日期为闭区间，页面「已排班任务」表格按时间段检索时使用
 */
export function useFarmTaskSchedule(filters?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  workerId?: string;
  teamId?: string;
}): UseFarmTaskScheduleResult {
  const [schedules, setSchedules] = useState<FarmTaskSchedule[]>([]);
  const [unscheduledTasks, setUnscheduledTasks] = useState<UnscheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 班次字典：shifts 表是唯一数据源（ShiftEditor 维护），不再用硬编码枚举
  const shifts = useShiftStore((s) => s.shifts);
  const loadShifts = useShiftStore((s) => s.loadShifts);

  useEffect(() => {
    if (shifts.length === 0) void loadShifts();
  }, [shifts.length, loadShifts]);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.date) params.append('date', filters.date);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
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
  }, [filters?.date, filters?.startDate, filters?.endDate, filters?.workerId, filters?.teamId]);

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
    shifts,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    refresh,
  };
}

export default useFarmTaskSchedule;
