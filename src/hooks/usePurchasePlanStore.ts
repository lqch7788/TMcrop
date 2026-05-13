/**
 * 采购计划状态管理 - 兼容层
 * 已迁移到 Zustand Store (src/stores/usePurchasePlanStore.ts)
 * 本文件保留用于向后兼容
 */
import { usePurchasePlanStore as useZustandPurchasePlanStore } from '../stores/usePurchasePlanStore';

export type { PurchasePlanStatusUpdate } from '../stores/usePurchasePlanStore';

export function usePurchasePlanStore() {
  const store = useZustandPurchasePlanStore();

  return {
    updatePurchasePlanStatus: store.updatePurchasePlanStatus,
    getStatusUpdates: store.getStatusUpdates,
    clearAllUpdates: store.clearAllUpdates,
  };
}

// 向后兼容的独立函数
export function updatePurchasePlanStatus(planId: string, status: string, statusText: string): void {
  useZustandPurchasePlanStore.getState().updatePurchasePlanStatus(planId, status, statusText);
}

export function getStatusUpdates(): Record<string, any> {
  return useZustandPurchasePlanStore.getState().getStatusUpdates();
}

export function clearAllStatusUpdates(): void {
  useZustandPurchasePlanStore.getState().clearAllUpdates();
}

// 获取应用状态更新后的采购计划数据（向后兼容）
export function getPurchasePlansWithStatus() {
  return useZustandPurchasePlanStore.getState().getPlansWithStatus();
}

// 异步获取采购计划数据（向后兼容 - 从 Store 刷新后返回带状态的数据）
export async function getPurchasePlansWithStatusAsync() {
  const store = useZustandPurchasePlanStore.getState();
  await store.fetchPlans();
  return store.getPlansWithStatus();
}

// 监听状态变化（向后兼容 - Zustand 自带订阅机制）
export function subscribeToStatusChanges(callback: () => void): () => void {
  return useZustandPurchasePlanStore.subscribe((state, prevState) => {
    if (state.statusUpdates !== prevState.statusUpdates) {
      callback();
    }
  });
}
