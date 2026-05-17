/**
 * 工序定义 Store - Zustand 状态管理
 * 对应系统设置 → 工序管理
 * 数据流：组件 → Store → apiBasicDataService → Backend API
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getProcessDefinitions,
  createProcessDefinition,
  updateProcessDefinition,
  deleteProcessDefinition,
  type ProcessDefinition,
} from '../services/apiBasicDataService';

interface ProcessDefinitionStore {
  items: ProcessDefinition[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  loadItems: () => Promise<void>;
  addItem: (item: Partial<ProcessDefinition>) => Promise<ProcessDefinition>;
  updateItem: (id: number | string, item: Partial<ProcessDefinition>) => Promise<void>;
  removeItem: (id: number | string) => Promise<void>;
  refreshItems: () => Promise<void>;
}

export const useProcessDefinitionStore = create<ProcessDefinitionStore>()(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadItems: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        // 缓存5分钟
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().items.length > 0) {
          return;
        }

        set({ loading: true, error: null });
        try {
          const data = await getProcessDefinitions();
          set({ items: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载工序定义失败', loading: false });
        }
      },

      addItem: async (item) => {
        set({ loading: true, error: null });
        try {
          const created = await createProcessDefinition(item);
          set((state) => ({ items: [...state.items, created], loading: false }));
          return created;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '创建工序定义失败', loading: false });
          throw error;
        }
      },

      updateItem: async (id, item) => {
        set({ loading: true, error: null });
        try {
          await updateProcessDefinition(id, item);
          set((state) => ({
            items: state.items.map((i) => (i.id === id || String(i.id) === String(id) ? { ...i, ...item } : i)),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新工序定义失败', loading: false });
          throw error;
        }
      },

      removeItem: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteProcessDefinition(id);
          set((state) => ({
            items: state.items.filter((i) => i.id !== id && String(i.id) !== String(id)),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '删除工序定义失败', loading: false });
          throw error;
        }
      },

      refreshItems: async () => {
        set({ lastFetch: null });
        await get().loadItems();
      },
    }),
    {
      name: 'process_definition_store',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
