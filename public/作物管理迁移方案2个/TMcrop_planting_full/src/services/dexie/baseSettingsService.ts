/**
 * 公司分组 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IBaseSettingsService } from '../interfaces';
import { nowString, generateId } from './utils';

const COMPANYGROUPS_TABLE = db.companyGroups;
const BASES_TABLE = db.bases;

export async function initCompanyGroups(): Promise<CompanyGroup[]> {
  const count = await COMPANYGROUPS_TABLE.count();
  if (count === 0) {
    const defaultGroups = getDefaultCompanyGroups();
    await COMPANYGROUPS_TABLE.bulkAdd(defaultGroups.map(g => ({ ...g, id: generateId('CG') })));
    // 同时插入 bases
    for (const group of defaultGroups) {
      const basesWithId = group.bases.map(b => ({
        ...b,
        id: generateId('BS'),
        companyId: String(group.id),
        companyName: group.name,
        createTime: nowString(),
        updateTime: nowString(),
      }));
      await BASES_TABLE.bulkAdd(basesWithId);
    }
  }
  return COMPANYGROUPS_TABLE.toArray();
}

export async function getCompanyGroups(): Promise<CompanyGroup[]> {
  return COMPANYGROUPS_TABLE.toArray();
}

export async function getCompanyGroupById(id: string): Promise<CompanyGroup | undefined> {
  return COMPANYGROUPS_TABLE.get(id);
}

export async function addCompanyGroup(
  group: Omit<CompanyGroup, 'id' | 'createTime' | 'updateTime'>
): Promise<CompanyGroup> {
  const now = nowString();
  const newGroup: CompanyGroup = {
    ...group,
    id: generateId('CG'),
    createTime: now,
    updateTime: now,
  };
  await COMPANYGROUPS_TABLE.add(newGroup);
  return newGroup;
}

export async function updateCompanyGroup(id: string, updates: Partial<CompanyGroup>): Promise<CompanyGroup | null> {
  const existing = await COMPANYGROUPS_TABLE.get(id);
  if (!existing) return null;
  const updated: CompanyGroup = { ...existing, ...updates, id, updateTime: nowString() };
  await COMPANYGROUPS_TABLE.put(updated);
  return updated;
}

export async function deleteCompanyGroup(id: string): Promise<boolean> {
  const existing = await COMPANYGROUPS_TABLE.get(id);
  if (!existing) return false;
  await COMPANYGROUPS_TABLE.delete(id);
  await BASES_TABLE.where({ companyId: id }).delete();
  return true;
}

export async function getBases(): Promise<BaseData[]> {
  return BASES_TABLE.toArray();
}

export async function getBaseById(id: string): Promise<BaseData | undefined> {
  return BASES_TABLE.get(id);
}

export async function addBase(
  base: Omit<BaseData, 'id' | 'createTime' | 'updateTime'>
): Promise<BaseData> {
  const now = nowString();
  const newBase: BaseData = { ...base, id: generateId('BS'), createTime: now, updateTime: now };
  await BASES_TABLE.add(newBase);
  return newBase;
}

export async function updateBase(id: string, updates: Partial<BaseData>): Promise<BaseData | null> {
  const existing = await BASES_TABLE.get(id);
  if (!existing) return null;
  const updated: BaseData = { ...existing, ...updates, id, updateTime: nowString() };
  await BASES_TABLE.put(updated);
  return updated;
}

export async function deleteBase(id: string): Promise<boolean> {
  const existing = await BASES_TABLE.get(id);
  if (!existing) return false;
  await BASES_TABLE.delete(id);
  return true;
}

export async function getBasesByCompanyId(companyId: string): Promise<BaseData[]> {
  return BASES_TABLE.where('companyId').equals(companyId).toArray();
}

export async function resetBaseSettings(): Promise<void> {
  await COMPANYGROUPS_TABLE.clear();
  await BASES_TABLE.clear();
}

function getDefaultCompanyGroups(): any[] {
  // 返回初始硬编码数据（简化版）
  return [];
}
