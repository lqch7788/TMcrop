/**
 * 请假记录 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { ILeaveService } from '../interfaces';
import { nowString, generateId } from './utils';

const LEAVERECORDS_TABLE = db.leaveRecords;

export async function initLeaveRecords(): Promise<LeaveRecord[]> {
  const count = await LEAVERECORDS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultLeaveRecords();
    if (defaults.length > 0) {
      await LEAVERECORDS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return LEAVERECORDS_TABLE.toArray();
}

export async function getLeaveRecords(): Promise<LeaveRecord[]> {
  return LEAVERECORDS_TABLE.toArray();
}

export async function getLeaveRecordById(id: string): Promise<LeaveRecord | undefined> {
  return LEAVERECORDS_TABLE.get(id);
}

export async function addLeaveRecord(
  item: Omit<LeaveRecord, 'id' | 'createTime' | 'updateTime'>
): Promise<LeaveRecord> {
  const now = nowString();
  const newItem: LeaveRecord = { ...item, id: generateId('LE'), createTime: now, updateTime: now };
  await LEAVERECORDS_TABLE.add(newItem);
  return newItem;
}

export async function updateLeaveRecord(id: string, updates: Partial<LeaveRecord>): Promise<LeaveRecord | null> {
  const existing = await LEAVERECORDS_TABLE.get(id);
  if (!existing) return null;
  const updated: LeaveRecord = { ...existing, ...updates, id, updateTime: nowString() };
  await LEAVERECORDS_TABLE.put(updated);
  return updated;
}

export async function deleteLeaveRecord(id: string): Promise<boolean> {
  const existing = await LEAVERECORDS_TABLE.get(id);
  if (!existing) return false;
  await LEAVERECORDS_TABLE.delete(id);
  return true;
}

export async function deleteLeaveRecords(ids: string[]): Promise<boolean> {
  await LEAVERECORDS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetLeaveRecords(): Promise<void> {
  await LEAVERECORDS_TABLE.clear();
}

function getDefaultLeaveRecords(): LeaveRecord[] {
  return [];
}
