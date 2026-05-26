/**
 * 分支/基地管理 Store - Zustand 状态管理
 * 统一管理种植基地的增删改查
 */
import { create } from 'zustand';
import {
  getBranches, createBranch, updateBranch, deleteBranch,
  type Branch,
} from '../services/apiBasicDataService';

interface BranchStore {
  branches: Branch[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  loadBranches: () => Promise<void>;
  addBranch: (data: Partial<Branch>) => Promise<Branch>;
  updateBranch: (id: number, data: Partial<Branch>) => Promise<void>;
  removeBranch: (id: number) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useBranchStore = create<BranchStore>()(
  (set, get)=> ({
      branches: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadBranches: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().branches.length > 0) return;

        set({ loading: true, error: null });
        try {
          const data = await getBranches();
          set({ branches: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载基地数据失败', loading: false });
        }
      },

      addBranch: async (data) => {
        set({ loading: true, error: null });
        try {
          const created = await createBranch(data);
          set((s) => ({ branches: [...s.branches, created], loading: false }));
          return created;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '创建基地失败', loading: false });
          throw error;
        }
      },

      updateBranch: async (id, data) => {
        set({ loading: true, error: null });
        try {
          await updateBranch(id, data);
          set((s) => ({
            branches: s.branches.map((b) => b.id === id ? { ...b, ...data } : b),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新基地失败', loading: false });
          throw error;
        }
      },

      removeBranch: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteBranch(id);
          set((s) => ({ branches: s.branches.filter((b) => b.id !== id), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '删除基地失败', loading: false });
          throw error;
        }
      },

      refreshAll: async () => {
        set({ lastFetch: null });
        await get().loadBranches();
      },
    })
);
