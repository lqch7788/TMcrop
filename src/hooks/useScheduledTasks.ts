/**
 * 定时任务管理 Hook
 * 实现智能派工系统定时任务功能
 * 提供定时任务的注册、启动、停止和执行功能
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { ScheduledTaskConfig, ScheduledTaskType } from '../types/planning';

// ============================================
// 定时任务配置
// ============================================

/** 默认定时任务配置 */
const DEFAULT_SCHEDULED_TASKS: ScheduledTaskConfig[] = [
  {
    id: 'daily_planning',
    name: '每日任务规划',
    cronExpression: '0 6 * * *', // 每天早上6点
    enabled: true,
    description: '每天早上6点自动生成当日派工计划',
    runCount: 0,
    successCount: 0,
    failureCount: 0,
  },
  {
    id: 'daily_report',
    name: '每日工单汇总',
    cronExpression: '0 7 * * *', // 每天早上7点
    enabled: true,
    description: '每天早上7点自动生成前日工单汇总报告',
    runCount: 0,
    successCount: 0,
    failureCount: 0,
  },
  {
    id: 'weather_sync',
    name: '天气数据同步',
    cronExpression: '0 */4 * * *', // 每4小时
    enabled: true,
    description: '每4小时同步一次天气数据',
    runCount: 0,
    successCount: 0,
    failureCount: 0,
  },
  {
    id: 'iot_data_sync',
    name: 'IoT数据同步',
    cronExpression: '0 */1 * * *', // 每小时
    enabled: false,
    description: '每1小时同步一次IoT传感器数据',
    runCount: 0,
    successCount: 0,
    failureCount: 0,
  },
  {
    id: 'task_prediction',
    name: '任务预测更新',
    cronExpression: '0 5 * * *', // 每天早上5点
    enabled: true,
    description: '每天早上5点更新任务预测数据',
    runCount: 0,
    successCount: 0,
    failureCount: 0,
  },
  {
    id: 'notification_send',
    name: '通知发送',
    cronExpression: '0 8 * * *', // 每天早上8点
    enabled: false,
    description: '每天早上8点发送待办通知',
    runCount: 0,
    successCount: 0,
    failureCount: 0,
  },
];

// ============================================
// Cron 表达式解析（简化版）
// ============================================

/**
 * 解析 cron 表达式，计算下次执行时间
 * 支持格式: 分 时 日 月 周
 * 例如: "0 6 * * *" = 每天早上6点
 */
function parseCronExpression(cronExpr: string): { nextRun: Date | null; intervalMs: number } {
  const parts = cronExpr.split(' ');
  if (parts.length !== 5) {
    return { nextRun: null, intervalMs: 60000 }; // 默认1分钟
  }

  const [minute, hour, day, month, week] = parts;

  const now = new Date();
  const next = new Date(now);

  // 设置小时
  if (hour !== '*') {
    const targetHour = parseInt(hour, 10);
    next.setHours(targetHour, 0, 0, 0);

    // 如果已过时间，设置到明天
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  } else {
    next.setHours(next.getHours() + 1, 0, 0, 0);
  }

  // 设置分钟
  if (minute !== '*') {
    const targetMinute = parseInt(minute, 10);
    next.setMinutes(targetMinute, 0, 0);
  }

  // 计算间隔（毫秒）
  const intervalMs = Math.max(60000, next.getTime() - now.getTime());

  return { nextRun: next, intervalMs };
}

/**
 * 检查 cron 表达式是否在当前时刻匹配
 */
function isCronMatch(cronExpr: string, checkTime: Date): boolean {
  const parts = cronExpr.split(' ');
  if (parts.length !== 5) return false;

  const [minute, hour, day, month, week] = parts;
  const now = checkTime;

  const nowMinute = now.getMinutes().toString();
  const nowHour = now.getHours().toString();
  const nowDay = now.getDate().toString();
  const nowMonth = (now.getMonth() + 1).toString();
  const nowWeek = now.getDay().toString();

  const matchMinute = minute === '*' || minute === nowMinute;
  const matchHour = hour === '*' || hour === nowHour;
  const matchDay = day === '*' || day === nowDay;
  const matchMonth = month === '*' || month === nowMonth;
  const matchWeek = week === '*' || week === nowWeek;

  return matchMinute && matchHour && matchDay && matchMonth && matchWeek;
}

// ============================================
// Hook 返回类型
// ============================================

export interface UseScheduledTasksReturn {
  // 任务配置列表
  tasks: ScheduledTaskConfig[];

  // 启动任务
  startTask: (taskId: string) => void;

  // 停止任务
  stopTask: (taskId: string) => void;

  // 手动触发任务
  triggerTask: (taskId: string) => Promise<boolean>;

  // 更新任务配置
  updateTaskConfig: (taskId: string, config: Partial<ScheduledTaskConfig>) => void;

  // 获取下次执行时间
  getNextRunTime: (taskId: string) => Date | null;

  // 检查任务是否运行中
  isTaskRunning: (taskId: string) => boolean;

  // 运行时控制
  isRunning: boolean;
  startAll: () => void;
  stopAll: () => void;
}

// ============================================
// useScheduledTasks Hook
// ============================================

export function useScheduledTasks(
  taskHandlers?: Partial<Record<ScheduledTaskType, () => Promise<void>>>
): UseScheduledTasksReturn {
  // 存储任务配置
  const [taskConfigs, setTaskConfigs] = useLocalStorage<ScheduledTaskConfig[]>(
    'yuanxingtu_scheduled_tasks',
    DEFAULT_SCHEDULED_TASKS
  );

  // 存储运行时状态
  const [isRunning, setIsRunning] = useState(false);
  const [runningTasks, setRunningTasks] = useState<Set<string>>(new Set());

  // 定时器引用
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // 执行任务
  // ============================================
  const executeTask = useCallback(async (taskId: string) => {
    const task = taskConfigs.find(t => t.id === taskId);
    if (!task || !task.enabled) return;

    setRunningTasks(prev => new Set(prev).add(taskId));

    try {
      // 根据任务类型执行对应处理函数
      const handler = taskHandlers?.[taskId as ScheduledTaskType];
      if (handler) {
        await handler();
      }

      // 更新成功计数
      setTaskConfigs(prev =>
        prev.map(t =>
          t.id === taskId
            ? {
                ...t,
                lastRunAt: new Date().toISOString(),
                runCount: t.runCount + 1,
                successCount: t.successCount + 1,
              }
            : t
        )
      );
    } catch (error) {
      // 定时任务执行失败

      // 更新失败计数
      setTaskConfigs(prev =>
        prev.map(t =>
          t.id === taskId
            ? {
                ...t,
                lastRunAt: new Date().toISOString(),
                runCount: t.runCount + 1,
                failureCount: t.failureCount + 1,
              }
            : t
        )
      );
    } finally {
      setRunningTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }, [taskConfigs, taskHandlers, setTaskConfigs]);

  // ============================================
  // 检查并执行到期的任务
  // ============================================
  const checkAndExecuteTasks = useCallback(() => {
    const now = new Date();

    for (const task of taskConfigs) {
      if (!task.enabled || runningTasks.has(task.id)) continue;

      // 检查是否匹配 cron 表达式
      if (isCronMatch(task.cronExpression, now)) {
        // 检查是否刚执行过（避免重复执行）
        if (task.lastRunAt) {
          const lastRun = new Date(task.lastRunAt);
          const diffMs = now.getTime() - lastRun.getTime();
          if (diffMs < 60000) continue; // 1分钟内不重复执行
        }

        executeTask(task.id);
      }
    }
  }, [taskConfigs, runningTasks, executeTask]);

  // ============================================
  // 启动定时器
  // ============================================
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // 每分钟检查一次
    timerRef.current = setInterval(checkAndExecuteTasks, 60000);
    setIsRunning(true);

    // 立即执行一次检查
    checkAndExecuteTasks();
  }, [checkAndExecuteTasks]);

  // ============================================
  // 停止定时器
  // ============================================
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  // ============================================
  // 生命周期管理
  // ============================================
  useEffect(() => {
    startTimer();

    return () => {
      stopTimer();
    };
  }, [startTimer, stopTimer]);

  // ============================================
  // 启动指定任务
  // ============================================
  const startTask = useCallback((taskId: string) => {
    setTaskConfigs(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, enabled: true } : t
      )
    );
  }, [setTaskConfigs]);

  // ============================================
  // 停止指定任务
  // ============================================
  const stopTask = useCallback((taskId: string) => {
    setTaskConfigs(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, enabled: false } : t
      )
    );
  }, [setTaskConfigs]);

  // ============================================
  // 手动触发任务
  // ============================================
  const triggerTask = useCallback(async (taskId: string): Promise<boolean> => {
    const task = taskConfigs.find(t => t.id === taskId);
    if (!task) return false;

    try {
      await executeTask(taskId);
      return true;
    } catch (error) {
      // 手动触发任务失败
      return false;
    }
  }, [taskConfigs, executeTask]);

  // ============================================
  // 更新任务配置
  // ============================================
  const updateTaskConfig = useCallback((
    taskId: string,
    config: Partial<ScheduledTaskConfig>
  ) => {
    setTaskConfigs(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, ...config } : t
      )
    );
  }, [setTaskConfigs]);

  // ============================================
  // 获取下次执行时间
  // ============================================
  const getNextRunTime = useCallback((taskId: string): Date | null => {
    const task = taskConfigs.find(t => t.id === taskId);
    if (!task) return null;

    const { nextRun } = parseCronExpression(task.cronExpression);
    return nextRun;
  }, [taskConfigs]);

  // ============================================
  // 检查任务是否运行中
  // ============================================
  const isTaskRunning = useCallback((taskId: string): boolean => {
    return runningTasks.has(taskId);
  }, [runningTasks]);

  // ============================================
  // 启动所有任务
  // ============================================
  const startAll = useCallback(() => {
    setTaskConfigs(prev =>
      prev.map(t => ({ ...t, enabled: true }))
    );
    startTimer();
  }, [setTaskConfigs, startTimer]);

  // ============================================
  // 停止所有任务
  // ============================================
  const stopAll = useCallback(() => {
    setTaskConfigs(prev =>
      prev.map(t => ({ ...t, enabled: false }))
    );
    stopTimer();
  }, [setTaskConfigs, stopTimer]);

  return {
    tasks: taskConfigs,
    startTask,
    stopTask,
    triggerTask,
    updateTaskConfig,
    getNextRunTime,
    isTaskRunning,
    isRunning,
    startAll,
    stopAll,
  };
}
