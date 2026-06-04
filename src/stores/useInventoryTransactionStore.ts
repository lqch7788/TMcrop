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

export interface OutboundRow {
  id: string;
  type: string;
  businessId?: string;
  businessCode?: string;
  instanceId?: string;
  cropId?: string;
  cropName?: string;
  varietyId?: string;
  varietyName?: string;
  warehouseId?: string;
  warehouseName?: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  totalAmount?: number;
  receiver?: string;
  operatorId?: string;
  operatorName?: string;
  outboundDate?: string;
  remarks?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OutboundSummary {
  totalQuantity: number;
  totalAmount: number;
  count: number;
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
      const data = await enhancedApiClient.get<OutboundListResult>('/inventory-transactions', { params: mergedQuery });
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

  addTransaction: async (payload) => {
    try {
      const result = await enhancedApiClient.post<OutboundRow>('/inventory-transactions', payload);
      if (result) set((s) => ({ rows: [result, ...s.rows], total: s.total + 1 }));
      return result;
    } catch {
      return null;
    }
  },

  deleteTransaction: async (id) => {
    try {
      await enhancedApiClient.delete(`/inventory-transactions/${id}`);
      set((s) => ({ rows: s.rows.filter(r => r.id !== id), total: Math.max(0, s.total - 1) }));
      return true;
    } catch {
      return false;
    }
  },
}));
