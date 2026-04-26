/**
 * 作物订单数据服务
 * 使用 localStorage 实现数据持久化
 * 核心功能：管理作物订单和实例的关联
 */

import { CropOrder, CropOrderStatus } from '../types/crop';

const STORAGE_KEY = 'crop_orders';

/**
 * 生成订单编号
 * 格式: DD + 年月日(8位) + 流水号(3位)
 * 示例: DD20240426001
 */
function generateOrderCode(): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // 获取当日订单流水号
  const existingOrders = getOrders().filter(order => {
    const orderDate = order.orderCode.slice(2, 10);
    return orderDate === dateStr;
  });

  const seq = existingOrders.length + 1;
  const seqStr = String(seq).padStart(3, '0');

  return `DD${dateStr}${seqStr}`;
}

/**
 * 初始化默认数据
 */
const defaultData: CropOrder[] = [];

/**
 * 初始化数据 - 从localStorage读取或使用默认数据
 */
export function initOrders(): CropOrder[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultData;
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  return defaultData;
}

/**
 * 获取所有订单
 */
export function getOrders(): CropOrder[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultData;
    }
  }
  return initOrders();
}

/**
 * 根据ID获取单个订单
 */
export function getOrderById(id: string): CropOrder | undefined {
  const orders = getOrders();
  return orders.find(order => order.id === id);
}

/**
 * 根据ID数组获取多个订单
 */
export function getOrdersByIds(ids: string[]): CropOrder[] {
  const orders = getOrders();
  return orders.filter(order => ids.includes(order.id));
}

/**
 * 创建订单
 */
export function createOrder(
  orderData: Omit<CropOrder, 'id' | 'orderCode' | 'createTime' | 'updateTime'>
): CropOrder {
  const orders = getOrders();
  const orderCode = generateOrderCode();
  const now = new Date().toLocaleString('zh-CN');

  const newOrder: CropOrder = {
    ...orderData,
    id: 'CO' + Date.now(),
    orderCode,
    instanceIds: orderData.instanceIds || [],
    createTime: now,
    updateTime: now,
  };

  orders.push(newOrder);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  return newOrder;
}

/**
 * 更新订单
 */
export function updateOrder(id: string, updates: Partial<CropOrder>): CropOrder | null {
  const orders = getOrders();
  const index = orders.findIndex(order => order.id === id);
  if (index === -1) return null;

  orders[index] = {
    ...orders[index],
    ...updates,
    updateTime: new Date().toLocaleString('zh-CN'),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  return orders[index];
}

/**
 * 删除订单
 */
export function deleteOrder(id: string): boolean {
  const orders = getOrders();
  const index = orders.findIndex(order => order.id === id);
  if (index === -1) return false;

  orders.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  return true;
}

/**
 * 批量删除订单
 */
export function deleteOrders(ids: string[]): boolean {
  const orders = getOrders();
  const filtered = orders.filter(order => !ids.includes(order.id));
  if (filtered.length === orders.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * 关联实例到订单
 */
export function linkInstances(orderId: string, instanceIds: string[]): boolean {
  const order = getOrderById(orderId);
  if (!order) return false;

  const newInstanceIds = [...new Set([...order.instanceIds, ...instanceIds])];
  updateOrder(orderId, { instanceIds: newInstanceIds });
  return true;
}

/**
 * 从订单取消关联实例
 */
export function unlinkInstances(orderId: string, instanceIds: string[]): boolean {
  const order = getOrderById(orderId);
  if (!order) return false;

  const newInstanceIds = order.instanceIds.filter(id => !instanceIds.includes(id));
  updateOrder(orderId, { instanceIds: newInstanceIds });
  return true;
}

/**
 * 更新订单状态
 */
export function updateOrderStatus(id: string, status: CropOrderStatus): boolean {
  const order = getOrderById(id);
  if (!order) return false;

  updateOrder(id, { status });
  return true;
}

/**
 * 获取订单详情（含关联实例）
 */
export function getOrderDetail(id: string): (CropOrder & { instances: string[] }) | null {
  const order = getOrderById(id);
  if (!order) return null;

  return {
    ...order,
    instances: order.instanceIds,
  };
}

/**
 * 重置数据到默认状态
 */
export function resetOrders(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
}
