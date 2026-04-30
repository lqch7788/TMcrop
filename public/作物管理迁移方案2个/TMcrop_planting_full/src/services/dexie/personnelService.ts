/**
 * 人员档案 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IPersonnelService } from '../interfaces';
import { nowString, generateId } from './utils';

const PERSONNELRECORDS_TABLE = db.personnelRecords;

export async function initPersonnelRecords(): Promise<PersonnelRecord[]> {
  const count = await PERSONNELRECORDS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultPersonnelRecords();
    if (defaults.length > 0) {
      await PERSONNELRECORDS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return PERSONNELRECORDS_TABLE.toArray();
}

export async function getPersonnelRecords(): Promise<PersonnelRecord[]> {
  return PERSONNELRECORDS_TABLE.toArray();
}

export async function getPersonnelRecordById(id: string): Promise<PersonnelRecord | undefined> {
  return PERSONNELRECORDS_TABLE.get(id);
}

export async function addPersonnelRecord(
  item: Omit<PersonnelRecord, 'id' | 'createTime' | 'updateTime'>
): Promise<PersonnelRecord> {
  const now = nowString();
  const newItem: PersonnelRecord = { ...item, id: generateId('PE'), createTime: now, updateTime: now };
  await PERSONNELRECORDS_TABLE.add(newItem);
  return newItem;
}

export async function updatePersonnelRecord(id: string, updates: Partial<PersonnelRecord>): Promise<PersonnelRecord | null> {
  const existing = await PERSONNELRECORDS_TABLE.get(id);
  if (!existing) return null;
  const updated: PersonnelRecord = { ...existing, ...updates, id, updateTime: nowString() };
  await PERSONNELRECORDS_TABLE.put(updated);
  return updated;
}

export async function deletePersonnelRecord(id: string): Promise<boolean> {
  const existing = await PERSONNELRECORDS_TABLE.get(id);
  if (!existing) return false;
  await PERSONNELRECORDS_TABLE.delete(id);
  return true;
}

export async function deletePersonnelRecords(ids: string[]): Promise<boolean> {
  await PERSONNELRECORDS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetPersonnelRecords(): Promise<void> {
  await PERSONNELRECORDS_TABLE.clear();
}

function getDefaultPersonnelRecords(): PersonnelRecord[] {
  return [];
}
