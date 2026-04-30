/**
 * 考勤记录 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IAttendanceService } from '../interfaces';
import { nowString, generateId } from './utils';

const ATTENDANCERECORDS_TABLE = db.attendanceRecords;

export async function initAttendanceRecords(): Promise<AttendanceRecord[]> {
  const count = await ATTENDANCERECORDS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultAttendanceRecords();
    if (defaults.length > 0) {
      await ATTENDANCERECORDS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return ATTENDANCERECORDS_TABLE.toArray();
}

export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  return ATTENDANCERECORDS_TABLE.toArray();
}

export async function getAttendanceRecordById(id: string): Promise<AttendanceRecord | undefined> {
  return ATTENDANCERECORDS_TABLE.get(id);
}

export async function addAttendanceRecord(
  item: Omit<AttendanceRecord, 'id' | 'createTime' | 'updateTime'>
): Promise<AttendanceRecord> {
  const now = nowString();
  const newItem: AttendanceRecord = { ...item, id: generateId('AT'), createTime: now, updateTime: now };
  await ATTENDANCERECORDS_TABLE.add(newItem);
  return newItem;
}

export async function updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | null> {
  const existing = await ATTENDANCERECORDS_TABLE.get(id);
  if (!existing) return null;
  const updated: AttendanceRecord = { ...existing, ...updates, id, updateTime: nowString() };
  await ATTENDANCERECORDS_TABLE.put(updated);
  return updated;
}

export async function deleteAttendanceRecord(id: string): Promise<boolean> {
  const existing = await ATTENDANCERECORDS_TABLE.get(id);
  if (!existing) return false;
  await ATTENDANCERECORDS_TABLE.delete(id);
  return true;
}

export async function deleteAttendanceRecords(ids: string[]): Promise<boolean> {
  await ATTENDANCERECORDS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetAttendanceRecords(): Promise<void> {
  await ATTENDANCERECORDS_TABLE.clear();
}

function getDefaultAttendanceRecords(): AttendanceRecord[] {
  return [];
}
