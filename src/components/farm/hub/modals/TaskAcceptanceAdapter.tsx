/**
 * 任务验收弹窗适配器
 * 将 FarmTaskHub 的调用方式适配到 TaskAcceptanceModal
 *
 * 数据来源：全部通过 props 从父组件注入，不创建独立的 useTasks/useFarmTaskStore 实例
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TaskAcceptanceModal } from './TaskAcceptanceModal';
import { Task, TaskRecord } from '../../../../types/task';

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
    // 加载任务记录
    const taskRecords = getTaskRecordsByTaskId(taskId);
    setRecords(taskRecords);
  }, [taskId, tasks, getTaskRecordsByTaskId]);

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
      onAccept={handleAccept}
      onReject={handleReject}
      onClose={onClose}
    />
  );
}
