/**
 * 作物订单 Service - Dexie.js 实现（第三种存储方案）
 * 基于 IndexedDB，纯前端持久化，适用于演示版/原型阶段
 * 核心功能：管理作物订单和实例的关联
 */

import { db } from './db';
import { ICropOrderService } from '../interfaces';
import { CropOrder, CropOrderStatus } from '@/types/crop';
import { nowString, generateId } from './utils';

const TABLE = db.cropOrders;

function generateOrderCode(): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  // 这里返回一个临时值，实际在 createOrder 中异步计算
  return `DD${dateStr}001`;
}

export async function initOrders(): Promise<CropOrder[]> {
  const count = await TABLE.count();
  if (count === 0) {
    return [];
  }
  return TABLE.toArray();
}

export async function getOrders(): Promise<CropOrder[]> {
  return TABLE.toArray();
}

export async function getOrderById(id: string): Promise<CropOrder | undefined> {
  return TABLE.get(id);
}

export async function getOrdersByIds(ids: string[]): Promise<CropOrder[]> {
  return TABLE.where('id').anyOf(ids).toArray();
}

export async function createOrder(
  orderData: Omit<CropOrder, 'id' | 'orderCode' | 'createTime' | 'updateTime'>
): Promise<CropOrder> {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const existingOrders = await TABLE.where('orderCode').startsWith(`DD${dateStr}`).toArray();
  const seq = existingOrders.length + 1;
  const seqStr = String(seq).padStart(3, '0');
  const orderCode = `DD${dateStr}${seqStr}`;

  const timeStr = nowString();
  const newOrder: CropOrder = {
    ...orderData,
    id: generateId('CO'),
    orderCode,
    instanceIds: orderData.instanceIds || [],
    createTime: timeStr,
    updateTime: timeStr,
  };

  await TABLE.add(newOrder);
  return newOrder;
}

export async function updateOrder(id: string, updates: Partial<CropOrder>): Promise<CropOrder | null> {
  const existing = await TABLE.get(id);
  if (!existing) return null;

  const updated: CropOrder = {
    ...existing,
    ...updates,
    id,
    updateTime: nowString(),
  };
  await TABLE.put(updated);
  return updated;
}

export async function deleteOrder(id: string): Promise<boolean> {
  const existing = await TABLE.get(id);
  if (!existing) return false;
  await TABLE.delete(id);
  return true;
}

export async function deleteOrders(ids: string[]): Promise<boolean> {
  await TABLE.bulkDelete(ids);
  return true;
}

export async function linkInstances(orderId: string, instanceIds: string[]): Promise<boolean> {
  const order = await TABLE.get(orderId);
  if (!order) return false;

  const newInstanceIds = [...new Set([...(order.instanceIds || []), ...instanceIds])];
  await TABLE.update(orderId, {
    instanceIds: newInstanceIds,
    updateTime: nowString(),
  });
  return true;
}

export async function unlinkInstances(orderId: string, instanceIds: string[]): Promise<boolean> {
  const order = await TABLE.get(orderId);
  if (!order) return false;

  const newInstanceIds = (order.instanceIds || []).filter(id => !instanceIds.includes(id));
  await TABLE.update(orderId, {
    instanceIds: newInstanceIds,
    updateTime: nowString(),
  });
  return true;
}

export async function updateOrderStatus(id: string, status: CropOrderStatus): Promise<boolean> {
  const order = await TABLE.get(id);
  if (!order) return false;
  await TABLE.update(id, { status, updateTime: nowString() });
  return true;
}

export async function getOrderDetail(id: string): Promise<(CropOrder & { instances: string[] }) | null> {
  const order = await TABLE.get(id);
  if (!order) return null;

  return {
    ...order,
    instances: order.instanceIds || [],
  };
}

export async function resetOrders(): Promise<void> {
  await TABLE.clear();
}
