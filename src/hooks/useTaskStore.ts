// ============================================================
// 任务状态管理Store
// 文件路径：src/hooks/useTaskStore.ts
// 用于审批联动：审批通过后更新任务状态为待接受
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'task_status_updates';

export interface TaskStatusUpdate {
  taskId: string;
  status: 'draft' | 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  updatedAt: string;
  updatedBy?: string;
}

export interface Task {
  id: string;
  taskCode: string;
  taskType: string;
  title: string;
  description: string;
  assigneeId?: string;
  assigneeName?: string;
  plannedDate: string;
  location?: string;
  status: 'draft' | 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  remark?: string;
}

function getStatusUpdates(): Record<string, TaskStatusUpdate> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveStatusUpdate(update: TaskStatusUpdate): void {
  const updates = getStatusUpdates();
  updates[update.taskId] = update;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
}

export function updateTaskStatus(
  taskId: string,
  status: TaskStatusUpdate['status'],
  updatedBy?: string
): void {
  const update: TaskStatusUpdate = {
    taskId,
    status,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  saveStatusUpdate(update);
  window.dispatchEvent(new CustomEvent('taskStatusChanged', {
    detail: { taskId, status }
  }));
}

export function getTaskWithStatus(task: Task): Task {
  const updates = getStatusUpdates();
  const update = updates[task.id];
  if (update) {
    return { ...task, status: update.status };
  }
  return task;
}

export function useTaskStore() {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    const handleChange = () => refresh();
    window.addEventListener('taskStatusChanged', handleChange);
    return () => window.removeEventListener('taskStatusChanged', handleChange);
  }, [refresh]);

  return {
    updateTaskStatus,
    getTaskWithStatus,
    getStatusUpdates,
    refresh,
    refreshKey,
  };
}
