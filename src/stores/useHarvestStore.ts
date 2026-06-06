/**
 * 采收入库 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：enhancedApiClient → Store → 页面组件
 */
import { create } from 'zustand';
import { HarvestRecord } from '../types/crop';
import * as harvestService from '../services/apiHarvestService';

interface HarvestState {
  items: HarvestRecord[];
  isLoading: boolean;
  error: string | null;

  /** 手动清空 error 状态（由页面在 toast 后调用） */
  clearError: () => void;

  loadItems: () => Promise<void>;
  addItem: (item: Omit<HarvestRecord, 'id'>) => Promise<HarvestRecord | null>;
  updateItem: (id: string, updates: Partial<HarvestRecord>) => Promise<HarvestRecord | null>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;
}

export const useHarvestStore = create<HarvestState>()(
  (set) => ({
    items: [],
    isLoading: false,
    error: null,

    clearError: () => set({ error: null }),

    loadItems: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await harvestService.getHarvestRecords();
        set({ items: data, isLoading: false });
      } catch (error) {
        // logger.error('[useHarvestStore] 获取采收数据失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    addItem: async (item) => {
      try {
        const result = await harvestService.addHarvestRecord(item);
        if (result) set((s) => ({ items: [result, ...s.items] }));
        return result;
      } catch (error) {
        // logger.error('[useHarvestStore] 添加采收失败:', error);
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        const result = await harvestService.updateHarvestRecord(id, updates);
        if (result) set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...updates } : i) }));
        return result;
      } catch (error) {
        // logger.error('[useHarvestStore] 更新采收失败:', error);
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        const result = await harvestService.deleteHarvestRecord(id);
        if (result) set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        return result;
      } catch (error) {
        // logger.error('[useHarvestStore] 删除采收失败:', error);
        return false;
      }
    },

    deleteItems: async (ids) => {
      try {
        const result = await harvestService.deleteHarvestRecords(ids);
        if (result) set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }));
        return result;
      } catch (error) {
        // logger.error('[useHarvestStore] 批量删除采收失败:', error);
        return false;
      }
    },
  })
);
