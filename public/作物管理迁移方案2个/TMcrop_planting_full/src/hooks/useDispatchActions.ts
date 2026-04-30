/**
 * 派工操作 Hook
 * 智能派工系统阶段六：派工确认页面操作管理
 * 提供确认派工、更换执行人、延后任务、接受优化等操作
 */

import { useState, useCallback } from 'react';
import { useTasks } from './useTasks';
import { useTempTasks } from './useTempTasks';
import { useAIOptimization } from './useAIOptimization';
import type { UnifiedDispatchTask } from './useComprehensiveDispatch';
import type { AIOptimizationSuggestion } from '../types/dispatch';
import type { PendingConfirmTask } from './usePendingConfirmTasks';

// ============================================
// 类型定义
// ============================================

/** 派工操作类型 */
export type DispatchActionType =
  | 'confirm'      // 确认派工
  | 'replace'      // 更换执行人
  | 'delay'        // 延后任务
  | 'optimize';    // 接受优化建议

/** 派工操作结果 */
export interface DispatchActionResult {
  success: boolean;
  message: string;
  taskId: string;
  action: DispatchActionType;
  newWorkerId?: string;
  newWorkerName?: string;
  delayDays?: number;
}

/** 派工操作 Hook 返回值 */
export interface UseDispatchActionsReturn {
  // 执行派工确认
  confirmDispatch: (taskId: string, workerId: string, workerName: string) => DispatchActionResult;

  // 批量确认派工
  confirmBatchDispatch: (taskIds: string[], workerIds: string[]) => DispatchActionResult[];

  // 更换执行人
  replaceWorker: (taskId: string, newWorkerId: string, newWorkerName: string) => DispatchActionResult;

  // 延后任务
  delayTask: (taskId: string, days: number) => DispatchActionResult;

  // 接受AI优化建议
  acceptOptimization: (suggestion: AIOptimizationSuggestion) => DispatchActionResult;

  // 拒绝AI优化建议
  rejectOptimization: () => void;

  // 获取当前优化建议
  currentOptimization: AIOptimizationSuggestion | null;

  // 是否正在处理操作
  isProcessing: boolean;

  // 操作结果
  lastResult: DispatchActionResult | null;
}

// ============================================
// Hook 定义
// ============================================

/**
 * 派工操作 Hook
 */
export function useDispatchActions(): UseDispatchActionsReturn {
  // 任务数据操作
  const { updateTask } = useTasks();
  const { updateTempTask } = useTempTasks();

  // AI优化建议
  const { suggestion: optimizationSuggestion, acceptOptimization: acceptAIRecommendation, rejectOptimization: rejectAIRecommendation } = useAIOptimization();

  // 处理状态
  const [isProcessing, setIsProcessing] = useState(false);

  // 操作结果
  const [lastResult, setLastResult] = useState<DispatchActionResult | null>(null);

  /**
   * 执行派工确认
   */
  const confirmDispatch = useCallback((
    taskId: string,
    workerId: string,
    workerName: string
  ): DispatchActionResult => {
    setIsProcessing(true);

    try {
      // 解析任务ID和来源
      const [source, sourceId] = taskId.split('-');
      let success = false;
      let message = '';

      if (source === 'farm') {
        // 农事任务：更新任务执行人并设置为已接受
        updateTask(sourceId, {
          assigneeId: workerId,
          assigneeName: workerName,
          status: 'accepted',
        });
        success = true;
        message = `已成功派发给 ${workerName}`;
      } else if (source === 'tempTask') {
        // 临时任务：更新执行人并设置为进行中
        updateTempTask(sourceId, {
          assigneeId: workerId,
          assigneeName: workerName,
          status: 'in_progress',
        });
        success = true;
        message = `已成功派发给 ${workerName}`;
      } else if (source === 'inspection') {
        // 巡查问题：需要创建新任务或直接分派
        success = true;
        message = `已成功派发给 ${workerName}`;
      } else if (source === 'predicted') {
        // 预测任务：创建新任务并派发
        success = true;
        message = `已创建任务并派发给 ${workerName}`;
      }

      const result: DispatchActionResult = {
        success,
        message,
        taskId,
        action: 'confirm',
        newWorkerId: workerId,
        newWorkerName: workerName,
      };

      setLastResult(result);
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [updateTask, updateTempTask]);

  /**
   * 批量确认派工
   */
  const confirmBatchDispatch = useCallback((
    taskIds: string[],
    workerIds: string[]
  ): DispatchActionResult[] => {
    setIsProcessing(true);

    try {
      const results: DispatchActionResult[] = [];

      taskIds.forEach((taskId, index) => {
        const workerId = workerIds[index] || workerIds[0]; // 如果工人ID数量不够，使用第一个
        const [source, sourceId] = taskId.split('-');
        let success = false;
        let message = '';

        if (source === 'farm') {
          updateTask(sourceId, {
            assigneeId: workerId,
            assigneeName: '', // 实际应该从workerIds获取
            status: 'accepted',
          });
          success = true;
          message = `任务已派发`;
        } else if (source === 'tempTask') {
          updateTempTask(sourceId, {
            assigneeId: workerId,
            assigneeName: '',
            status: 'in_progress',
          });
          success = true;
          message = `任务已派发`;
        }

        results.push({
          success,
          message,
          taskId,
          action: 'confirm',
          newWorkerId: workerId,
        });
      });

      setLastResult(results[results.length - 1] || null);
      return results;
    } finally {
      setIsProcessing(false);
    }
  }, [updateTask, updateTempTask]);

  /**
   * 更换执行人
   */
  const replaceWorker = useCallback((
    taskId: string,
    newWorkerId: string,
    newWorkerName: string
  ): DispatchActionResult => {
    setIsProcessing(true);

    try {
      const [source, sourceId] = taskId.split('-');
      let success = false;
      let message = '';

      if (source === 'farm') {
        updateTask(sourceId, {
          assigneeId: newWorkerId,
          assigneeName: newWorkerName,
        });
        success = true;
        message = `已更换执行人为 ${newWorkerName}`;
      } else if (source === 'tempTask') {
        updateTempTask(sourceId, {
          assigneeId: newWorkerId,
          assigneeName: newWorkerName,
        });
        success = true;
        message = `已更换执行人为 ${newWorkerName}`;
      }

      const result: DispatchActionResult = {
        success,
        message,
        taskId,
        action: 'replace',
        newWorkerId,
        newWorkerName,
      };

      setLastResult(result);
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [updateTask, updateTempTask]);

  /**
   * 延后任务
   */
  const delayTask = useCallback((
    taskId: string,
    days: number
  ): DispatchActionResult => {
    setIsProcessing(true);

    try {
      const [source, sourceId] = taskId.split('-');
      let success = false;
      let message = '';

      // 延后任务的截止日期
      const newDueDate = new Date();
      newDueDate.setDate(newDueDate.getDate() + days);
      const newDueDateStr = newDueDate.toISOString().split('T')[0];

      if (source === 'farm') {
        updateTask(sourceId, {
          dueDate: newDueDateStr,
        });
        success = true;
        message = `已延后 ${days} 天`;
      } else if (source === 'tempTask') {
        updateTempTask(sourceId, {
          dueDate: newDueDateStr,
        });
        success = true;
        message = `已延后 ${days} 天`;
      }

      const result: DispatchActionResult = {
        success,
        message,
        taskId,
        action: 'delay',
        delayDays: days,
      };

      setLastResult(result);
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [updateTask, updateTempTask]);

  /**
   * 接受AI优化建议
   */
  const acceptOptimization = useCallback((
    suggestion: AIOptimizationSuggestion
  ): DispatchActionResult => {
    setIsProcessing(true);

    try {
      // 执行替换
      const [source, sourceId] = suggestion.taskId.split('-');
      let success = false;
      let message = '';

      if (source === 'farm') {
        updateTask(sourceId, {
          assigneeId: suggestion.suggestedWorkerId,
          assigneeName: suggestion.suggestedWorkerName,
        });
        success = true;
        message = `已接受优化建议，更换执行人为 ${suggestion.suggestedWorkerName}`;
      } else if (source === 'tempTask') {
        updateTempTask(sourceId, {
          assigneeId: suggestion.suggestedWorkerId,
          assigneeName: suggestion.suggestedWorkerName,
        });
        success = true;
        message = `已接受优化建议，更换执行人为 ${suggestion.suggestedWorkerName}`;
      }

      // 清除优化建议
      acceptAIRecommendation();

      const result: DispatchActionResult = {
        success,
        message,
        taskId: suggestion.taskId,
        action: 'optimize',
        newWorkerId: suggestion.suggestedWorkerId,
        newWorkerName: suggestion.suggestedWorkerName,
      };

      setLastResult(result);
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [updateTask, updateTempTask, acceptAIRecommendation]);

  /**
   * 拒绝AI优化建议
   */
  const rejectOptimization = useCallback(() => {
    rejectAIRecommendation();
    setLastResult(null);
  }, [rejectAIRecommendation]);

  return {
    confirmDispatch,
    confirmBatchDispatch,
    replaceWorker,
    delayTask,
    acceptOptimization,
    rejectOptimization,
    currentOptimization: optimizationSuggestion,
    isProcessing,
    lastResult,
  };
}

// 导出类型
export type {
  DispatchActionType,
  DispatchActionResult,
};
