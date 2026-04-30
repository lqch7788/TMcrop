/**
 * 考勤补卡 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IAttendanceRepairService } from '../interfaces';
import { nowString, generateId } from './utils';

const ATTENDANCEREPAIRS_TABLE = db.attendanceRepairs;

export async function initAttendanceRepairs(): Promise<AttendanceRepair[]> {
  const count = await ATTENDANCEREPAIRS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultAttendanceRepairs();
    if (defaults.length > 0) {
      await ATTENDANCEREPAIRS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return ATTENDANCEREPAIRS_TABLE.toArray();
}

export async function getAttendanceRepairs(): Promise<AttendanceRepair[]> {
  return ATTENDANCEREPAIRS_TABLE.toArray();
}

export async function getAttendanceRepairById(id: string): Promise<AttendanceRepair | undefined> {
  return ATTENDANCEREPAIRS_TABLE.get(id);
}

export async function addAttendanceRepair(
  item: Omit<AttendanceRepair, 'id' | 'createTime' | 'updateTime'>
): Promise<AttendanceRepair> {
  const now = nowString();
  const newItem: AttendanceRepair = { ...item, id: generateId('AT'), createTime: now, updateTime: now };
  await ATTENDANCEREPAIRS_TABLE.add(newItem);
  return newItem;
}

export async function updateAttendanceRepair(id: string, updates: Partial<AttendanceRepair>): Promise<AttendanceRepair | null> {
  const existing = await ATTENDANCEREPAIRS_TABLE.get(id);
  if (!existing) return null;
  const updated: AttendanceRepair = { ...existing, ...updates, id, updateTime: nowString() };
  await ATTENDANCEREPAIRS_TABLE.put(updated);
  return updated;
}

export async function deleteAttendanceRepair(id: string): Promise<boolean> {
  const existing = await ATTENDANCEREPAIRS_TABLE.get(id);
  if (!existing) return false;
  await ATTENDANCEREPAIRS_TABLE.delete(id);
  return true;
}

export async function deleteAttendanceRepairs(ids: string[]): Promise<boolean> {
  await ATTENDANCEREPAIRS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetAttendanceRepairs(): Promise<void> {
  await ATTENDANCEREPAIRS_TABLE.clear();
}

function getDefaultAttendanceRepairs(): AttendanceRepair[] {
  return [];
}
