/**
 * 农事活动 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IFarmActivityService } from '../interfaces';
import { nowString, generateId } from './utils';

const FARMACTIVITIES_TABLE = db.farmActivities;

export async function initFarmActivitys(): Promise<FarmActivity[]> {
  const count = await FARMACTIVITIES_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultFarmActivitys();
    if (defaults.length > 0) {
      await FARMACTIVITIES_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return FARMACTIVITIES_TABLE.toArray();
}

export async function getFarmActivitys(): Promise<FarmActivity[]> {
  return FARMACTIVITIES_TABLE.toArray();
}

export async function getFarmActivityById(id: string): Promise<FarmActivity | undefined> {
  return FARMACTIVITIES_TABLE.get(id);
}

export async function addFarmActivity(
  item: Omit<FarmActivity, 'id' | 'createTime' | 'updateTime'>
): Promise<FarmActivity> {
  const now = nowString();
  const newItem: FarmActivity = { ...item, id: generateId('FA'), createTime: now, updateTime: now };
  await FARMACTIVITIES_TABLE.add(newItem);
  return newItem;
}

export async function updateFarmActivity(id: string, updates: Partial<FarmActivity>): Promise<FarmActivity | null> {
  const existing = await FARMACTIVITIES_TABLE.get(id);
  if (!existing) return null;
  const updated: FarmActivity = { ...existing, ...updates, id, updateTime: nowString() };
  await FARMACTIVITIES_TABLE.put(updated);
  return updated;
}

export async function deleteFarmActivity(id: string): Promise<boolean> {
  const existing = await FARMACTIVITIES_TABLE.get(id);
  if (!existing) return false;
  await FARMACTIVITIES_TABLE.delete(id);
  return true;
}

export async function deleteFarmActivitys(ids: string[]): Promise<boolean> {
  await FARMACTIVITIES_TABLE.bulkDelete(ids);
  return true;
}

export async function resetFarmActivitys(): Promise<void> {
  await FARMACTIVITIES_TABLE.clear();
}

function getDefaultFarmActivitys(): FarmActivity[] {
  return [];
}
