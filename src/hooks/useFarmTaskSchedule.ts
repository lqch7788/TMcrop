import { useState, useEffect, useCallback } from 'react';
import { enhancedApiClient } from '../lib/apiClient';

/**
 * 农事任务排班数据
 */
export interface FarmTaskSchedule {
  id: string;
  task_id: string;
  task_title?: string;
  task_code?: string;
  worker_id: string;
  worker_name: string;
  team_id: string | null;
  team_name: string | null;
  plan_date: string;
  plan_start: string | null;
  plan_end: string | null;
  shift_type: string;
  status: string;
  remarks: string | null;
}

/**
 * 待排班任务数据
 */
export interface UnscheduledTask {
  id: string;
  task_code: string;
  title: string;
  assignee_id: string;
  assignee_name: string;
  plan_date: string;
  plan_start: string;
  greenhouse: string;
  type_name: string;
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

/**
 * 农事任务排班 Hook
 * @param filters 可选的筛选条件：日期、工人ID、班组ID
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

      const url = `/farm-task-schedules/list${params.toString() ? '?' + params.toString() : ''}`;
      const result = await enhancedApiClient.get<{ success: boolean; data?: FarmTaskSchedule[]; error?: string }>(url);

      if (result.success) {
        setSchedules(result.data || []);
      } else {
        setError(result.error || '获取排班失败');
      }
    } catch (err) {
      setError('网络错误');
      console.error('获取排班失败:', err);
    } finally {
      setLoading(false);
    }
  }, [filters?.date, filters?.workerId, filters?.teamId]);

  const fetchUnscheduledTasks = useCallback(async () => {
    try {
      const result = await enhancedApiClient.get<{ success: boolean; data?: UnscheduledTask[]; error?: string }>(
        '/farm-task-schedules/unscheduled'
      );

      if (result.success) {
        setUnscheduledTasks(result.data || []);
      }
    } catch (err) {
      console.error('获取待排班任务失败:', err);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchUnscheduledTasks();
  }, [fetchSchedules, fetchUnscheduledTasks]);

  const createSchedule = useCallback(async (input: Partial<FarmTaskSchedule>): Promise<FarmTaskSchedule> => {
    // enhancedApiClient.post 直接返回解析后的数据，检查 response 状态需用 rawResponse
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

    fetchSchedules();
    fetchUnscheduledTasks();
    return result.data!;
  }, [fetchSchedules, fetchUnscheduledTasks]);

  const updateSchedule = useCallback(async (id: string, updates: Partial<FarmTaskSchedule>) => {
    // enhancedApiClient.put 直接返回解析后的数据，检查 response 状态需用 rawPut
    const response = await enhancedApiClient.rawPut(`/farm-task-schedules/${id}`, {
      body: JSON.stringify(updates),
    });

    // 处理 409 冲突错误
    if (response.status === 409) {
      const result = await response.json();
      throw new Error(result.error || '该执行人在同日已有排班');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '更新排班失败');
    }

    fetchSchedules();
  }, [fetchSchedules]);

  const deleteSchedule = useCallback(async (id: string) => {
    const result = await enhancedApiClient.delete<{ success: boolean; error?: string }>(
      `/farm-task-schedules/${id}`
    );

    if (!result.success) {
      throw new Error(result.error || '删除排班失败');
    }

    fetchSchedules();
    fetchUnscheduledTasks();
  }, [fetchSchedules, fetchUnscheduledTasks]);

  return {
    schedules,
    unscheduledTasks,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    refresh: () => {
      fetchSchedules();
      fetchUnscheduledTasks();
    },
  };
}

export default useFarmTaskSchedule;
