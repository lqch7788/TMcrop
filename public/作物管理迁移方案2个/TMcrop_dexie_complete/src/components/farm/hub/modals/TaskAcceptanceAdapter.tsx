/**
 * 任务验收弹窗适配器
 * 将 FarmTaskHub 的调用方式适配到 TaskAcceptanceModal
 */

import React, { useState, useEffect } from 'react';
import { TaskAcceptanceModal } from './TaskAcceptanceModal';
import { Task, TaskRecord } from '../../../../types/task';
import { useTasks } from '../../../../hooks/useTasks';
import { STORAGE_KEYS } from '../../../../hooks/useLocalStorage';

interface TaskAcceptanceAdapterProps {
  taskId: string | null;
  onClose: () => void;
  onVerified: () => void;
}

export function TaskAcceptanceAdapter({
  taskId,
  onClose,
  onVerified,
}: TaskAcceptanceAdapterProps) {
  const tasksHook = useTasks();
  const [task, setTask] = useState<Task | null>(null);
  const [records, setRecords] = useState<TaskRecord[]>([]);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setRecords([]);
      return;
    }

    // 查找任务
    const foundTask = tasksHook.tasks.find(t => t.id === taskId);
    if (foundTask) {
      setTask(foundTask);
    }

    // 获取任务记录
    const storedRecords = localStorage.getItem(`${STORAGE_KEYS.TASKS}_records`);
    if (storedRecords) {
      try {
        const parsed = JSON.parse(storedRecords);
        const allRecords: TaskRecord[] = Array.isArray(parsed) ? parsed : (parsed.data || []);
        const taskRecords = allRecords.filter((r: TaskRecord) => r.taskId === taskId);
        setRecords(taskRecords);
      } catch (error) {
        console.error('[TaskAcceptanceAdapter] 加载记录失败:', error);
        setRecords([]);
      }
    }
  }, [taskId, tasksHook.tasks]);

  const handleAccept = (comments?: string) => {
    if (!task) return;
    console.log('[TaskAcceptanceAdapter] 验收通过:', { taskId: task.id, comments });
    // 调用 useTasks 的验收通过功能
    tasksHook.acceptCompletion(task.id, comments);
    onVerified();
  };

  const handleReject = (reason: string) => {
    if (!task) return;
    console.log('[TaskAcceptanceAdapter] 验收驳回:', { taskId: task.id, reason });
    // 调用 useTasks 的验收驳回功能
    tasksHook.rejectForRework(task.id, reason);
    onVerified();
  };

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
