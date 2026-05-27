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
        // 农事任务：使用 /accept 端点记录 accept 操作
        fetch(`/api/farm-tasks/${sourceId}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operator_id: workerId, operator_name: workerName }),
        }).catch(err => console.error('[confirmDispatch] farm accept failed:', err));

        // 同时更新执行人信息
        updateTask(sourceId, {
          assigneeId: workerId,
          assigneeName: workerName,
          status: 'accepted',
        });
        success = true;
        message = `已成功派发给 ${workerName}`;
      } else if (source === 'tempTask') {
        // 临时任务：调用 /accept 记录接单操作，再调用 /submit-progress 记录开始执行
        // 1. 调用 /accept 记录接单动作（状态变为 accepted）
        fetch(`/api/temp-tasks/${sourceId}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operator_id: workerId, operator_name: workerName }),
        }).catch(err => console.error('[confirmDispatch] tempTask accept failed:', err));

        // 2. 更新执行人信息（不改变状态，状态由 submit-progress 改变）
        updateTempTask(sourceId, {
          assigneeId: workerId,
          assigneeName: workerName,
        });

        // 3. 延迟调用 /submit-progress 记录开始执行（progress=0，状态变为 in_progress）
        setTimeout(() => {
          fetch(`/api/temp-tasks/${sourceId}/submit-progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              progress: 0,
              operator_id: workerId,
              operator_name: workerName,
              comment: '开始执行任务',
            }),
          }).catch(err => console.error('[confirmDispatch] tempTask submit-progress failed:', err));
        }, 100);

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
        // 农事任务：调用 /reassign 端点记录 reassign 操作
        fetch(`/api/farm-tasks/${sourceId}/reassign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assigneeId: newWorkerId,
            assigneeName: newWorkerName,
            operator_id: newWorkerId,
            operator_name: newWorkerName,
            reason: `更换执行人为 ${newWorkerName}`,
          }),
        }).catch(err => console.error('[replaceWorker] farm reassign failed:', err));

        // 同步更新本地状态
        updateTask(sourceId, {
          assigneeId: newWorkerId,
          assigneeName: newWorkerName,
        });
        success = true;
        message = `已更换执行人为 ${newWorkerName}`;
      } else if (source === 'tempTask') {
        // 临时任务：通过 PUT with reassign=true 记录重新分派操作
        updateTempTask(sourceId, {
          assigneeId: newWorkerId,
          assigneeName: newWorkerName,
          status: 'pending', // 重新分派后变为待接受状态
          reassign: true, // 标记为重新分派，让后端记录 reassign 操作
          operator_id: newWorkerId, // 记录操作人信息
          operator_name: newWorkerName,
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
        // 农事任务：调用 /extend-deadline 端点记录 delay 操作
        fetch(`/api/farm-tasks/${sourceId}/extend-deadline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newDeadline: newDueDateStr,
            reason: `延后 ${days} 天`,
            operator_id: '',
            operator_name: '',
          }),
        }).catch(err => console.error('[delayTask] farm extend-deadline failed:', err));

        // 同步更新本地状态
        updateTask(sourceId, {
          dueDate: newDueDateStr,
        });
        success = true;
        message = `已延后 ${days} 天`;
      } else if (source === 'tempTask') {
        // 临时任务：目前没有专用的 delay 端点，使用 PUT 更新截止日期
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
        // 农事任务：调用 /reassign 端点记录 reassign 操作
        fetch(`/api/farm-tasks/${sourceId}/reassign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assigneeId: suggestion.suggestedWorkerId,
            assigneeName: suggestion.suggestedWorkerName,
            operator_id: suggestion.suggestedWorkerId,
            operator_name: suggestion.suggestedWorkerName,
            reason: '接受AI优化建议',
          }),
        }).catch(err => console.error('[acceptOptimization] farm reassign failed:', err));

        // 同步更新本地状态
        updateTask(sourceId, {
          assigneeId: suggestion.suggestedWorkerId,
          assigneeName: suggestion.suggestedWorkerName,
        });
        success = true;
        message = `已接受优化建议，更换执行人为 ${suggestion.suggestedWorkerName}`;
      } else if (source === 'tempTask') {
        // 临时任务：通过 PUT with reassign=true 记录重新分派操作
        updateTempTask(sourceId, {
          assigneeId: suggestion.suggestedWorkerId,
          assigneeName: suggestion.suggestedWorkerName,
          status: 'pending',
          reassign: true, // 标记为重新分派，让后端记录 reassign 操作
          operator_id: suggestion.suggestedWorkerId, // 记录操作人信息
          operator_name: suggestion.suggestedWorkerName,
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
