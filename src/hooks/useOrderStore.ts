// ============================================================
// 订单状态管理Store
// 文件路径：src/hooks/useOrderStore.ts
// 用于审批联动：审批通过后更新订单状态为已确认
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'order_status_updates';

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

function getStatusUpdates(): Record<string, OrderStatusUpdate> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveStatusUpdate(update: OrderStatusUpdate): void {
  const updates = getStatusUpdates();
  updates[update.orderId] = update;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
}

export function updateOrderStatus(
  orderId: string,
  status: OrderStatusUpdate['status'],
  updatedBy?: string
): void {
  const update: OrderStatusUpdate = {
    orderId,
    status,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  saveStatusUpdate(update);
  window.dispatchEvent(new CustomEvent('orderStatusChanged', {
    detail: { orderId, status }
  }));
}

export function getOrderWithStatus(order: Order): Order {
  const updates = getStatusUpdates();
  const update = updates[order.id];
  if (update) {
    return { ...order, status: update.status };
  }
  return order;
}

export function useOrderStore() {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    const handleChange = () => refresh();
    window.addEventListener('orderStatusChanged', handleChange);
    return () => window.removeEventListener('orderStatusChanged', handleChange);
  }, [refresh]);

  return {
    updateOrderStatus,
    getOrderWithStatus,
    getStatusUpdates,
    refresh,
    refreshKey,
  };
}
