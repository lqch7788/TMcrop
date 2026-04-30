/**
 * 仓库 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IWarehouseService } from '../interfaces';
import { nowString, generateId } from './utils';

const WAREHOUSES_TABLE = db.warehouses;

export async function initWarehouses(): Promise<Warehouse[]> {
  const count = await WAREHOUSES_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultWarehouses();
    if (defaults.length > 0) {
      await WAREHOUSES_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return WAREHOUSES_TABLE.toArray();
}

export async function getWarehouses(): Promise<Warehouse[]> {
  return WAREHOUSES_TABLE.toArray();
}

export async function getWarehouseById(id: string): Promise<Warehouse | undefined> {
  return WAREHOUSES_TABLE.get(id);
}

export async function addWarehouse(
  item: Omit<Warehouse, 'id' | 'createTime' | 'updateTime'>
): Promise<Warehouse> {
  const now = nowString();
  const newItem: Warehouse = { ...item, id: generateId('WA'), createTime: now, updateTime: now };
  await WAREHOUSES_TABLE.add(newItem);
  return newItem;
}

export async function updateWarehouse(id: string, updates: Partial<Warehouse>): Promise<Warehouse | null> {
  const existing = await WAREHOUSES_TABLE.get(id);
  if (!existing) return null;
  const updated: Warehouse = { ...existing, ...updates, id, updateTime: nowString() };
  await WAREHOUSES_TABLE.put(updated);
  return updated;
}

export async function deleteWarehouse(id: string): Promise<boolean> {
  const existing = await WAREHOUSES_TABLE.get(id);
  if (!existing) return false;
  await WAREHOUSES_TABLE.delete(id);
  return true;
}

export async function deleteWarehouses(ids: string[]): Promise<boolean> {
  await WAREHOUSES_TABLE.bulkDelete(ids);
  return true;
}

export async function resetWarehouses(): Promise<void> {
  await WAREHOUSES_TABLE.clear();
}

function getDefaultWarehouses(): Warehouse[] {
  return [];
}
