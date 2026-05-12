// ============================================================
// 采购计划状态管理
// 使用 localStorage 持久化状态更新，支持审批联动
// 已迁移到 Zustand Store (src/stores/usePurchasePlanStore.ts)
// 本文件保留用于向后兼容
// ============================================================

import { usePurchasePlanStore as useZustandPurchasePlanStore } from '../stores/usePurchasePlanStore';
import { purchasePlans as initialPurchasePlans } from '../data/mockData';
import { getPurchasePlans } from '../services/apiPurchasePlanService';
import type { PurchasePlan } from '../types/purchase';

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

export function getStatusUpdates(): Record<string, PurchasePlanStatusUpdate> {
  return useZustandPurchasePlanStore.getState().getStatusUpdates();
}

export function clearAllStatusUpdates(): void {
  useZustandPurchasePlanStore.getState().clearAllUpdates();
}

// 获取应用状态更新后的采购计划数据
export function getPurchasePlansWithStatus(): PurchasePlan[] {
  const updates = useZustandPurchasePlanStore.getState().getStatusUpdates();

  return initialPurchasePlans.map(plan => {
    const update = updates[plan.id];
    if (update) {
      return {
        ...plan,
        status: update.status as PurchasePlan['status'],
        statusText: update.statusText,
      };
    }
    return plan;
  }) as PurchasePlan[];
}

// 异步获取采购计划数据（使用 apiPurchasePlanService，带localStorage降级）
export async function getPurchasePlansWithStatusAsync(): Promise<PurchasePlan[]> {
  const apiData = await getPurchasePlans();
  const updates = useZustandPurchasePlanStore.getState().getStatusUpdates();

  return apiData.map(plan => {
    const update = updates[plan.id];
    if (update) {
      return {
        ...plan,
        status: update.status as PurchasePlan['status'],
        statusText: update.statusText,
      };
    }
    return plan;
  }) as PurchasePlan[];
}

// 监听状态变化
export function subscribeToStatusChanges(callback: (planId: string, status: string, statusText: string) => void): () => void {
  return () => {};
}
