/**
 * 作物订单数据服务
 * 使用 localStorage 实现数据持久化
 * 核心功能：管理作物订单和实例的关联
 */

import { CropOrder, CropOrderStatus } from '../types/crop';

const STORAGE_KEY = 'crop_orders';
const LOCK_KEY = 'crop_orders_lock';

/**
 * 获取锁（使用 localStorage 事件监听实现简单并发控制）
 */
function acquireLock(): boolean {
  const lockValue = localStorage.getItem(LOCK_KEY);
  if (lockValue === null) {
    localStorage.setItem(LOCK_KEY, Date.now().toString());
    return true;
  }
  // 如果锁已存在超过5秒，认为锁已失效
  if (Date.now() - parseInt(lockValue) > 5000) {
    localStorage.setItem(LOCK_KEY, Date.now().toString());
    return true;
  }
  return false;
}

/**
 * 释放锁
 */
function releaseLock(): void {
  localStorage.removeItem(LOCK_KEY);
}

/**
 * 带锁的 localStorage 写操作
 */
function writeData(data: CropOrder[]): void {
  let retries = 3;
  while (retries > 0) {
    if (acquireLock()) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return;
      } finally {
        releaseLock();
      }
    }
    // 等待一小段时间后重试
    const start = Date.now();
    while (Date.now() - start < 50) {} // 简单等待
    retries--;
  }
  // 最后尝试直接写入
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * 生成订单编号
 * 格式: DD + 年月日时分秒(14位) + 流水号(3位)
 * 示例: DD20260505123045001
 */
function generateOrderCode(): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const timestampStr = `${year}${month}${day}${hours}${minutes}${seconds}`;

  // 获取当日同秒订单流水号
  const existingOrders = getOrders().filter(order => {
    // 新格式: DD + 年月日时分秒(14位) + 3位流水号
    const orderTimestamp = order.orderCode.slice(2, 16);
    return orderTimestamp === timestampStr;
  });

  const seq = existingOrders.length + 1;
  const seqStr = String(seq).padStart(3, '0');

  return `DD${timestampStr}${seqStr}`;
}

/**
 * 初始化默认数据
 */
const defaultData: CropOrder[] = [];

/**
 * 统一的数据读取函数 - 从localStorage读取并解析
 */
function getStoredData(): CropOrder[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('订单数据解析失败:', error);
      return defaultData;
    }
  }
  return defaultData;
}

/**
 * 初始化数据 - 从localStorage读取或使用默认数据
 */
export function initOrders(): CropOrder[] {
  const data = getStoredData();
  if (data.length === 0 && localStorage.getItem(STORAGE_KEY) === null) {
    writeData(defaultData);
  }
  return data.length > 0 ? data : defaultData;
}

/**
 * 获取所有订单
 */
export function getOrders(): CropOrder[] {
  return getStoredData();
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
  writeData(orders);
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
  writeData(orders);
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
  writeData(orders);
  return true;
}

/**
 * 批量删除订单
 */
export function deleteOrders(ids: string[]): boolean {
  const orders = getOrders();
  const filtered = orders.filter(order => !ids.includes(order.id));
  if (filtered.length === orders.length) return false;

  writeData(filtered);
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
  writeData(defaultData);
}
