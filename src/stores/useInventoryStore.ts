/**
 * 库存 Store（V3.0 纯 API）
 *
 * 数据流：组件 → Store → enhancedApiClient → 后端 Express → SQLite
 * 业务直连 API，无任何缓存层（V2.1 铁律）
 *
 * 跨页刷新机制：
 * - 任何"写"操作（inbound / outbound / freeze）成功后调用 notifyChange()
 * - InventoryV3 等只读页面订阅 version 变化自动 reload
 */

import { create } from 'zustand';
import { logger } from '../lib/logger';
import {
  getInventoryList,
  getInventoryStats,
  searchInventoryByCropName,
} from '../services/inventoryService';
import {
  InventoryStock,
  InventoryStats,
  StockType,
  InventoryStatus,
  SourceType,
} from '../types/inventory';

interface InventoryFilters {
  stockType?: StockType | '';
  status?: InventoryStatus | '';
  sourceType?: SourceType | '';
  cropName?: string;
}

interface InventoryState {
  // 数据
  items: InventoryStock[];
  stats: InventoryStats | null;
  loading: boolean;
  error: string | null;

  // 过滤
  filters: InventoryFilters;

  // 变更版本（用于跨页刷新）
  version: number;

  // 方法
  setFilters: (filters: InventoryFilters) => void;
  loadItems: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadAll: () => Promise<void>;
  searchByCrop: (cropName: string) => Promise<void>;
  /** 通知一次变更（写操作成功后调用） */
  notifyChange: () => void;
  /** 重置 store */
  reset: () => void;
  /**
   * 2026-06-04 V2.1 铁律改造：批量删除（写操作走 Store action）
   * 薄包装 inventoryService.deleteInventoryBatch，写后 notifyChange 跨页刷新
   */
  deleteBatch: (ids: string[]) => Promise<{ success: boolean; deletedCount: number; error?: string }>;
}

export const useInventoryStore = create<InventoryState>()((set, get) => ({
  items: [],
  stats: null,
  loading: false,
  error: null,
  filters: {},
  version: 0,

  setFilters: (filters) => set({ filters }),

  loadItems: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const data = await getInventoryList({
        stockType: filters.stockType || undefined,
        status: filters.status || undefined,
        sourceType: filters.sourceType || undefined,
        cropName: filters.cropName || undefined,
      });
      set({ items: data, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载库存失败', loading: false });
    }
  },

  loadStats: async () => {
    try {
      const data = await getInventoryStats();
      set({ stats: data });
    } catch (error) {
      logger.error('[useInventoryStore] 加载统计失败', error);
    }
  },

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const [items, stats] = await Promise.all([
        getInventoryList({
          stockType: filters.stockType || undefined,
          status: filters.status || undefined,
          sourceType: filters.sourceType || undefined,
          cropName: filters.cropName || undefined,
        }),
        getInventoryStats(),
      ]);
      set({ items, stats, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载库存失败', loading: false });
    }
  },

  searchByCrop: async (cropName: string) => {
    set({ loading: true, error: null });
    try {
      const data = await searchInventoryByCropName(cropName);
      // 把 product/seed/seedling 三种类型的库存合并到 items
      const items: InventoryStock[] = [
        ...(data.product as unknown as InventoryStock[]),
        ...(data.seed as unknown as InventoryStock[]),
        ...(data.seedling as unknown as InventoryStock[]),
      ];
      set({ items, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '按作物查询失败', loading: false });
    }
  },

  notifyChange: () => {
    set((s) => ({ version: s.version + 1 }));
  },

  reset: () => {
    set({ items: [], stats: null, loading: false, error: null, filters: {}, version: 0 });
  },

  deleteBatch: async (ids) => {
    const { deleteInventoryBatch: svc } = await import('../services/inventoryService');
    const result = await svc(ids);
    if (result.success) {
      get().notifyChange();
      // 立即从 items 移除被删项（乐观更新）
      set((s) => ({ items: s.items.filter(it => !ids.includes(it.instanceId)) }));
    }
    return result;
  },
}));
