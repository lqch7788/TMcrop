/**
 * 采收入库 Zustand Store
 * 数据流：enhancedApiClient → Store → 页面组件
 * 三级降级：API → IndexedDB → localStorage
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HarvestRecord } from '../types/crop';
import * as harvestService from '../services/apiHarvestService';

interface HarvestState {
  items: HarvestRecord[];
  isLoading: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  addItem: (item: Omit<HarvestRecord, 'id'>) => Promise<HarvestRecord | null>;
  updateItem: (id: string, updates: Partial<HarvestRecord>) => Promise<HarvestRecord | null>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;
}

export const useHarvestStore = create<HarvestState>()(
  persist(
    (set) => ({
      items: [],
      isLoading: false,
      error: null,

      loadItems: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await harvestService.getHarvestRecords();
          set({ items: data, isLoading: false });
        } catch (error) {
          console.error('[useHarvestStore] 获取采收数据失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      addItem: async (item) => {
        try {
          const result = await harvestService.addHarvestRecord(item);
          if (result) set((s) => ({ items: [result, ...s.items] }));
          return result;
        } catch (error) {
          console.error('[useHarvestStore] 添加采收失败:', error);
          return null;
        }
      },

      updateItem: async (id, updates) => {
        try {
          const result = await harvestService.updateHarvestRecord(id, updates);
          if (result) set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...updates } : i) }));
          return result;
        } catch (error) {
          console.error('[useHarvestStore] 更新采收失败:', error);
          return null;
        }
      },

      deleteItem: async (id) => {
        try {
          const result = await harvestService.deleteHarvestRecord(id);
          if (result) set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
          return result;
        } catch (error) {
          console.error('[useHarvestStore] 删除采收失败:', error);
          return false;
        }
      },

      deleteItems: async (ids) => {
        try {
          const result = await harvestService.deleteHarvestRecords(ids);
          if (result) set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }));
          return result;
        } catch (error) {
          console.error('[useHarvestStore] 批量删除采收失败:', error);
          return false;
        }
      },
    }),
    {
      name: 'harvest-storage',
      version: 2,
      partialize: (state) => ({ items: state.items }),
      merge: (persisted: unknown, current) => {
        const state = current as HarvestState;
        if (persisted && typeof persisted === 'object' && Array.isArray((persisted as Record<string, unknown>).items)) {
          return { ...state, items: (persisted as Record<string, unknown>).items as HarvestRecord[] };
        }
        return state;
      },
    }
  )
);
