/**
 * 库存交易记录 Zustand Store (V2.1 架构)
 * 数据流：enhancedApiClient → /api/inventory-transactions → SQLite
 *
 * 2026-06-04 V2.1 铁律改造（库存管理）：
 * OutboundRecordsPage 持久化数据（rows / total / summary）从 useState 迁到 Store
 *
 * 一次性动作（CSV / XLSX / PDF 导出）保留直调 service，不入 Store
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
import { logger } from '../lib/logger';

export interface OutboundRow {
  // 主键
  id: string;
  instanceId?: string;
  // 类型/状态
  stockType?: string;
  transactionType?: string;
  type?: string;
  status?: string;
  // 数量
  quantity: number;
  quantityOut: number;
  balanceBefore: number;
  balanceAfter: number;
  unit?: string;
  // 业务
  businessId?: string;
  businessType?: string;
  businessCode?: string;
  // 操作
  operatorId?: string;
  operatorName?: string;
  operatorDate?: string;
  outboundDate?: string;
  createdAt: string;
  // 关联信息（后端 LEFT JOIN）
  cropId?: string;
  cropName?: string;
  varietyId?: string;
  varietyName?: string;
  cropCode?: string;
  warehouseId?: string;
  warehouseName?: string;
  greenhouseName?: string;
  plantingMode?: string;
  grade?: string;
  // 备注/其他
  remarks?: string;
  receiver?: string;
  unitPrice?: number;
  totalAmount?: number;
  updatedAt?: string;
}

/** 库存出库统计汇总 — 2026-07-15 移除 [key: string]: any 索引签名 */
export interface OutboundSummary {
  totalQuantity: number;
  totalAmount: number;
  count: number;
  /** 兼容字段（OutboundRecordsComponents 使用 — 2026-06-30 tsc 兼容） */
  totalCount?: number;
  todayCount?: number;
  byStockType?: Record<string, { count: number; quantity: number }>;
  byHour?: Record<string, { count: number; quantity: number }>;
}

export interface OutboundQuery {
  from?: string;
  to?: string;
  cropName?: string;
  warehouseId?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface OutboundListResult {
  rows: OutboundRow[];
  total: number;
  summary: OutboundSummary;
}

interface InventoryTransactionState {
  rows: OutboundRow[];
  total: number;
  summary: OutboundSummary | null;
  loading: boolean;
  error: string | null;
  query: OutboundQuery;

  setQuery: (q: Partial<OutboundQuery>) => void;
  loadOutbound: (q?: Partial<OutboundQuery>) => Promise<void>;
  addTransaction: (payload: Partial<OutboundRow>) => Promise<OutboundRow | null>;
  deleteTransaction: (id: string) => Promise<boolean>;
  /** 批量删除（V2.1 铁律：写操作走 Store action，自动 notifyChange 跨页刷新） */
  deleteTransactions: (ids: string[]) => Promise<{ success: boolean; deletedCount: number; error?: string }>;
}

export const useInventoryTransactionStore = create<InventoryTransactionState>()((set, get) => ({
  rows: [],
  total: 0,
  summary: null,
  loading: false,
  error: null,
  query: { page: 1, limit: 50 },

  setQuery: (q) => {
    set((s) => ({ query: { ...s.query, ...q } }));
  },

  loadOutbound: async (q) => {
    const mergedQuery = { ...get().query, ...(q || {}) };
    set({ loading: true, error: null, query: mergedQuery });
    try {
      // 2026-06-04 紧急修复：enhancedApiClient.get 不支持 params（options 只有 retryCount），
      // 必须手拼 query string 到 URL，否则后端 service 收到无 from/to 抛 500
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(mergedQuery)) {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
      }
      const qs = params.toString();
      const url = qs ? `/inventory/transactions?${qs}` : '/inventory/transactions';
      const data = await enhancedApiClient.get<OutboundListResult>(url);
      set({
        rows: data?.rows || [],
        total: data?.total || 0,
        summary: data?.summary || null,
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addTransaction: async (payload): Promise<OutboundRow> => {
    // 2026-06-08 修复：V2.1 铁律 Fail Loud
    // 旧实现 `catch { return null; }` 把真实错误吞了，OutboundModal 拿到 null 只显示"Store action 返回 null"，
    // 真实原因（400 参数错误 / 409 乐观锁冲突 / 500 NOT NULL 约束 / 网络超时）全部丢失，调试极困难。
    // 新实现：把错误向上抛，由 OutboundModal 的 try/catch 显示真实 message。
    try {
      const result = await enhancedApiClient.post<OutboundRow>('/inventory-transactions', payload);
      if (result) {
        set((s) => ({ rows: [result, ...s.rows], total: s.total + 1 }));
        // 2026-06-04 V2.1 铁律：写后跨页刷新（订阅 useInventoryStore.version 的页面会自动 reload）
        // 动态 import 避免循环依赖
        const { useInventoryStore } = await import('./useInventoryStore');
        useInventoryStore.getState().notifyChange();
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('[useInventoryTransactionStore.addTransaction] 出库失败', err);
      throw new Error(message);
    }
  },

  deleteTransaction: async (id) => {
    try {
      await enhancedApiClient.delete(`/inventory-transactions/${id}`);
      set((s) => ({ rows: s.rows.filter(r => r.id !== id), total: Math.max(0, s.total - 1) }));
      return true;
    } catch (err) {
      // 2026-07-15：改成 throw true message（与 addTransaction 风格一致），不再吞错返回 false
      const message = err instanceof Error ? err.message : String(err);
      logger.error('[useInventoryTransactionStore.deleteTransaction] 删除失败', err);
      throw new Error(message);
    }
  },

  deleteTransactions: async (ids) => {
    if (!ids || ids.length === 0) {
      return { success: false, deletedCount: 0, error: '未选择任何记录' };
    }
    let deletedCount = 0;
    let lastError: string | undefined;
    // 逐条调用 DELETE（与 OutboundModal 写操作风格一致——单条 API 而非批量 API，简单清晰）
    for (const id of ids) {
      try {
        await enhancedApiClient.delete(`/inventory-transactions/${id}`);
        deletedCount++;
      } catch (err) {
        lastError = err instanceof Error ? err.message : `删除 ${id} 失败`;
      }
    }
    if (deletedCount > 0) {
      set((s) => ({
        rows: s.rows.filter(r => !ids.includes(r.id)),
        total: Math.max(0, s.total - deletedCount),
      }));
      // 2026-06-04 V2.1 铁律：写后跨页刷新
      const { useInventoryStore } = await import('./useInventoryStore');
      useInventoryStore.getState().notifyChange();
    }
    return deletedCount > 0
      ? { success: true, deletedCount }
      : { success: false, deletedCount: 0, error: lastError };
  },
}));
