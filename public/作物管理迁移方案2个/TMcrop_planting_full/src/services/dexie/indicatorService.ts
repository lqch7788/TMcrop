/**
 * 管理指标 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IIndicatorService } from '../interfaces';
import { nowString, generateId } from './utils';

const INDICATORS_TABLE = db.indicators;

export async function initIndicators(): Promise<Indicator[]> {
  const count = await INDICATORS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultIndicators();
    if (defaults.length > 0) {
      await INDICATORS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return INDICATORS_TABLE.toArray();
}

export async function getIndicators(): Promise<Indicator[]> {
  return INDICATORS_TABLE.toArray();
}

export async function getIndicatorById(id: string): Promise<Indicator | undefined> {
  return INDICATORS_TABLE.get(id);
}

export async function addIndicator(
  item: Omit<Indicator, 'id' | 'createTime' | 'updateTime'>
): Promise<Indicator> {
  const now = nowString();
  const newItem: Indicator = { ...item, id: generateId('IN'), createTime: now, updateTime: now };
  await INDICATORS_TABLE.add(newItem);
  return newItem;
}

export async function updateIndicator(id: string, updates: Partial<Indicator>): Promise<Indicator | null> {
  const existing = await INDICATORS_TABLE.get(id);
  if (!existing) return null;
  const updated: Indicator = { ...existing, ...updates, id, updateTime: nowString() };
  await INDICATORS_TABLE.put(updated);
  return updated;
}

export async function deleteIndicator(id: string): Promise<boolean> {
  const existing = await INDICATORS_TABLE.get(id);
  if (!existing) return false;
  await INDICATORS_TABLE.delete(id);
  return true;
}

export async function deleteIndicators(ids: string[]): Promise<boolean> {
  await INDICATORS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetIndicators(): Promise<void> {
  await INDICATORS_TABLE.clear();
}

function getDefaultIndicators(): Indicator[] {
  return [];
}
