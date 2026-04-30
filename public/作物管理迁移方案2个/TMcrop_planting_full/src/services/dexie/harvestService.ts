/**
 * 采收 Service - Dexie.js 实现（第三种存储方案）
 * 基于 IndexedDB，纯前端持久化，适用于演示版/原型阶段
 */

import { db } from './db';
import { IHarvestService } from '../interfaces';
import { HarvestRecord } from '@/types';
import { nowString, generateId } from './utils';

const TABLE = db.harvests;

export async function initHarvestRecords(): Promise<HarvestRecord[]> {
  const count = await TABLE.count();
  if (count === 0) {
    const defaultHarvests: HarvestRecord[] = [
      {
        id: '1',
        harvestCode: 'HS202604001',
        batchId: '1',
        batchCode: 'ZZ2026-001',
        cropName: '番茄',
        greenhouseId: 'GH001',
        greenhouseName: '1号大棚',
        harvestDate: '2026-04-15',
        harvestArea: 100,
        harvestQuantity: 500,
        unit: '公斤',
        quality: 'excellent',
        grade: 'A',
        harvesterIds: ['U001', 'U002'],
        harvesterNames: ['张三', '李四'],
        warehouseId: 'WH001',
        warehouseName: '主仓库',
        status: 'stored',
        auditor: '王五',
        variety: '红果番茄',
        plantingMode: '大棚种植',
        targetYield: 600,
        relatedTaskId: 'T001',
        relatedTaskCode: 'AGR20260401001',
      },
      {
        id: '2',
        harvestCode: 'HS202604002',
        batchId: '2',
        batchCode: 'ZZ2026-002',
        cropName: '黄瓜',
        greenhouseId: 'GH002',
        greenhouseName: '2号大棚',
        harvestDate: '2026-04-18',
        harvestArea: 80,
        harvestQuantity: 300,
        unit: '公斤',
        quality: 'good',
        grade: 'B',
        harvesterIds: ['U003'],
        harvesterNames: ['王六'],
        warehouseId: 'WH001',
        warehouseName: '主仓库',
        status: 'graded',
        auditor: '赵七',
        variety: '水果黄瓜',
        plantingMode: '露天种植',
        targetYield: 350,
        relatedTaskId: 'T002',
        relatedTaskCode: 'AGR20260402002',
      },
    ];
    await TABLE.bulkAdd(defaultHarvests);
    return defaultHarvests;
  }
  return TABLE.toArray();
}

export async function getHarvestRecords(): Promise<HarvestRecord[]> {
  return TABLE.toArray();
}

export async function getHarvestRecordById(id: string): Promise<HarvestRecord | undefined> {
  return TABLE.get(id);
}

export async function getHarvestRecordsByIds(ids: string[]): Promise<HarvestRecord[]> {
  return TABLE.where('id').anyOf(ids).toArray();
}

export async function getHarvestRecordsByBatchCode(batchCode: string): Promise<HarvestRecord[]> {
  return TABLE.where('batchCode').equals(batchCode).toArray();
}

export async function addHarvestRecord(
  record: Omit<HarvestRecord, 'id'>
): Promise<HarvestRecord> {
  const newRecord: HarvestRecord = {
    ...record,
    id: String(Date.now()),
  };
  await TABLE.add(newRecord);
  return newRecord;
}

export async function addHarvestRecords(
  newRecords: Omit<HarvestRecord, 'id'>[]
): Promise<HarvestRecord[]> {
  const created = newRecords.map((record, index) => ({
    ...record,
    id: String(Date.now() + index),
  }));
  await TABLE.bulkAdd(created);
  return created;
}

export async function updateHarvestRecord(
  id: string,
  updates: Partial<HarvestRecord>
): Promise<HarvestRecord | null> {
  const existing = await TABLE.get(id);
  if (!existing) return null;

  const updated: HarvestRecord = {
    ...existing,
    ...updates,
    id,
  };
  await TABLE.put(updated);
  return updated;
}

export async function deleteHarvestRecord(id: string): Promise<boolean> {
  const existing = await TABLE.get(id);
  if (!existing) return false;
  await TABLE.delete(id);
  return true;
}

export async function deleteHarvestRecords(ids: string[]): Promise<boolean> {
  await TABLE.bulkDelete(ids);
  return true;
}

export async function generateHarvestCode(): Promise<string> {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
  const existingCodes = await TABLE.where('harvestCode').startsWith(`HS${dateStr}`).toArray();
  const seq = existingCodes.length + 1;
  return `HS${dateStr}${String(seq).padStart(3, '0')}`;
}

export async function resetHarvestRecords(): Promise<void> {
  await TABLE.clear();
}
