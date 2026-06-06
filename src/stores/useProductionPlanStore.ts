/**
 * 生产计划数据 Zustand Store (V2.1 架构)
 * 管理生产计划的完整 CRUD 数据流
 *
 * 数据流：API → enhancedApiClient（无缓存）→ Store → 页面组件
 * - L1：Store 内存数据
 * - L2：（未使用）无 API
 * - L3：（未使用）生产计划页面不读取 localStorage
 */
import { create } from 'zustand';
import type { CropBatch } from '../types';
import * as apiService from '../services/apiProductionPlanService';

interface ProductionPlanFilters {
  status?: string;
  planType?: string;
  keyword?: string;
}

interface ProductionPlanState {
  // 数据 — P0-02: plans 重命名为 batches（与 CropBatch 类型一致，避免消费方再次重命名）
  batches: CropBatch[];
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
    batches: [],
    isLoading: false,
    error: null,

    fetchPlans: async (filters) => {
      set({ isLoading: true, error: null });
      try {
        const data = await apiService.getProductionPlans(filters);
        set({ batches: data, isLoading: false });
      } catch (error) {
        // logger.error('[useProductionPlanStore] 获取生产计划失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    // H-01: 4 个写操作全部加 try/catch + setError，避免异常被吞导致 UI 无感知
    addPlan: async (plan) => {
      try {
        const result = await apiService.createProductionPlan(plan);
        if (result) {
          set((state) => ({ batches: [result, ...state.batches] }));
        }
        return result;
      } catch (error) {
        console.error('[useProductionPlanStore] addPlan 失败:', error);
        set({ error: (error as Error).message });
        throw error;
      }
    },

    updatePlan: async (id, updates) => {
      try {
        const result = await apiService.updateProductionPlan(id, updates);
        if (result) {
          set((state) => ({
            batches: state.batches.map((p) => (p.id === id ? { ...p, ...result } : p)),
          }));
        }
        return result;
      } catch (error) {
        console.error('[useProductionPlanStore] updatePlan 失败:', error);
        set({ error: (error as Error).message });
        throw error;
      }
    },

    deletePlan: async (id) => {
      try {
        const result = await apiService.deleteProductionPlan(id);
        if (result) {
          set((state) => ({ batches: state.batches.filter((p) => p.id !== id) }));
        }
        return result;
      } catch (error) {
        console.error('[useProductionPlanStore] deletePlan 失败:', error);
        set({ error: (error as Error).message });
        throw error;
      }
    },

    deletePlans: async (ids) => {
      try {
        const result = await apiService.deleteProductionPlans(ids);
        if (result) {
          set((state) => ({ batches: state.batches.filter((p) => !ids.includes(p.id)) }));
        }
        return result;
      } catch (error) {
        console.error('[useProductionPlanStore] deletePlans 失败:', error);
        set({ error: (error as Error).message });
        throw error;
      }
    },
  })
);
