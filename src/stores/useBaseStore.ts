/**
 * 基地管理 Store - Zustand 状态管理（基地空间架构 V1.0）
 * 统一管理种植基地的增删改查
 */
import { create } from 'zustand';
import {
  getBases, createBase, updateBase, deleteBase,
  type Base,
} from '../services/apiBasicDataService';

interface BaseStore {
  bases: Base[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  loadBases: (companyOid?: string) => Promise<void>;
  addBase: (data: Partial<Base>) => Promise<Base>;
  editBase: (oid: string, data: Partial<Base>) => Promise<void>;
  removeBase: (oid: string) => Promise<void>;
  refreshBases: () => Promise<void>;
}

export const useBaseStore = create<BaseStore>()(
  (set, get)=> ({
      bases: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadBases: async (companyOid?: string) => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().bases.length > 0) return;

        set({ loading: true, error: null });
        try {
          const data = await getBases(companyOid);
          set({ bases: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载基地数据失败', loading: false });
        }
      },

      addBase: async (data) => {
        set({ loading: true, error: null });
        try {
          const created = await createBase(data);
          set((s) => ({ bases: [...s.bases, created], loading: false }));
          return created;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '创建基地失败', loading: false });
          throw error;
        }
      },

      editBase: async (oid, data) => {
        set({ loading: true, error: null });
        try {
          await updateBase(oid, data);
          set((s) => ({
            bases: s.bases.map((b) => b.oid === oid ? { ...b, ...data } : b),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新基地失败', loading: false });
          throw error;
        }
      },

      removeBase: async (oid) => {
        set({ loading: true, error: null });
        try {
          await deleteBase(oid);
          set((s) => ({ bases: s.bases.filter((b) => b.oid !== oid), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '删除基地失败', loading: false });
          throw error;
        }
      },

      refreshBases: async () => {
        set({ lastFetch: null });
        await get().loadBases();
      },
    })
);

/** 根据 oid 获取基地 */
export const getBaseByOid = (oid: string): Base | undefined => {
  return useBaseStore.getState().bases.find(b => b.oid === oid);
};

/** 根据公司 oid 获取基地列表 */
export const getBasesByCompany = (companyOid: string): Base[] => {
  return useBaseStore.getState().bases.filter(b => b.companyOid === companyOid);
};

/** 获取活跃基地 */
export const getActiveBases = (): Base[] => {
  return useBaseStore.getState().bases.filter(b => b.status === 'active');
};
