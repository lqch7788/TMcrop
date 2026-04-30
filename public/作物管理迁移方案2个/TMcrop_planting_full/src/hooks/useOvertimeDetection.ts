/**
 * 超时检测 Hook
 * 功能：检测任务超时状态，触发 UI 警示
 */

import { useEffect, useCallback, useState } from 'react';
import { Task, TaskTimeout } from '../types/task';
import { OVERTIME_CONFIG } from '../config/taskConfig';

interface UseOvertimeDetectionReturn {
  // 任务超时状态映射
  overtimeMap: Map<string, TaskTimeout>;
  // 手动检测超时
  detectOvertime: (task: Task) => TaskTimeout | undefined;
  // 获取超时的任务列表
  getOvertimeTasks: (tasks: Task[]) => Task[];
  // 获取预警任务（warning 级别）
  getWarningTasks: (tasks: Task[]) => Task[];
  // 获取危急任务（critical 级别）
  getCriticalTasks: (tasks: Task[]) => Task[];
}

/**
 * 超时检测逻辑
 */
function detectOvertime(task: Task): TaskTimeout | undefined {
  const now = new Date();

  // 1. 接受超时检测（pending状态）
  if (task.status === 'pending') {
    const publishedAt = new Date(task.createdAt);
    const hoursDiff = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);
    if (hoursDiff >= OVERTIME_CONFIG.acceptCriticalHours) {
      return { type: 'accept', severity: 'critical', startedAt: task.createdAt, deadline: '' };
    }
    if (hoursDiff >= OVERTIME_CONFIG.acceptWarningHours) {
      return { type: 'accept', severity: 'warning', startedAt: task.createdAt, deadline: '' };
    }
  }

  // 2. 执行超时检测（in_progress状态）
  if (task.status === 'in_progress' && task.acceptedAt) {
    const deadline = new Date(task.acceptedAt);
    const estimatedHours = (task.estimatedDays || 1) * 24;
    deadline.setHours(deadline.getHours() + estimatedHours);
    if (now > deadline) {
      return { type: 'execution', severity: 'critical', startedAt: task.updatedAt, deadline: deadline.toISOString() };
    }
    // 预警：超过预计时间的80%
    const warningThreshold = estimatedHours * 0.8;
    const elapsedHours = (now.getTime() - new Date(task.acceptedAt).getTime()) / (1000 * 60 * 60);
    if (elapsedHours >= warningThreshold) {
      return { type: 'execution', severity: 'warning', startedAt: task.updatedAt, deadline: deadline.toISOString() };
    }
  }

  // 3. 验收超时检测（waiting_acceptance状态）
  if (task.status === 'waiting_acceptance') {
    const submittedAt = new Date(task.updatedAt);
    const hoursDiff = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60);
    if (hoursDiff >= OVERTIME_CONFIG.acceptanceCriticalHours) {
      return { type: 'acceptance', severity: 'critical', startedAt: task.updatedAt, deadline: '' };
    }
    if (hoursDiff >= OVERTIME_CONFIG.acceptanceWarningHours) {
      return { type: 'acceptance', severity: 'warning', startedAt: task.updatedAt, deadline: '' };
    }
  }

  return undefined;
}

/**
 * 超时检测 Hook
 */
export function useOvertimeDetection(
  tasks: Task[],
  enableAutoCheck: boolean = true,
  checkIntervalMs: number = OVERTIME_CONFIG.checkIntervalMs
): UseOvertimeDetectionReturn {
  // 任务超时状态映射
  const [overtimeMap, setOvertimeMap] = useState<Map<string, TaskTimeout>>(new Map());

  // 手动检测单个任务
  const detectOvertimeFn = useCallback((task: Task) => {
    return detectOvertime(task);
  }, []);

  // 批量检测所有任务
  const detectAllOvertime = useCallback((taskList: Task[]) => {
    const newMap = new Map<string, TaskTimeout>();
    taskList.forEach(task => {
      const timeout = detectOvertime(task);
      if (timeout) {
        newMap.set(task.id, timeout);
      }
    });
    setOvertimeMap(newMap);
    return newMap;
  }, []);

  // 获取超时的任务列表
  const getOvertimeTasks = useCallback((taskList: Task[]) => {
    return taskList.filter(task => {
      const timeout = detectOvertime(task);
      return timeout !== undefined;
    });
  }, []);

  // 获取预警任务（warning 级别）
  const getWarningTasks = useCallback((taskList: Task[]) => {
    return taskList.filter(task => {
      const timeout = detectOvertime(task);
      return timeout?.severity === 'warning';
    });
  }, []);

  // 获取危急任务（critical 级别）
  const getCriticalTasks = useCallback((taskList: Task[]) => {
    return taskList.filter(task => {
      const timeout = detectOvertime(task);
      return timeout?.severity === 'critical';
    });
  }, []);

  // 初始检测 + 定时检测
  useEffect(() => {
    // 初始检测
    detectAllOvertime(tasks);

    // 如果启用自动检测
    if (enableAutoCheck) {
      const intervalId = setInterval(() => {
        detectAllOvertime(tasks);
      }, checkIntervalMs);

      return () => clearInterval(intervalId);
    }
  }, [tasks, enableAutoCheck, checkIntervalMs, detectAllOvertime]);

  return {
    overtimeMap,
    detectOvertime: detectOvertimeFn,
    getOvertimeTasks,
    getWarningTasks,
    getCriticalTasks,
  };
}
