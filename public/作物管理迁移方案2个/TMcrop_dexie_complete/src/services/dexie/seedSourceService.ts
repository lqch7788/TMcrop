/**
 * 种源 Service - Dexie.js 实现（第三种存储方案）
 * 基于 IndexedDB，纯前端持久化，适用于演示版/原型阶段
 */

import { db } from './db';
import { ISeedSourceService } from '../interfaces';
import { SeedSource, StockStatus } from '@/types/crop';
import { nowString, generateId } from './utils';

const TABLE = db.seedSources;

/**
 * 初始化种源数据（Dexie.js 版本）
 * 如果表为空，自动导入 cropData.ts 的默认数据
 */
export async function initSeedSources(): Promise<SeedSource[]> {
  const count = await TABLE.count();
  if (count === 0) {
    const { seedSources } = await import('@/data/cropData');
    await TABLE.bulkAdd(seedSources);
    return seedSources;
  }
  return TABLE.toArray();
}

export async function getSeedSources(): Promise<SeedSource[]> {
  return TABLE.toArray();
}

export async function getSeedSourceById(id: string): Promise<SeedSource | undefined> {
  return TABLE.get(id);
}

export async function getSeedSourcesByIds(ids: string[]): Promise<SeedSource[]> {
  return TABLE.where('id').anyOf(ids).toArray();
}

export async function addSeedSource(
  source: Omit<SeedSource, 'id' | 'createTime' | 'updateTime'>
): Promise<SeedSource> {
  const now = nowString();
  const newSource: SeedSource = {
    ...source,
    id: generateId('SS'),
    createTime: now,
    updateTime: now,
  };
  await TABLE.add(newSource);
  return newSource;
}

export async function updateSeedSource(id: string, updates: Partial<SeedSource>): Promise<SeedSource | null> {
  const existing = await TABLE.get(id);
  if (!existing) return null;

  const updated: SeedSource = {
    ...existing,
    ...updates,
    id, // 强制保留原ID
    updateTime: nowString(),
  };
  await TABLE.put(updated);
  return updated;
}

export async function deleteSeedSource(id: string): Promise<boolean> {
  const existing = await TABLE.get(id);
  if (!existing) return false;
  await TABLE.delete(id);
  return true;
}

export async function deleteSeedSources(ids: string[]): Promise<boolean> {
  await TABLE.bulkDelete(ids);
  return true;
}

export async function decreaseAvailableCount(id: string, count: number): Promise<boolean> {
  const source = await TABLE.get(id);
  if (!source) return false;

  const newAvailable = source.availableCount - count;
  if (newAvailable < 0) return false;

  let newStatus = source.status;
  if (newAvailable === 0) {
    newStatus = StockStatus.DEPLETED;
  } else if (newAvailable < source.initialCount * 0.2) {
    newStatus = StockStatus.LOW;
  }

  await TABLE.update(id, {
    availableCount: newAvailable,
    status: newStatus,
    updateTime: nowString(),
  });
  return true;
}

export async function resetSeedSources(): Promise<void> {
  await TABLE.clear();
}

export async function getTodayMaxSeedCodeSerial(dateStr: string): Promise<number> {
  const sources = await TABLE.where('seedCode').startsWith('ZZ' + dateStr + '-').toArray();
  let maxSerial = 0;

  for (const source of sources) {
    if (source.seedCode && source.seedCode.startsWith('ZZ' + dateStr + '-')) {
      const serialStr = source.seedCode.substring(11);
      const serial = parseInt(serialStr, 10);
      if (!isNaN(serial) && serial > maxSerial) {
        maxSerial = serial;
      }
    }
  }

  return maxSerial;
}

export async function generateSeedCode(dateStr: string): Promise<string> {
  const maxSerial = await getTodayMaxSeedCodeSerial(dateStr);
  const newSerial = maxSerial + 1;
  return `ZZ${dateStr}-${String(newSerial).padStart(3, '0')}`;
}
