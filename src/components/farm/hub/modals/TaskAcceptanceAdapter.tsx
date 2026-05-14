/**
 * 任务验收弹窗适配器
 * 将 FarmTaskHub 的调用方式适配到 TaskAcceptanceModal
 */

import React, { useState, useEffect } from 'react';
import { TaskAcceptanceModal } from './TaskAcceptanceModal';
import { Task, TaskRecord } from '../../../../types/task';
import { useTasks } from '../../../../hooks/useTasks';
import { STORAGE_KEYS } from '../../../../hooks/useLocalStorage';
import { useFarmTaskStore } from '@/stores';

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
  const { tasks: storeTasks } = useFarmTaskStore();
  const [task, setTask] = useState<Task | null>(null);
  const [records, setRecords] = useState<TaskRecord[]>([]);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setRecords([]);
      return;
    }

    // 查找任务 (来自 FarmTaskStore)
    const foundTask = storeTasks.find((t: any) => t.id === taskId);
    if (foundTask) {
      setTask(foundTask as Task);
    }

    // 获取任务记录
    const storedRecords = localStorage.getItem(`${STORAGE_KEYS.TASKS}_records`);
    if (storedRecords) {
      try {
        const parsed = JSON.parse(storedRecords);
        const allRecords: TaskRecord[] = Array.isArray(parsed) ? parsed : (parsed.data || []);
        const taskRecords = allRecords.filter((r: TaskRecord) => r.taskId === taskId);
        setRecords(taskRecords);
      } catch {
        setRecords([]);
      }
    }
  }, [taskId, storeTasks]);

  const handleAccept = (comments?: string) => {
    if (!task) return;
    tasksHook.acceptCompletion(task.id, comments);
    onVerified();
  };

  const handleReject = (reason: string) => {
    if (!task) return;
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
