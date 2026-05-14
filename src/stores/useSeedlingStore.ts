/**
 * 育苗管理 Zustand Store
 * 数据流：enhancedApiClient → Store → 页面组件
 * 三级降级：API → IndexedDB → localStorage
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Seedling } from '../types/crop';
import * as seedlingService from '../services/apiSeedlingService';

interface SeedlingState {
  items: Seedling[];
  isLoading: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  addItem: (item: Omit<Seedling, 'id' | 'createTime' | 'updateTime'>) => Promise<Seedling | null>;
  updateItem: (id: string, updates: Partial<Seedling>) => Promise<Seedling | null>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;
}

export const useSeedlingStore = create<SeedlingState>()(
  persist(
    (set) => ({
      items: [],
      isLoading: false,
      error: null,

      loadItems: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await seedlingService.getSeedlings();
          set({ items: data, isLoading: false });
        } catch (error) {
          console.error('[useSeedlingStore] 获取育苗数据失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      addItem: async (item) => {
        try {
          const result = await seedlingService.addSeedling(item);
          if (result) set((s) => ({ items: [result, ...s.items] }));
          return result;
        } catch (error) {
          console.error('[useSeedlingStore] 添加育苗失败:', error);
          return null;
        }
      },

      updateItem: async (id, updates) => {
        try {
          const result = await seedlingService.updateSeedling(id, updates);
          if (result) set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...updates } : i) }));
          return result;
        } catch (error) {
          console.error('[useSeedlingStore] 更新育苗失败:', error);
          return null;
        }
      },

      deleteItem: async (id) => {
        try {
          const result = await seedlingService.deleteSeedling(id);
          if (result) set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
          return result;
        } catch (error) {
          console.error('[useSeedlingStore] 删除育苗失败:', error);
          return false;
        }
      },

      deleteItems: async (ids) => {
        try {
          const result = await seedlingService.deleteSeedlings(ids);
          if (result) set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }));
          return result;
        } catch (error) {
          console.error('[useSeedlingStore] 批量删除育苗失败:', error);
          return false;
        }
      },
    }),
    { name: 'seedling-storage', partialize: (s) => ({ items: s.items }) }
  )
);
