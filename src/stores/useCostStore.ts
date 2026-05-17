/**
 * 成本核算 Store - Zustand 状态管理
 * 统一管理成本类别和预算的增删改查
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getCostCategories, createCostCategory, updateCostCategory, deleteCostCategory,
  getCostBudgets, createCostBudget, updateCostBudget, deleteCostBudget,
  type CostCategoryItem, type CostBudgetItem,
} from '../services/apiBasicDataService';

interface CostStore {
  categories: CostCategoryItem[];
  budgets: CostBudgetItem[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  loadAll: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadBudgets: () => Promise<void>;

  addCategory: (data: Partial<CostCategoryItem>) => Promise<CostCategoryItem>;
  updateCategory: (id: number, data: Partial<CostCategoryItem>) => Promise<void>;
  removeCategory: (id: number) => Promise<void>;

  addBudget: (data: Partial<CostBudgetItem>) => Promise<CostBudgetItem>;
  updateBudget: (id: number, data: Partial<CostBudgetItem>) => Promise<void>;
  removeBudget: (id: number) => Promise<void>;

  refreshAll: () => Promise<void>;
}

export const useCostStore = create<CostStore>()(
  persist(
    (set, get) => ({
      categories: [],
      budgets: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadAll: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().categories.length > 0) return;

        set({ loading: true, error: null });
        try {
          const [categories, budgets] = await Promise.all([getCostCategories(), getCostBudgets()]);
          set({ categories, budgets, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载成本数据失败', loading: false });
        }
      },

      loadCategories: async () => {
        try { const data = await getCostCategories(); set({ categories: data }); }
        catch (error) { set({ error: error instanceof Error ? error.message : '加载成本类别失败' }); }
      },

      loadBudgets: async () => {
        try { const data = await getCostBudgets(); set({ budgets: data }); }
        catch (error) { set({ error: error instanceof Error ? error.message : '加载预算失败' }); }
      },

      addCategory: async (data) => {
        set({ loading: true, error: null });
        try {
          const created = await createCostCategory(data);
          set((s) => ({ categories: [...s.categories, created], loading: false }));
          return created;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '创建成本类别失败', loading: false });
          throw error;
        }
      },

      updateCategory: async (id, data) => {
        set({ loading: true, error: null });
        try {
          await updateCostCategory(id, data);
          set((s) => ({ categories: s.categories.map((c) => c.id === id ? { ...c, ...data } : c), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新成本类别失败', loading: false });
          throw error;
        }
      },

      removeCategory: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteCostCategory(id);
          set((s) => ({ categories: s.categories.filter((c) => c.id !== id), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '删除成本类别失败', loading: false });
          throw error;
        }
      },

      addBudget: async (data) => {
        set({ loading: true, error: null });
        try {
          const created = await createCostBudget(data);
          set((s) => ({ budgets: [...s.budgets, created], loading: false }));
          return created;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '创建预算失败', loading: false });
          throw error;
        }
      },

      updateBudget: async (id, data) => {
        set({ loading: true, error: null });
        try {
          await updateCostBudget(id, data);
          set((s) => ({ budgets: s.budgets.map((b) => b.id === id ? { ...b, ...data } : b), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新预算失败', loading: false });
          throw error;
        }
      },

      removeBudget: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteCostBudget(id);
          set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '删除预算失败', loading: false });
          throw error;
        }
      },

      refreshAll: async () => { set({ lastFetch: null }); await get().loadAll(); },
    }),
    {
      name: 'cost_store',
      partialize: (s) => ({ categories: s.categories, budgets: s.budgets }),
    }
  )
);
