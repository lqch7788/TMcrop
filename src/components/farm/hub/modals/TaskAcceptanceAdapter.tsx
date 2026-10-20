/**
 * 任务验收弹窗适配器
 * 将 FarmTaskHub 的调用方式适配到 TaskAcceptanceModal
 *
 * 数据来源：全部通过 props 从父组件注入，不创建独立的 useTasks/useFarmTaskStore 实例
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TaskAcceptanceModal } from './TaskAcceptanceModal';
import { TaskInputUsageModal, type TaskInputUsageTarget } from './TaskInputUsageModal';
import { Task, TaskRecord } from '../../../../types/task';
import { getTaskRecords } from '../../../../services/apiFarmTaskService';

/** P0-3：施肥/用药类任务验收后提示补录实际用量 */
function isInputUsageTask(task: Task): boolean {
  const t = String((task as any).type || '');
  return /fert|施肥|pest|防治|植保/.test(t);
}

interface TaskAcceptanceAdapterProps {
  taskId: string | null;
  onClose: () => void;
  onVerified: () => void;
  /** 从父组件传入的完整任务列表（复用 useTasks 实例的数据） */
  tasks: Task[];
  /** 从父组件传入的任务记录获取函数 */
  getTaskRecordsByTaskId: (taskId: string) => TaskRecord[];
  /** 验收通过 */
  onAcceptCompletion: (taskId: string, comments?: string, actualArea?: number) => void;
  /** 驳回返工 */
  onRejectForRework: (taskId: string, reason: string) => void;
}

export function TaskAcceptanceAdapter({
  taskId,
  onClose,
  onVerified,
  tasks,
  getTaskRecordsByTaskId,
  onAcceptCompletion,
  onRejectForRework,
}: TaskAcceptanceAdapterProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [records, setRecords] = useState<TaskRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  // P0-3：验收通过后待补录投入品的任务
  const [usageTask, setUsageTask] = useState<TaskInputUsageTarget | null>(null);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setRecords([]);
      return;
    }

    // 从父组件传入的 tasks 中查找
    const foundTask = tasks.find((t) => t.id === taskId);
    if (foundTask) {
      setTask(foundTask);
    }

    // 从后端 API 加载任务记录（优先），同时合并本地记录
    setIsLoadingRecords(true);
    getTaskRecords(taskId)
      .then((apiRecords) => {
        // 合并后端记录和本地记录，去重
        const localRecords = getTaskRecordsByTaskId(taskId);
        const mergedRecords = mergeRecords(localRecords, apiRecords || []);
        setRecords(mergedRecords);
      })
      .catch((err) => {
        // logger.error('[TaskAcceptanceAdapter] 加载任务记录失败:', err);
        // 降级到本地记录
        setRecords(getTaskRecordsByTaskId(taskId));
      })
      .finally(() => {
        setIsLoadingRecords(false);
      });
  }, [taskId, tasks, getTaskRecordsByTaskId]);

  // 合并本地记录和后端记录，按时间倒序
  const mergeRecords = (local: TaskRecord[], api: any[]): TaskRecord[] => {
    const allRecords = [...local];
    for (const apiRecord of api) {
      // 将后端记录转换为 TaskRecord 格式
      // API 返回的是 camelCase 格式: actionTime, createTime 等
      const actionTime = apiRecord.actionTime || apiRecord.action_time || new Date().toISOString();
      const createdAt = apiRecord.createTime || apiRecord.create_time || actionTime;
      // 解析 feedback 字段（可能是字符串或对象）
      let feedback: TaskRecord['feedback'] = undefined;
      if (apiRecord.feedback) {
        if (typeof apiRecord.feedback === 'string') {
          try {
            feedback = JSON.parse(apiRecord.feedback);
          } catch {
            feedback = undefined;
          }
        } else if (typeof apiRecord.feedback === 'object') {
          feedback = apiRecord.feedback;
        }
      }
      const converted: TaskRecord = {
        id: apiRecord.id,
        taskId: apiRecord.taskId || apiRecord.task_id,
        // 2026-10-11：TaskRecord 必填字段，后端流转记录同样返回（TaskDetailModal 亦按此读取）
        taskCode: apiRecord.taskCode || apiRecord.task_code || '',
        taskTitle: apiRecord.taskTitle || apiRecord.task_title || '',
        operatorId: apiRecord.operatorId || apiRecord.operator_id,
        operatorName: apiRecord.operatorName || apiRecord.operator_name,
        action: apiRecord.action,
        actionName: apiRecord.actionName || apiRecord.action_name,
        fromStatus: apiRecord.fromStatus || apiRecord.from_status,
        toStatus: apiRecord.toStatus || apiRecord.to_status,
        progress: apiRecord.progress,
        progressIncrement: apiRecord.progressIncrement,
        comment: apiRecord.comment,
        reason: apiRecord.reason,
        feedback,
        actionTime,
        createdAt,
      };
      // 检查是否已存在（避免重复）
      if (!allRecords.some((r) => r.id === converted.id)) {
        allRecords.push(converted);
      }
    }
    // 按时间倒序
    return allRecords.sort(
      (a, b) => new Date(b.actionTime).getTime() - new Date(a.actionTime).getTime()
    );
  };

  const handleAccept = useCallback((comments?: string, actualArea?: number) => {
    if (!task) return;
    onAcceptCompletion(task.id, comments, actualArea);
    // P0-3：施肥/用药任务先补录用量，关闭后再通知父组件验收完成
    if (isInputUsageTask(task)) {
      setUsageTask({
        id: task.id,
        taskCode: (task as any).taskCode,
        type: (task as any).type,
        typeName: (task as any).typeName,
        greenhouseName: (task as any).greenhouseName,
        crop: (task as any).crop || (task as any).cropName,
      });
      return;
    }
    onVerified();
  }, [task, onAcceptCompletion, onVerified]);

  const closeUsage = useCallback(() => {
    setUsageTask(null);
    onVerified();
  }, [onVerified]);

  const handleReject = useCallback((reason: string) => {
    if (!task) return;
    onRejectForRework(task.id, reason);
    onVerified();
  }, [task, onRejectForRework, onVerified]);

  if (!taskId || !task) {
    return null;
  }

  // P0-3：补录弹窗独占显示，关闭后才结束验收流程
  if (usageTask) {
    return (
      <TaskInputUsageModal
        isOpen
        task={usageTask}
        onClose={closeUsage}
        onSaved={() => {}}
      />
    );
  }

  return (
    <TaskAcceptanceModal
      isOpen={true}
      task={task}
      taskRecords={records}
      isLoadingRecords={isLoadingRecords}
      onAccept={handleAccept}
      onReject={handleReject}
      onClose={onClose}
    />
  );
}
