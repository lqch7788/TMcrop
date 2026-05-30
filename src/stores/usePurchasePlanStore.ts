/**
 * 采购计划 Zustand Store (V2.1 架构 - 已简化)
 * 管理采购计划的完整 CRUD 数据流 + 审批状态联动
 * 数据流：enhancedApiClient → Store → 页面组件
 */
import { create } from 'zustand';
import { PurchasePlan } from '../types/purchase';
import * as planService from '../services/apiPurchasePlanService';

export interface PurchasePlanStatusUpdate {
  planId: string;
  status: string;
  statusText: string;
  updatedAt: string;
}

interface PurchasePlanState {
  // 数据
  plans: PurchasePlan[];
  isLoading: boolean;
  error: string | null;

  // 状态联动
  statusUpdates: Record<string, PurchasePlanStatusUpdate>;

  // 数据 Actions
  fetchPlans: () => Promise<void>;
  addPlan: (data: any) => Promise<PurchasePlan>;
  updatePlan: (id: string, updates: any) => Promise<PurchasePlan | null>;
  deletePlan: (id: string) => Promise<boolean>;
  deletePlans: (ids: string[]) => Promise<boolean>;

  // 状态 Actions
  updatePurchasePlanStatus: (planId: string, status: string, statusText: string) => void;
  getStatusUpdates: () => Record<string, PurchasePlanStatusUpdate>;
  clearAllUpdates: () => void;

  // 合并 API 数据与状态更新
  getPlansWithStatus: () => PurchasePlan[];
}

export const usePurchasePlanStore = create<PurchasePlanState>()(
  (set, get) => ({
    plans: [],
    isLoading: false,
    error: null,
    statusUpdates: {},

    fetchPlans: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await planService.getPurchasePlans();
        set({ plans: data || [], isLoading: false });
      } catch (error) {
        // logger.error('[usePurchasePlanStore] 获取采购计划失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    addPlan: async (data) => {
      const result = await planService.addPurchasePlan(data);
      set((state) => ({ plans: [result, ...state.plans] }));
      return result;
    },

    updatePlan: async (id, updates) => {
      const result = await planService.updatePurchasePlan(id, updates);
      if (result) {
        set((state) => ({
          plans: state.plans.map((p) => (p.id === id ? { ...p, ...(result as any) } : p)),
        }));
      }
      return result;
    },

    deletePlan: async (id) => {
      const result = await planService.deletePurchasePlan(id);
      if (result) {
        set((state) => ({ plans: state.plans.filter((p) => p.id !== id) }));
      }
      return result;
    },

    deletePlans: async (ids) => {
      const result = await planService.deletePurchasePlans(ids);
      if (result) {
        set((state) => ({ plans: state.plans.filter((p) => !ids.includes(p.id)) }));
      }
      return result;
    },

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

    getPlansWithStatus: () => {
      const { plans, statusUpdates } = get();
      return plans.map(plan => {
        const update = statusUpdates[plan.id];
        if (update) {
          return {
            ...plan,
            status: update.status as PurchasePlan['status'],
            statusText: update.statusText,
          };
        }
        return plan;
      });
    },
  })
);
