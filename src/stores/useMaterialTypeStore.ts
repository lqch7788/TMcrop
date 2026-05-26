/**
 * 物料类型 Store - Zustand 状态管理
 */
import { create } from 'zustand';
import {
  getMaterialTypes, createMaterialType, updateMaterialType, deleteMaterialType,
  type MaterialType,
} from '../services/apiBasicDataService';

interface MaterialTypeStore {
  types: MaterialType[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  loadTypes: () => Promise<void>;
  addType: (data: Partial<MaterialType>) => Promise<MaterialType>;
  editType: (id: number, data: Partial<MaterialType>) => Promise<void>;
  removeType: (id: number) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useMaterialTypeStore = create<MaterialTypeStore>()(
  (set, get)=> ({
      types: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadTypes: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().types.length > 0) return;

        set({ loading: true, error: null });
        try {
          const data = await getMaterialTypes();
          set({ types: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载物料类型失败', loading: false });
        }
      },

      addType: async (data) => {
        set({ loading: true, error: null });
        try {
          const created = await createMaterialType(data);
          set((s) => ({ types: [...s.types, created], loading: false }));
          return created;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '创建物料类型失败', loading: false });
          throw error;
        }
      },

      editType: async (id, data) => {
        set({ loading: true, error: null });
        try {
          await updateMaterialType(id, data);
          set((s) => ({ types: s.types.map((t) => t.id === id ? { ...t, ...data } : t), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新物料类型失败', loading: false });
          throw error;
        }
      },

      removeType: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteMaterialType(id);
          set((s) => ({ types: s.types.filter((t) => t.id !== id), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '删除物料类型失败', loading: false });
          throw error;
        }
      },

      refreshAll: async () => { set({ lastFetch: null }); await get().loadTypes(); },
    })
);
