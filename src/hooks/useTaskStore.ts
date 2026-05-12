// ============================================================
// 任务状态管理Store
// 文件路径：src/hooks/useTaskStore.ts
// 用于审批联动：审批通过后更新任务状态为待接受
// 已迁移到 Zustand Store (src/stores/useTaskStore.ts)
// 本文件保留用于向后兼容
// ============================================================

import { useTaskStore as useZustandTaskStore } from '../stores/useTaskStore';

export type { TaskStatusUpdate, Task } from '../stores/useTaskStore';

export function useTaskStore() {
  const store = useZustandTaskStore();

  return {
    updateTaskStatus: store.updateTaskStatus,
    getTaskWithStatus: store.getTaskWithStatus,
    getStatusUpdates: store.getStatusUpdates,
    refresh: () => {}, // Zustand 自动通知，无需手动刷新
    refreshKey: 0,
  };
}

export { updateTaskStatus, getTaskWithStatus, getStatusUpdates } from '../stores/useTaskStore';
