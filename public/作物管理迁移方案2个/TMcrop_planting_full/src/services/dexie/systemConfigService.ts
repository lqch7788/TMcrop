/**
 * 系统配置 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { ISystemConfigService } from '../interfaces';
import { nowString, generateId } from './utils';

const SYSTEMCONFIGS_TABLE = db.systemConfigs;
const DICTIONARIES_TABLE = db.dictionaries;

// ===== SystemConfig =====
export async function initSystemConfigs(): Promise<SystemConfig[]> {
  const count = await SYSTEMCONFIGS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultSystemConfigs();
    if (defaults.length > 0) {
      await SYSTEMCONFIGS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return SYSTEMCONFIGS_TABLE.toArray();
}

export async function getSystemConfigs(): Promise<SystemConfig[]> {
  return SYSTEMCONFIGS_TABLE.toArray();
}

export async function getSystemConfigById(id: string): Promise<SystemConfig | undefined> {
  return SYSTEMCONFIGS_TABLE.get(id);
}

export async function addSystemConfig(
  item: Omit<SystemConfig, 'id' | 'createTime' | 'updateTime'>
): Promise<SystemConfig> {
  const now = nowString();
  const newItem: SystemConfig = { ...item, id: generateId('SY'), createTime: now, updateTime: now };
  await SYSTEMCONFIGS_TABLE.add(newItem);
  return newItem;
}

export async function updateSystemConfig(id: string, updates: Partial<SystemConfig>): Promise<SystemConfig | null> {
  const existing = await SYSTEMCONFIGS_TABLE.get(id);
  if (!existing) return null;
  const updated: SystemConfig = { ...existing, ...updates, id, updateTime: nowString() };
  await SYSTEMCONFIGS_TABLE.put(updated);
  return updated;
}

export async function deleteSystemConfig(id: string): Promise<boolean> {
  const existing = await SYSTEMCONFIGS_TABLE.get(id);
  if (!existing) return false;
  await SYSTEMCONFIGS_TABLE.delete(id);
  return true;
}

export async function deleteSystemConfigs(ids: string[]): Promise<boolean> {
  await SYSTEMCONFIGS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetSystemConfigs(): Promise<void> {
  await SYSTEMCONFIGS_TABLE.clear();
}

function getDefaultSystemConfigs(): SystemConfig[] {
  return [];
}

// ===== Dictionary =====
export async function initDictionarys(): Promise<Dictionary[]> {
  const count = await DICTIONARIES_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultDictionarys();
    if (defaults.length > 0) {
      await DICTIONARIES_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return DICTIONARIES_TABLE.toArray();
}

export async function getDictionarys(): Promise<Dictionary[]> {
  return DICTIONARIES_TABLE.toArray();
}

export async function getDictionaryById(id: string): Promise<Dictionary | undefined> {
  return DICTIONARIES_TABLE.get(id);
}

export async function addDictionary(
  item: Omit<Dictionary, 'id' | 'createTime' | 'updateTime'>
): Promise<Dictionary> {
  const now = nowString();
  const newItem: Dictionary = { ...item, id: generateId('DI'), createTime: now, updateTime: now };
  await DICTIONARIES_TABLE.add(newItem);
  return newItem;
}

export async function updateDictionary(id: string, updates: Partial<Dictionary>): Promise<Dictionary | null> {
  const existing = await DICTIONARIES_TABLE.get(id);
  if (!existing) return null;
  const updated: Dictionary = { ...existing, ...updates, id, updateTime: nowString() };
  await DICTIONARIES_TABLE.put(updated);
  return updated;
}

export async function deleteDictionary(id: string): Promise<boolean> {
  const existing = await DICTIONARIES_TABLE.get(id);
  if (!existing) return false;
  await DICTIONARIES_TABLE.delete(id);
  return true;
}

export async function deleteDictionarys(ids: string[]): Promise<boolean> {
  await DICTIONARIES_TABLE.bulkDelete(ids);
  return true;
}

export async function resetDictionarys(): Promise<void> {
  await DICTIONARIES_TABLE.clear();
}

function getDefaultDictionarys(): Dictionary[] {
  return [];
}
