/**
 * 入职记录 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IOnboardingService } from '../interfaces';
import { nowString, generateId } from './utils';

const ONBOARDINGS_TABLE = db.onboardings;

export async function initOnboardingRecords(): Promise<OnboardingRecord[]> {
  const count = await ONBOARDINGS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultOnboardingRecords();
    if (defaults.length > 0) {
      await ONBOARDINGS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return ONBOARDINGS_TABLE.toArray();
}

export async function getOnboardingRecords(): Promise<OnboardingRecord[]> {
  return ONBOARDINGS_TABLE.toArray();
}

export async function getOnboardingRecordById(id: string): Promise<OnboardingRecord | undefined> {
  return ONBOARDINGS_TABLE.get(id);
}

export async function addOnboardingRecord(
  item: Omit<OnboardingRecord, 'id' | 'createTime' | 'updateTime'>
): Promise<OnboardingRecord> {
  const now = nowString();
  const newItem: OnboardingRecord = { ...item, id: generateId('ON'), createTime: now, updateTime: now };
  await ONBOARDINGS_TABLE.add(newItem);
  return newItem;
}

export async function updateOnboardingRecord(id: string, updates: Partial<OnboardingRecord>): Promise<OnboardingRecord | null> {
  const existing = await ONBOARDINGS_TABLE.get(id);
  if (!existing) return null;
  const updated: OnboardingRecord = { ...existing, ...updates, id, updateTime: nowString() };
  await ONBOARDINGS_TABLE.put(updated);
  return updated;
}

export async function deleteOnboardingRecord(id: string): Promise<boolean> {
  const existing = await ONBOARDINGS_TABLE.get(id);
  if (!existing) return false;
  await ONBOARDINGS_TABLE.delete(id);
  return true;
}

export async function deleteOnboardingRecords(ids: string[]): Promise<boolean> {
  await ONBOARDINGS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetOnboardingRecords(): Promise<void> {
  await ONBOARDINGS_TABLE.clear();
}

function getDefaultOnboardingRecords(): OnboardingRecord[] {
  return [];
}
