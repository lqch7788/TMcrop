// ============================================================
// 指标状态管理Store
// 文件路径：src/hooks/useIndicatorStore.ts
// 用于审批联动：审批通过后更新指标状态
// 已迁移到 Zustand Store (src/stores/useIndicatorStore.ts)
// 本文件保留用于向后兼容
// ============================================================

import { useIndicatorStore as useZustandIndicatorStore } from '../stores/useIndicatorStore';

export type { IndicatorStatusUpdate, Indicator } from '../stores/useIndicatorStore';

export function useIndicatorStore() {
  const store = useZustandIndicatorStore();

  return {
    updateIndicatorStatus: store.updateIndicatorStatus,
    getIndicatorWithStatus: store.getIndicatorWithStatus,
    getStatusUpdates: store.getStatusUpdates,
    refresh: () => {},
    refreshKey: 0,
  };
}

export { updateIndicatorStatus, getIndicatorWithStatus, getStatusUpdates } from '../stores/useIndicatorStore';
