/**
 * 离职记录 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IResignationService } from '../interfaces';
import { nowString, generateId } from './utils';

const RESIGNATIONS_TABLE = db.resignations;

export async function initResignationRecords(): Promise<ResignationRecord[]> {
  const count = await RESIGNATIONS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultResignationRecords();
    if (defaults.length > 0) {
      await RESIGNATIONS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return RESIGNATIONS_TABLE.toArray();
}

export async function getResignationRecords(): Promise<ResignationRecord[]> {
  return RESIGNATIONS_TABLE.toArray();
}

export async function getResignationRecordById(id: string): Promise<ResignationRecord | undefined> {
  return RESIGNATIONS_TABLE.get(id);
}

export async function addResignationRecord(
  item: Omit<ResignationRecord, 'id' | 'createTime' | 'updateTime'>
): Promise<ResignationRecord> {
  const now = nowString();
  const newItem: ResignationRecord = { ...item, id: generateId('RE'), createTime: now, updateTime: now };
  await RESIGNATIONS_TABLE.add(newItem);
  return newItem;
}

export async function updateResignationRecord(id: string, updates: Partial<ResignationRecord>): Promise<ResignationRecord | null> {
  const existing = await RESIGNATIONS_TABLE.get(id);
  if (!existing) return null;
  const updated: ResignationRecord = { ...existing, ...updates, id, updateTime: nowString() };
  await RESIGNATIONS_TABLE.put(updated);
  return updated;
}

export async function deleteResignationRecord(id: string): Promise<boolean> {
  const existing = await RESIGNATIONS_TABLE.get(id);
  if (!existing) return false;
  await RESIGNATIONS_TABLE.delete(id);
  return true;
}

export async function deleteResignationRecords(ids: string[]): Promise<boolean> {
  await RESIGNATIONS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetResignationRecords(): Promise<void> {
  await RESIGNATIONS_TABLE.clear();
}

function getDefaultResignationRecords(): ResignationRecord[] {
  return [];
}
