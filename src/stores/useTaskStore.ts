/**
 * 任务状态 Store - Zustand 替代 useTaskStore (localStorage + CustomEvent)
 * 用于审批联动：审批通过后更新任务状态为待接受
 */
import { create } from 'zustand';export interface TaskStatusUpdate {
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

interface TaskStore {
  statusUpdates: Record<string, TaskStatusUpdate>;
  updateTaskStatus: (taskId: string, status: TaskStatusUpdate['status'], updatedBy?: string) => void;
  getTaskWithStatus: (task: Task) => Task;
  getStatusUpdates: () => Record<string, TaskStatusUpdate>;
  clearAllUpdates: () => void;
}

export const useTaskStore = create<TaskStore>()(
  (set, get)=> ({
      statusUpdates: {},

      updateTaskStatus: (taskId, status, updatedBy) => {
        const update: TaskStatusUpdate = {
          taskId,
          status,
          updatedAt: new Date().toISOString(),
          updatedBy,
        };
        set((state) => ({
          statusUpdates: { ...state.statusUpdates, [taskId]: update },
        }));
      },

      getTaskWithStatus: (task) => {
        const update = get().statusUpdates[task.id];
        return update ? { ...task, status: update.status } : task;
      },

      getStatusUpdates: () => get().statusUpdates,

      clearAllUpdates: () => set({ statusUpdates: {} }),
    })
);
