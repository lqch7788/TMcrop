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
import {
  getInventoryList,
} from '../services/inventoryService';
import {
  InventoryStock,
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
  loading: boolean;
  error: string | null;

  // 变更版本（用于跨页刷新）
  version: number;

  // 方法
  // 2026-10-10 死代码清理：删除 setFilters / loadItems / fetchItems / loadStats / reset 五个零消费 action
  // （筛选已改为页面客户端过滤，store 不再承担筛选；stats 无任何消费方，loadAll 也不再请求）
  loadAll: (filters?: InventoryFilters) => Promise<void>;
  /** 通知一次变更（写操作成功后调用） */
  notifyChange: () => void;
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
  /**
   * 2026-07-28 审核 H-4：编辑库存（写操作走 Store action，符合 V2.1 铁律）
   * 写后 notifyChange 跨页刷新
   */
  updateItem: (
    instanceId: string,
    updates: Record<string, unknown>,
  ) => Promise<{ success: boolean; error?: string }>;
}

export const useInventoryStore = create<InventoryState>()((set, get) => ({
  items: [],
  loading: false,
  error: null,
  version: 0,

  loadAll: async (filters) => {
    set({ loading: true, error: null });
    try {
      const activeFilter = filters || {};
      const items = await getInventoryList({
        stockType: activeFilter.stockType || undefined,
        status: activeFilter.status || undefined,
        sourceType: activeFilter.sourceType || undefined,
        cropName: activeFilter.cropName || undefined,
      });
      set({ items, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载库存失败', loading: false });
    }
  },

  notifyChange: () => {
    set((s) => ({ version: s.version + 1 }));
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

  // 2026-07-28 审核 H-4：编辑库存走 Store action
  updateItem: async (instanceId, updates) => {
    try {
      const { updateInventory: svc } = await import('../services/apiInventoryService');
      // 2026-10-10：service 失败改为抛出 → 由下方 catch 透出后端真实错误信息
      await svc(instanceId, updates as any);
      get().notifyChange();
      // 2026-10-10 清理：删除原"乐观 merge"——updates 是 snake_case，merge 进 camelCase item 会
      // 产生 current_quantity/instanceId 混键的脏对象；notifyChange 已触发全量 reload（权威数据源）
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      set({ error: msg });
      return { success: false, error: msg };
    }
  },
}));
