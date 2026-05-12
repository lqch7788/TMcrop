// ============================================================
// 巡查状态管理Store
// 文件路径：src/hooks/useInspectionStore.ts
// 用于审批联动：审批通过后更新巡查问题状态
// 已迁移到 Zustand Store (src/stores/useInspectionStore.ts)
// 本文件保留用于向后兼容
// ============================================================

import { useInspectionStore as useZustandInspectionStore } from '../stores/useInspectionStore';

export type { InspectionStatusUpdate, Inspection } from '../stores/useInspectionStore';

export function useInspectionStore() {
  const store = useZustandInspectionStore();

  return {
    updateInspectionStatus: store.updateInspectionStatus,
    getInspectionWithStatus: store.getInspectionWithStatus,
    getStatusUpdates: store.getStatusUpdates,
    refresh: () => {},
    refreshKey: 0,
  };
}

export { updateInspectionStatus, getInspectionWithStatus, getStatusUpdates } from '../stores/useInspectionStore';
