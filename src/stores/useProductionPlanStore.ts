/**
 * 生产计划数据 Zustand Store (V2.1 架构 - 已简化)
 * 管理生产计划的完整 CRUD 数据流
 * 数据流：API → Store → 页面组件
 */
import { create } from 'zustand';
import { CropBatch } from '../types';
import * as apiService from '../services/apiProductionPlanService';

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
  (set) => ({
    plans: [],
    isLoading: false,
    error: null,

    fetchPlans: async (filters) => {
      set({ isLoading: true, error: null });
      try {
        const data = await apiService.getProductionPlans(filters);
        set({ plans: data, isLoading: false });
      } catch (error) {
        console.error('[useProductionPlanStore] 获取生产计划失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    addPlan: async (plan) => {
      const result = await apiService.createProductionPlan(plan);
      set((state) => ({ plans: [result, ...state.plans] }));
      return result;
    },

    updatePlan: async (id, updates) => {
      const result = await apiService.updateProductionPlan(id, updates);
      if (result) {
        set((state) => ({
          plans: state.plans.map((p) => (p.id === id ? { ...p, ...result } : p)),
        }));
      }
      return result;
    },

    deletePlan: async (id) => {
      const result = await apiService.deleteProductionPlan(id);
      if (result) {
        set((state) => ({ plans: state.plans.filter((p) => p.id !== id) }));
      }
      return result;
    },

    deletePlans: async (ids) => {
      const result = await apiService.deleteProductionPlans(ids);
      if (result) {
        set((state) => ({ plans: state.plans.filter((p) => !ids.includes(p.id)) }));
      }
      return result;
    },
  })
);
