/**
 * 任务验收弹窗适配器
 * 将 FarmTaskHub 的调用方式适配到 TaskAcceptanceModal
 *
 * 数据来源：全部通过 props 从父组件注入，不创建独立的 useTasks/useFarmTaskStore 实例
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TaskAcceptanceModal } from './TaskAcceptanceModal';
import { Task, TaskRecord } from '../../../../types/task';
import { getTaskRecords } from '../../../../services/apiFarmTaskService';

interface TaskAcceptanceAdapterProps {
  taskId: string | null;
  onClose: () => void;
  onVerified: () => void;
  /** 从父组件传入的完整任务列表（复用 useTasks 实例的数据） */
  tasks: Task[];
  /** 从父组件传入的任务记录获取函数 */
  getTaskRecordsByTaskId: (taskId: string) => TaskRecord[];
  /** 验收通过 */
  onAcceptCompletion: (taskId: string, comments?: string) => void;
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
        console.error('[TaskAcceptanceAdapter] 加载任务记录失败:', err);
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
      const actionTime = apiRecord.action_time || new Date().toISOString();
      const createdAt = apiRecord.create_time || actionTime;
      const converted: TaskRecord = {
        id: apiRecord.id,
        taskId: apiRecord.task_id,
        operatorId: apiRecord.operator_id,
        operatorName: apiRecord.operator_name,
        action: apiRecord.action,
        actionName: apiRecord.action_name,
        fromStatus: apiRecord.from_status,
        toStatus: apiRecord.to_status,
        progress: apiRecord.progress,
        comment: apiRecord.comment,
        reason: apiRecord.reason,
        feedback: apiRecord.feedback ? (typeof apiRecord.feedback === 'string' ? JSON.parse(apiRecord.feedback) : apiRecord.feedback) : null,
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

  const handleAccept = useCallback((comments?: string) => {
    if (!task) return;
    onAcceptCompletion(task.id, comments);
    onVerified();
  }, [task, onAcceptCompletion, onVerified]);

  const handleReject = useCallback((reason: string) => {
    if (!task) return;
    onRejectForRework(task.id, reason);
    onVerified();
  }, [task, onRejectForRework, onVerified]);

  if (!taskId || !task) {
    return null;
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
