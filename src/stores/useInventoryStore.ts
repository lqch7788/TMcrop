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
} from '../services/inventoryService';
import {
  InventoryStock,
  InventoryStats,
  StockType,
  InventoryStatus,
  SourceType,
} from '../types/inventory';

export interface InventoryFilters {
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
  loadItems: (filters?: InventoryFilters) => Promise<void>;
  loadStats: () => Promise<void>;
  loadAll: (filters?: InventoryFilters) => Promise<void>;
  /** 通知一次变更（写操作成功后调用） */
  notifyChange: () => void;
  /** 重置 store */
  reset: () => void;
  /**
   * 2026-06-04 V2.1 铁律改造：批量删除（写操作走 Store action）
   * 薄包装 inventoryService.deleteInventoryBatch，写后 notifyChange 跨页刷新
   */
  // 2026-07-10 P1-3 bugfix：返回类型补 blockingTransactions/blocked（让 InventoryV3 类型安全访问）
  deleteBatch: (ids: string[]) => Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
    blockingTransactions?: { txId?: string; txType?: string; txTypeLabel?: string; businessCode?: string; qty?: number; operatorName?: string; operateDate?: string }[];
    blocked?: { stockId: string; blockingTransactions?: { txId?: string; txType?: string; txTypeLabel?: string; businessCode?: string; qty?: number; operatorName?: string; operateDate?: string }[] }[];
  }>;
}

export const useInventoryStore = create<InventoryState>()((set, get) => ({
  items: [],
  stats: null,
  loading: false,
  error: null,
  filters: {},
  version: 0,

  setFilters: (filters) => set({ filters }),

  loadItems: async (filters) => {
    set({ loading: true, error: null });
    try {
      const activeFilter = filters || get().filters;
      const data = await getInventoryList({
        stockType: activeFilter.stockType || undefined,
        status: activeFilter.status || undefined,
        sourceType: activeFilter.sourceType || undefined,
        cropName: activeFilter.cropName || undefined,
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

  loadAll: async (filters) => {
    set({ loading: true, error: null });
    try {
      const activeFilter = filters || get().filters;
      const [items, stats] = await Promise.all([
        getInventoryList({
          stockType: activeFilter.stockType || undefined,
          status: activeFilter.status || undefined,
          sourceType: activeFilter.sourceType || undefined,
          cropName: activeFilter.cropName || undefined,
        }),
        getInventoryStats(),
      ]);
      set({ items, stats, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载库存失败', loading: false });
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
