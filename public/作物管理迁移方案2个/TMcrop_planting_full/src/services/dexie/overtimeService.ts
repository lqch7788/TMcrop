/**
 * 加班记录 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IOvertimeService } from '../interfaces';
import { nowString, generateId } from './utils';

const OVERTIMERECORDS_TABLE = db.overtimeRecords;

export async function initOvertimeRecords(): Promise<OvertimeRecord[]> {
  const count = await OVERTIMERECORDS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultOvertimeRecords();
    if (defaults.length > 0) {
      await OVERTIMERECORDS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return OVERTIMERECORDS_TABLE.toArray();
}

export async function getOvertimeRecords(): Promise<OvertimeRecord[]> {
  return OVERTIMERECORDS_TABLE.toArray();
}

export async function getOvertimeRecordById(id: string): Promise<OvertimeRecord | undefined> {
  return OVERTIMERECORDS_TABLE.get(id);
}

export async function addOvertimeRecord(
  item: Omit<OvertimeRecord, 'id' | 'createTime' | 'updateTime'>
): Promise<OvertimeRecord> {
  const now = nowString();
  const newItem: OvertimeRecord = { ...item, id: generateId('OV'), createTime: now, updateTime: now };
  await OVERTIMERECORDS_TABLE.add(newItem);
  return newItem;
}

export async function updateOvertimeRecord(id: string, updates: Partial<OvertimeRecord>): Promise<OvertimeRecord | null> {
  const existing = await OVERTIMERECORDS_TABLE.get(id);
  if (!existing) return null;
  const updated: OvertimeRecord = { ...existing, ...updates, id, updateTime: nowString() };
  await OVERTIMERECORDS_TABLE.put(updated);
  return updated;
}

export async function deleteOvertimeRecord(id: string): Promise<boolean> {
  const existing = await OVERTIMERECORDS_TABLE.get(id);
  if (!existing) return false;
  await OVERTIMERECORDS_TABLE.delete(id);
  return true;
}

export async function deleteOvertimeRecords(ids: string[]): Promise<boolean> {
  await OVERTIMERECORDS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetOvertimeRecords(): Promise<void> {
  await OVERTIMERECORDS_TABLE.clear();
}

function getDefaultOvertimeRecords(): OvertimeRecord[] {
  return [];
}
