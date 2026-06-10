/**
 * 订单数据 Zustand Store (V2.1 架构)
 * 管理订单的完整 CRUD 数据流
 *
 * 数据流：API → enhancedApiClient（无缓存）→ Store → 页面组件
 * - L1：Store 内存数据
 * - L2：（未使用）无 API
 * - L3：（未使用）订单管理页面不读取 localStorage
 */
import { create } from 'zustand';
import type { CropOrder, CropOrderFilters, CropOrderStatus } from '../types/crop';
import * as orderService from '../services/apiCropOrderService';
import { todayLocal } from '../lib/dateUtils';

interface OrderStats {
  total: number;
  inProgress: number;
  completed: number;
  thisMonth: number;
}

interface OrderDataState {
  // 数据
  orders: CropOrder[];
  isLoading: boolean;
  error: string | null;
  stats: OrderStats | null;

  // 错误清理
  /** 手动清空 error 状态（由页面在 toast 后调用） */
  clearError: () => void;

  // Actions
  fetchOrders: () => Promise<void>;
  fetchStats: () => Promise<void>;
  addOrder: (data: Omit<CropOrder, 'id' | 'orderCode' | 'createTime' | 'updateTime'>) => Promise<CropOrder>;
  updateOrder: (id: string, updates: Partial<CropOrder>) => Promise<CropOrder | null>;
  deleteOrder: (id: string) => Promise<boolean>;
  deleteOrders: (ids: string[]) => Promise<boolean>;
  syncPending: () => Promise<{ success: number; failed: number }>;
}

export const useOrderDataStore = create<OrderDataState>()(
  (set, get) => ({
      orders: [],
      isLoading: false,
      error: null,
      stats: null,

      clearError: () => set({ error: null }),

      fetchOrders: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await orderService.getOrders();
          set({ orders: data || [], isLoading: false });
        } catch (error) {
          // logger.error('[useOrderDataStore] 获取订单失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      fetchStats: async () => {
        try {
          const stats = await orderService.getOrderStats();
          if (stats) {
            set({ stats });
          }
        } catch (error) {
          // [M-4] 2026-06-06 修复：catch 之前只注释不 set，导致统计失败时 UI 无任何反馈；
          // 现写入 error 状态，由 OrderPage 的 toast 监听统一弹错误
          console.warn('[useOrderDataStore] 获取统计失败:', error);
          set({ error: (error as Error).message });
        }
      },

      addOrder: async (data) => {
        const newOrder = await orderService.createOrder(data);
        set((state) => ({ orders: [newOrder, ...state.orders] }));
        return newOrder;
      },

      updateOrder: async (id, updates) => {
        const result = await orderService.updateOrder(id, updates);
        if (result) {
          set((state) => ({
            orders: state.orders.map((o) => (o.id === id ? { ...o, ...updates, updateTime: todayLocal() } : o)),
          }));
        }
        return result;
      },

      deleteOrder: async (id) => {
        const result = await orderService.deleteOrder(id);
        if (result) {
          set((state) => ({ orders: state.orders.filter((o) => o.id !== id) }));
        }
        return result;
      },

      deleteOrders: async (ids) => {
        const result = await orderService.deleteOrders(ids);
        if (result) {
          set((state) => ({ orders: state.orders.filter((o) => !ids.includes(o.id)) }));
        }
        return result;
      },

      syncPending: async () => {
        return await orderService.syncPendingOrders();
      },
    })
);
