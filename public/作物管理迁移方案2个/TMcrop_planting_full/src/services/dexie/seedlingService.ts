/**
 * 育苗 Service - Dexie.js 实现（第三种存储方案）
 * 基于 IndexedDB，纯前端持久化，适用于演示版/原型阶段
 * dailyRecords 内嵌在 Seedling 记录中，同时维护独立 dailyRecords 表供查询
 */

import { db } from './db';
import { ISeedlingService } from '../interfaces';
import { Seedling, SeedlingStatus, DailyRecord } from '@/types/crop';
import { nowString, generateId } from './utils';

const TABLE = db.seedlings;
const DR_TABLE = db.dailyRecords;

export async function initSeedlings(): Promise<Seedling[]> {
  const count = await TABLE.count();
  if (count === 0) {
    const { seedlings } = await import('@/data/cropData');
    await TABLE.bulkAdd(seedlings);
    const allDRs = seedlings.flatMap(s => s.dailyRecords || []);
    if (allDRs.length > 0) {
      await DR_TABLE.bulkAdd(allDRs);
    }
    return seedlings;
  }
  return TABLE.toArray();
}

export async function getSeedlings(): Promise<Seedling[]> {
  return TABLE.toArray();
}

export async function getSeedlingById(id: string): Promise<Seedling | undefined> {
  return TABLE.get(id);
}

export async function getSeedlingsByIds(ids: string[]): Promise<Seedling[]> {
  return TABLE.where('id').anyOf(ids).toArray();
}

export async function getSeedlingsBySourceId(sourceId: string): Promise<Seedling[]> {
  return TABLE.where('sourceId').equals(sourceId).toArray();
}

export async function addSeedling(
  seedling: Omit<Seedling, 'id' | 'createTime' | 'updateTime'>
): Promise<Seedling> {
  const now = nowString();
  const newSeedling: Seedling = {
    ...seedling,
    dailyRecords: seedling.dailyRecords || [],
    id: generateId('SD'),
    createTime: now,
    updateTime: now,
  };
  await TABLE.add(newSeedling);

  // 同步写入独立 dailyRecords 表
  for (const dr of newSeedling.dailyRecords) {
    await DR_TABLE.put({ ...dr, seedlingId: newSeedling.id });
  }

  return newSeedling;
}

export async function updateSeedling(id: string, updates: Partial<Seedling>): Promise<Seedling | null> {
  const existing = await TABLE.get(id);
  if (!existing) return null;

  const updated: Seedling = {
    ...existing,
    ...updates,
    id,
    updateTime: nowString(),
  };
  await TABLE.put(updated);
  return updated;
}

export async function deleteSeedling(id: string): Promise<boolean> {
  const existing = await TABLE.get(id);
  if (!existing) return false;

  await TABLE.delete(id);
  // 清理关联的 dailyRecords
  const drs = await DR_TABLE.where('seedlingId').equals(id).toArray();
  await DR_TABLE.bulkDelete(drs.map(d => d.id));
  return true;
}

export async function deleteSeedlings(ids: string[]): Promise<boolean> {
  await TABLE.bulkDelete(ids);
  // 清理关联 dailyRecords
  const drs = await DR_TABLE.where('seedlingId').anyOf(ids).toArray();
  await DR_TABLE.bulkDelete(drs.map(d => d.id));
  return true;
}

export async function addDailyRecord(
  seedlingId: string,
  record: Omit<DailyRecord, 'id' | 'seedlingId'>
): Promise<DailyRecord | null> {
  const seedling = await TABLE.get(seedlingId);
  if (!seedling) return null;

  const newRecord: DailyRecord = {
    ...record,
    id: generateId('DR'),
    seedlingId,
  };

  const dailyRecords = [...(seedling.dailyRecords || []), newRecord];
  await TABLE.update(seedlingId, {
    dailyRecords,
    updateTime: nowString(),
  });
  await DR_TABLE.put(newRecord);

  return newRecord;
}

export async function deleteDailyRecord(seedlingId: string, recordId: string): Promise<boolean> {
  const seedling = await TABLE.get(seedlingId);
  if (!seedling) return false;

  const dailyRecords = (seedling.dailyRecords || []).filter(r => r.id !== recordId);
  if (dailyRecords.length === (seedling.dailyRecords || []).length) return false;

  await TABLE.update(seedlingId, {
    dailyRecords,
    updateTime: nowString(),
  });
  await DR_TABLE.delete(recordId);
  return true;
}

export async function updateDailyRecord(
  seedlingId: string,
  recordId: string,
  updates: Partial<DailyRecord>
): Promise<boolean> {
  const seedling = await TABLE.get(seedlingId);
  if (!seedling) return false;

  const dailyRecords = seedling.dailyRecords || [];
  const rIndex = dailyRecords.findIndex(r => r.id === recordId);
  if (rIndex === -1) return false;

  dailyRecords[rIndex] = { ...dailyRecords[rIndex], ...updates };

  await TABLE.update(seedlingId, {
    dailyRecords,
    updateTime: nowString(),
  });
  await DR_TABLE.update(recordId, updates);
  return true;
}

export async function increasePlantedCount(id: string, count: number): Promise<boolean> {
  const seedling = await TABLE.get(id);
  if (!seedling) return false;

  const newPlantedCount = seedling.plantedCount + count;
  const newStatus = newPlantedCount >= seedling.survivalCount
    ? SeedlingStatus.COMPLETED
    : SeedlingStatus.TRANSPLANT_READY;

  await TABLE.update(id, {
    plantedCount: newPlantedCount,
    status: newStatus,
    updateTime: nowString(),
  });
  return true;
}

export async function getTransplantReadySeedlings(): Promise<Seedling[]> {
  const seedlings = await TABLE.toArray();
  return seedlings.filter(s =>
    s.status === SeedlingStatus.TRANSPLANT_READY ||
    (s.status === SeedlingStatus.IN_PROGRESS && s.survivalCount - s.plantedCount > 0)
  );
}

export async function getAvailableTransplantCount(id: string): Promise<number> {
  const seedling = await TABLE.get(id);
  if (!seedling) return 0;
  return seedling.survivalCount - seedling.plantedCount;
}

export async function resetSeedlings(): Promise<void> {
  await TABLE.clear();
  await DR_TABLE.clear();
}
