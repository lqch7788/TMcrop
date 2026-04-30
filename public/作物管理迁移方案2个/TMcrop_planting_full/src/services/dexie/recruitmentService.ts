/**
 * 招聘记录 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IRecruitmentService } from '../interfaces';
import { nowString, generateId } from './utils';

const RECRUITMENTRECORDS_TABLE = db.recruitmentRecords;

export async function initRecruitmentRecords(): Promise<RecruitmentRecord[]> {
  const count = await RECRUITMENTRECORDS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultRecruitmentRecords();
    if (defaults.length > 0) {
      await RECRUITMENTRECORDS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return RECRUITMENTRECORDS_TABLE.toArray();
}

export async function getRecruitmentRecords(): Promise<RecruitmentRecord[]> {
  return RECRUITMENTRECORDS_TABLE.toArray();
}

export async function getRecruitmentRecordById(id: string): Promise<RecruitmentRecord | undefined> {
  return RECRUITMENTRECORDS_TABLE.get(id);
}

export async function addRecruitmentRecord(
  item: Omit<RecruitmentRecord, 'id' | 'createTime' | 'updateTime'>
): Promise<RecruitmentRecord> {
  const now = nowString();
  const newItem: RecruitmentRecord = { ...item, id: generateId('RE'), createTime: now, updateTime: now };
  await RECRUITMENTRECORDS_TABLE.add(newItem);
  return newItem;
}

export async function updateRecruitmentRecord(id: string, updates: Partial<RecruitmentRecord>): Promise<RecruitmentRecord | null> {
  const existing = await RECRUITMENTRECORDS_TABLE.get(id);
  if (!existing) return null;
  const updated: RecruitmentRecord = { ...existing, ...updates, id, updateTime: nowString() };
  await RECRUITMENTRECORDS_TABLE.put(updated);
  return updated;
}

export async function deleteRecruitmentRecord(id: string): Promise<boolean> {
  const existing = await RECRUITMENTRECORDS_TABLE.get(id);
  if (!existing) return false;
  await RECRUITMENTRECORDS_TABLE.delete(id);
  return true;
}

export async function deleteRecruitmentRecords(ids: string[]): Promise<boolean> {
  await RECRUITMENTRECORDS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetRecruitmentRecords(): Promise<void> {
  await RECRUITMENTRECORDS_TABLE.clear();
}

function getDefaultRecruitmentRecords(): RecruitmentRecord[] {
  return [];
}
