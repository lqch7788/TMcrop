/**
 * 订单状态 Store - Zustand 替代 useOrderStore (localStorage + CustomEvent)
 * 用于审批联动：审批通过后更新订单状态为已确认
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OrderStatusUpdate {
  orderId: string;
  status: 'draft' | 'pending' | 'confirmed' | 'fulfilled' | 'cancelled' | 'rejected';
  updatedAt: string;
  updatedBy?: string;
}

export interface Order {
  id: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'draft' | 'pending' | 'confirmed' | 'fulfilled' | 'cancelled' | 'rejected';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  items: OrderItem[];
  remark?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

interface OrderStore {
  statusUpdates: Record<string, OrderStatusUpdate>;
  updateOrderStatus: (orderId: string, status: OrderStatusUpdate['status'], updatedBy?: string) => void;
  getOrderWithStatus: (order: Order) => Order;
  getStatusUpdates: () => Record<string, OrderStatusUpdate>;
  clearAllUpdates: () => void;
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      statusUpdates: {},

      updateOrderStatus: (orderId, status, updatedBy) => {
        const update: OrderStatusUpdate = {
          orderId,
          status,
          updatedAt: new Date().toISOString(),
          updatedBy,
        };
        set((state) => ({
          statusUpdates: { ...state.statusUpdates, [orderId]: update },
        }));
      },

      getOrderWithStatus: (order) => {
        const update = get().statusUpdates[order.id];
        return update ? { ...order, status: update.status } : order;
      },

      getStatusUpdates: () => get().statusUpdates,

      clearAllUpdates: () => set({ statusUpdates: {} }),
    }),
    {
      name: 'order_status_updates',
    }
  )
);
