// ============================================================
// 订单状态管理Store
// 文件路径：src/hooks/useOrderStore.ts
// 用于审批联动：审批通过后更新订单状态为已确认
// 已迁移到 Zustand Store (src/stores/useOrderStore.ts)
// 本文件保留用于向后兼容
// ============================================================

import { useOrderStore as useZustandOrderStore } from '../stores/useOrderStore';

export type { OrderStatusUpdate, Order, OrderItem } from '../stores/useOrderStore';

export function useOrderStore() {
  const store = useZustandOrderStore();

  return {
    updateOrderStatus: store.updateOrderStatus,
    getOrderWithStatus: store.getOrderWithStatus,
    getStatusUpdates: store.getStatusUpdates,
    refresh: () => {},
    refreshKey: 0,
  };
}

export { updateOrderStatus, getOrderWithStatus, getStatusUpdates } from '../stores/useOrderStore';
