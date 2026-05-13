/**
 * 生产计划数据 Zustand Store
 * 管理生产计划的完整 CRUD 数据流
 * 数据流：enhancedApiClient → Store → 页面组件
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CropBatch } from '../types';
import * as planService from '../services/apiProductionPlanLocalService';

interface ProductionPlanFilters {
  status?: string;
  planType?: string;
  keyword?: string;
}

interface ProductionPlanState {
  // 数据
  plans: CropBatch[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPlans: (filters?: ProductionPlanFilters) => Promise<void>;
  addPlan: (plan: Omit<CropBatch, 'id'>) => Promise<CropBatch>;
  updatePlan: (id: string, updates: Partial<CropBatch>) => Promise<CropBatch | null>;
  deletePlan: (id: string) => Promise<boolean>;
  deletePlans: (ids: string[]) => Promise<boolean>;
}

export const useProductionPlanStore = create<ProductionPlanState>()(
  persist(
    (set) => ({
      plans: [],
      isLoading: false,
      error: null,

      fetchPlans: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await planService.getProductionPlans();
          set({ plans: data as unknown as CropBatch[], isLoading: false });
        } catch (error) {
          console.error('[useProductionPlanStore] 获取生产计划失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      addPlan: async (plan) => {
        const result = await planService.addProductionPlan(plan as any);
        const newPlan = { ...plan, id: (result as any).id || '' } as CropBatch;
        set((state) => ({ plans: [newPlan, ...state.plans] }));
        return newPlan;
      },

      updatePlan: async (id, updates) => {
        const result = await planService.updateProductionPlan(id, updates as any);
        if (result) {
          set((state) => ({
            plans: state.plans.map((p) => (p.id === id ? { ...p, ...updates } : p)),
          }));
        }
        return result as unknown as CropBatch | null;
      },

      deletePlan: async (id) => {
        const result = await planService.deleteProductionPlan(id);
        if (result) {
          set((state) => ({ plans: state.plans.filter((p) => p.id !== id) }));
        }
        return result;
      },

      deletePlans: async (ids) => {
        const result = await planService.deleteProductionPlans(ids);
        if (result) {
          set((state) => ({ plans: state.plans.filter((p) => !ids.includes(p.id)) }));
        }
        return result;
      },
    }),
    {
      name: 'production-plan-storage',
      partialize: (state) => ({ plans: state.plans }),
    }
  )
);
