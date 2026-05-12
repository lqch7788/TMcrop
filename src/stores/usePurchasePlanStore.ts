/**
 * 采购计划状态 Store - Zustand 替代 usePurchasePlanStore (localStorage + CustomEvent)
 * 用于审批联动：审批通过后更新采购计划状态
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PurchasePlanStatusUpdate {
  planId: string;
  status: string;
  statusText: string;
  updatedAt: string;
}

interface PurchasePlanStore {
  statusUpdates: Record<string, PurchasePlanStatusUpdate>;
  updatePurchasePlanStatus: (planId: string, status: string, statusText: string) => void;
  getStatusUpdates: () => Record<string, PurchasePlanStatusUpdate>;
  clearAllUpdates: () => void;
}

export const usePurchasePlanStore = create<PurchasePlanStore>()(
  persist(
    (set, get) => ({
      statusUpdates: {},

      updatePurchasePlanStatus: (planId, status, statusText) => {
        const update: PurchasePlanStatusUpdate = {
          planId,
          status,
          statusText,
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          statusUpdates: { ...state.statusUpdates, [planId]: update },
        }));
      },

      getStatusUpdates: () => get().statusUpdates,

      clearAllUpdates: () => set({ statusUpdates: {} }),
    }),
    {
      name: 'purchase_plan_status_updates',
    }
  )
);
