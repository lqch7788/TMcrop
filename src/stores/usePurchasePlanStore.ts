/**
 * 采购计划 Zustand Store (V3.0 强化类型)
 * 管理采购计划的完整 CRUD 数据流 + 审批状态联动
 * 数据流：enhancedApiClient → Store → 页面组件
 */
import { create } from 'zustand';
import { PurchasePlan, PurchasePlanStatus } from '../types/purchase';
import * as planService from '../services/apiPurchasePlanService';

export interface PurchasePlanStatusUpdate {
  planId: string;
  status: string;
  statusText: string;
  updatedAt: string;
}

/** 创建采购计划入参（前端侧，不含 id/timestamps） */
export type CreatePurchasePlanInput = Omit<PurchasePlan, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

/** 更新采购计划入参（部分字段） */
export type UpdatePurchasePlanInput = Partial<Omit<PurchasePlan, 'id'>>;

interface PurchasePlanState {
  // 数据
  plans: PurchasePlan[];
  isLoading: boolean;
  error: string | null;

  // 状态联动
  statusUpdates: Record<string, PurchasePlanStatusUpdate>;

  // 数据 Actions
  fetchPlans: () => Promise<void>;
  addPlan: (data: CreatePurchasePlanInput) => Promise<PurchasePlan>;
  updatePlan: (id: string, updates: UpdatePurchasePlanInput) => Promise<PurchasePlan | null>;
  deletePlan: (id: string) => Promise<boolean>;
  updateExecutionStatus: (id: string, executionStatus: string) => Promise<PurchasePlan | null>;
  deletePlans: (ids: string[]) => Promise<{ deleted: number; skipped: { id: string; reason: string }[] }>;

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
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    addPlan: async (data) => {
      const result = await planService.addPurchasePlan(data as Omit<PurchasePlan, 'id'>);
      set((state) => ({ plans: [result, ...state.plans] }));
      return result;
    },

    updatePlan: async (id, updates) => {
      const result = await planService.updatePurchasePlan(id, updates);
      if (result) {
        set((state) => ({
          plans: state.plans.map((p) => (p.id === id ? { ...p, ...result } : p)),
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

    updateExecutionStatus: async (id, executionStatus) => {
      // H-6: 改用顶部已静态导入的 planService.updateExecutionStatus，避免每次调用都走动态 import
      const updated = await planService.updateExecutionStatus(id, executionStatus);
      if (updated) {
        set((state) => ({
          plans: state.plans.map((p) => (p.id === id ? updated : p)),
        }));
        // M-9: 后端已返回最新状态，清掉本地对该 plan 的 statusUpdate 防止状态分裂
        set((state) => {
          if (!(id in state.statusUpdates)) return state;
          const { [id]: _removed, ...rest } = state.statusUpdates;
          return { statusUpdates: rest };
        });
      }
      return updated;
    },

    deletePlans: async (ids) => {
      const result = await planService.deletePurchasePlans(ids);
      if (result.deleted > 0) {
        const deletedSet = new Set(
          ids.filter(id => !result.skipped.some(s => s.id === id))
        );
        set((state) => ({
          plans: state.plans.filter((p) => !deletedSet.has(p.id)),
        }));
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
            status: update.status as PurchasePlanStatus,
            statusText: update.statusText,
          };
        }
        return plan;
      });
    },
  })
);
