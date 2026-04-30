/**
 * 库存产品 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IInventoryService } from '../interfaces';
import { nowString, generateId } from './utils';

const PRODUCEINVENTORIES_TABLE = db.produceInventories;

export async function initProduceInventorys(): Promise<ProduceInventory[]> {
  const count = await PRODUCEINVENTORIES_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultProduceInventorys();
    if (defaults.length > 0) {
      await PRODUCEINVENTORIES_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return PRODUCEINVENTORIES_TABLE.toArray();
}

export async function getProduceInventorys(): Promise<ProduceInventory[]> {
  return PRODUCEINVENTORIES_TABLE.toArray();
}

export async function getProduceInventoryById(id: string): Promise<ProduceInventory | undefined> {
  return PRODUCEINVENTORIES_TABLE.get(id);
}

export async function addProduceInventory(
  item: Omit<ProduceInventory, 'id' | 'createTime' | 'updateTime'>
): Promise<ProduceInventory> {
  const now = nowString();
  const newItem: ProduceInventory = { ...item, id: generateId('PR'), createTime: now, updateTime: now };
  await PRODUCEINVENTORIES_TABLE.add(newItem);
  return newItem;
}

export async function updateProduceInventory(id: string, updates: Partial<ProduceInventory>): Promise<ProduceInventory | null> {
  const existing = await PRODUCEINVENTORIES_TABLE.get(id);
  if (!existing) return null;
  const updated: ProduceInventory = { ...existing, ...updates, id, updateTime: nowString() };
  await PRODUCEINVENTORIES_TABLE.put(updated);
  return updated;
}

export async function deleteProduceInventory(id: string): Promise<boolean> {
  const existing = await PRODUCEINVENTORIES_TABLE.get(id);
  if (!existing) return false;
  await PRODUCEINVENTORIES_TABLE.delete(id);
  return true;
}

export async function deleteProduceInventorys(ids: string[]): Promise<boolean> {
  await PRODUCEINVENTORIES_TABLE.bulkDelete(ids);
  return true;
}

export async function resetProduceInventorys(): Promise<void> {
  await PRODUCEINVENTORIES_TABLE.clear();
}

function getDefaultProduceInventorys(): ProduceInventory[] {
  return [];
}
