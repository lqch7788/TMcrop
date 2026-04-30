/**
 * 任务中心 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { ITaskCenterService } from '../interfaces';
import { nowString, generateId } from './utils';

const TASKCENTERRECORDS_TABLE = db.taskCenterRecords;

export async function initTaskCenterRecords(): Promise<TaskCenterRecord[]> {
  const count = await TASKCENTERRECORDS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultTaskCenterRecords();
    if (defaults.length > 0) {
      await TASKCENTERRECORDS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return TASKCENTERRECORDS_TABLE.toArray();
}

export async function getTaskCenterRecords(): Promise<TaskCenterRecord[]> {
  return TASKCENTERRECORDS_TABLE.toArray();
}

export async function getTaskCenterRecordById(id: string): Promise<TaskCenterRecord | undefined> {
  return TASKCENTERRECORDS_TABLE.get(id);
}

export async function addTaskCenterRecord(
  item: Omit<TaskCenterRecord, 'id' | 'createTime' | 'updateTime'>
): Promise<TaskCenterRecord> {
  const now = nowString();
  const newItem: TaskCenterRecord = { ...item, id: generateId('TA'), createTime: now, updateTime: now };
  await TASKCENTERRECORDS_TABLE.add(newItem);
  return newItem;
}

export async function updateTaskCenterRecord(id: string, updates: Partial<TaskCenterRecord>): Promise<TaskCenterRecord | null> {
  const existing = await TASKCENTERRECORDS_TABLE.get(id);
  if (!existing) return null;
  const updated: TaskCenterRecord = { ...existing, ...updates, id, updateTime: nowString() };
  await TASKCENTERRECORDS_TABLE.put(updated);
  return updated;
}

export async function deleteTaskCenterRecord(id: string): Promise<boolean> {
  const existing = await TASKCENTERRECORDS_TABLE.get(id);
  if (!existing) return false;
  await TASKCENTERRECORDS_TABLE.delete(id);
  return true;
}

export async function deleteTaskCenterRecords(ids: string[]): Promise<boolean> {
  await TASKCENTERRECORDS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetTaskCenterRecords(): Promise<void> {
  await TASKCENTERRECORDS_TABLE.clear();
}

function getDefaultTaskCenterRecords(): TaskCenterRecord[] {
  return [];
}
