/**
 * 作物管理通用回收站 Store（V2.1：纯内存，无持久化）
 */
import { create } from 'zustand';
import * as recycleBinService from '../services/apiRecycleBinService';
import type {
  RecycleBinFilters,
  RecycleBinItem,
  RecycleBinStats,
} from '../types/recycleBin';

interface RecycleBinState {
  items: RecycleBinItem[];
  total: number;
  page: number;
  pageSize: number;
  filters: RecycleBinFilters;
  stats: RecycleBinStats;
  isLoading: boolean;
  error: string | null;

  loadItems: (filters?: RecycleBinFilters) => Promise<void>;
  loadStats: () => Promise<void>;
  restoreItem: (id: string) => Promise<{ warnings?: string[] }>;
  purgeItem: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useRecycleBinStore = create<RecycleBinState>()((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  filters: { page: 1, pageSize: 20 },
  stats: { total: 0, byType: [] },
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  loadItems: async (filters) => {
    const merged: RecycleBinFilters = { ...get().filters, ...filters };
    set({ isLoading: true, error: null, filters: merged });
    try {
      const result = await recycleBinService.getRecycleBinItems(merged);
      set({
        items: result.items,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadStats: async () => {
    try {
      const stats = await recycleBinService.getRecycleBinStats();
      set({ stats });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  restoreItem: async (id) => {
    const result = await recycleBinService.restoreRecycleBinItem(id);
    await get().loadItems();
    await get().loadStats();
    return { warnings: result?.warnings || [] };
  },

  purgeItem: async (id) => {
    await recycleBinService.purgeRecycleBinItem(id);
    await get().loadItems();
    await get().loadStats();
  },
}));
