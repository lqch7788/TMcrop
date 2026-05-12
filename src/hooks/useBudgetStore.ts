// ============================================================
// 预算状态管理Store
// 文件路径：src/hooks/useBudgetStore.ts
// 用于审批联动：审批通过后更新预算状态
// 已迁移到 Zustand Store (src/stores/useBudgetStore.ts)
// 本文件保留用于向后兼容
// ============================================================

import { useBudgetStore as useZustandBudgetStore } from '../stores/useBudgetStore';

export type { BudgetStatusUpdate, Budget, BudgetItem } from '../stores/useBudgetStore';

export function useBudgetStore() {
  const store = useZustandBudgetStore();

  return {
    updateBudgetStatus: store.updateBudgetStatus,
    getBudgetWithStatus: store.getBudgetWithStatus,
    getStatusUpdates: store.getStatusUpdates,
    refresh: () => {},
    refreshKey: 0,
  };
}

export { updateBudgetStatus, getBudgetWithStatus, getStatusUpdates } from '../stores/useBudgetStore';
