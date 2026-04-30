/**
 * 物料 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IMaterialService } from '../interfaces';
import { nowString, generateId } from './utils';

const MATERIALS_TABLE = db.materials;
const MATERIALRECEIVINGRECORDS_TABLE = db.materialReceivingRecords;
const MATERIALUSAGES_TABLE = db.materialUsages;
const MATERIALRETURNS_TABLE = db.materialReturns;

// ===== Material =====
export async function initMaterials(): Promise<Material[]> {
  const count = await MATERIALS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultMaterials();
    if (defaults.length > 0) {
      await MATERIALS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return MATERIALS_TABLE.toArray();
}

export async function getMaterials(): Promise<Material[]> {
  return MATERIALS_TABLE.toArray();
}

export async function getMaterialById(id: string): Promise<Material | undefined> {
  return MATERIALS_TABLE.get(id);
}

export async function addMaterial(
  item: Omit<Material, 'id' | 'createTime' | 'updateTime'>
): Promise<Material> {
  const now = nowString();
  const newItem: Material = { ...item, id: generateId('MA'), createTime: now, updateTime: now };
  await MATERIALS_TABLE.add(newItem);
  return newItem;
}

export async function updateMaterial(id: string, updates: Partial<Material>): Promise<Material | null> {
  const existing = await MATERIALS_TABLE.get(id);
  if (!existing) return null;
  const updated: Material = { ...existing, ...updates, id, updateTime: nowString() };
  await MATERIALS_TABLE.put(updated);
  return updated;
}

export async function deleteMaterial(id: string): Promise<boolean> {
  const existing = await MATERIALS_TABLE.get(id);
  if (!existing) return false;
  await MATERIALS_TABLE.delete(id);
  return true;
}

export async function deleteMaterials(ids: string[]): Promise<boolean> {
  await MATERIALS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetMaterials(): Promise<void> {
  await MATERIALS_TABLE.clear();
}

function getDefaultMaterials(): Material[] {
  return [];
}

// ===== MaterialReceivingRecord =====
export async function initMaterialReceivingRecords(): Promise<MaterialReceivingRecord[]> {
  const count = await MATERIALRECEIVINGRECORDS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultMaterialReceivingRecords();
    if (defaults.length > 0) {
      await MATERIALRECEIVINGRECORDS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return MATERIALRECEIVINGRECORDS_TABLE.toArray();
}

export async function getMaterialReceivingRecords(): Promise<MaterialReceivingRecord[]> {
  return MATERIALRECEIVINGRECORDS_TABLE.toArray();
}

export async function getMaterialReceivingRecordById(id: string): Promise<MaterialReceivingRecord | undefined> {
  return MATERIALRECEIVINGRECORDS_TABLE.get(id);
}

export async function addMaterialReceivingRecord(
  item: Omit<MaterialReceivingRecord, 'id' | 'createTime' | 'updateTime'>
): Promise<MaterialReceivingRecord> {
  const now = nowString();
  const newItem: MaterialReceivingRecord = { ...item, id: generateId('MA'), createTime: now, updateTime: now };
  await MATERIALRECEIVINGRECORDS_TABLE.add(newItem);
  return newItem;
}

export async function updateMaterialReceivingRecord(id: string, updates: Partial<MaterialReceivingRecord>): Promise<MaterialReceivingRecord | null> {
  const existing = await MATERIALRECEIVINGRECORDS_TABLE.get(id);
  if (!existing) return null;
  const updated: MaterialReceivingRecord = { ...existing, ...updates, id, updateTime: nowString() };
  await MATERIALRECEIVINGRECORDS_TABLE.put(updated);
  return updated;
}

export async function deleteMaterialReceivingRecord(id: string): Promise<boolean> {
  const existing = await MATERIALRECEIVINGRECORDS_TABLE.get(id);
  if (!existing) return false;
  await MATERIALRECEIVINGRECORDS_TABLE.delete(id);
  return true;
}

export async function deleteMaterialReceivingRecords(ids: string[]): Promise<boolean> {
  await MATERIALRECEIVINGRECORDS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetMaterialReceivingRecords(): Promise<void> {
  await MATERIALRECEIVINGRECORDS_TABLE.clear();
}

function getDefaultMaterialReceivingRecords(): MaterialReceivingRecord[] {
  return [];
}

// ===== MaterialUsage =====
export async function initMaterialUsages(): Promise<MaterialUsage[]> {
  const count = await MATERIALUSAGES_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultMaterialUsages();
    if (defaults.length > 0) {
      await MATERIALUSAGES_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return MATERIALUSAGES_TABLE.toArray();
}

export async function getMaterialUsages(): Promise<MaterialUsage[]> {
  return MATERIALUSAGES_TABLE.toArray();
}

export async function getMaterialUsageById(id: string): Promise<MaterialUsage | undefined> {
  return MATERIALUSAGES_TABLE.get(id);
}

export async function addMaterialUsage(
  item: Omit<MaterialUsage, 'id' | 'createTime' | 'updateTime'>
): Promise<MaterialUsage> {
  const now = nowString();
  const newItem: MaterialUsage = { ...item, id: generateId('MA'), createTime: now, updateTime: now };
  await MATERIALUSAGES_TABLE.add(newItem);
  return newItem;
}

export async function updateMaterialUsage(id: string, updates: Partial<MaterialUsage>): Promise<MaterialUsage | null> {
  const existing = await MATERIALUSAGES_TABLE.get(id);
  if (!existing) return null;
  const updated: MaterialUsage = { ...existing, ...updates, id, updateTime: nowString() };
  await MATERIALUSAGES_TABLE.put(updated);
  return updated;
}

export async function deleteMaterialUsage(id: string): Promise<boolean> {
  const existing = await MATERIALUSAGES_TABLE.get(id);
  if (!existing) return false;
  await MATERIALUSAGES_TABLE.delete(id);
  return true;
}

export async function deleteMaterialUsages(ids: string[]): Promise<boolean> {
  await MATERIALUSAGES_TABLE.bulkDelete(ids);
  return true;
}

export async function resetMaterialUsages(): Promise<void> {
  await MATERIALUSAGES_TABLE.clear();
}

function getDefaultMaterialUsages(): MaterialUsage[] {
  return [];
}

// ===== MaterialReturn =====
export async function initMaterialReturns(): Promise<MaterialReturn[]> {
  const count = await MATERIALRETURNS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultMaterialReturns();
    if (defaults.length > 0) {
      await MATERIALRETURNS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return MATERIALRETURNS_TABLE.toArray();
}

export async function getMaterialReturns(): Promise<MaterialReturn[]> {
  return MATERIALRETURNS_TABLE.toArray();
}

export async function getMaterialReturnById(id: string): Promise<MaterialReturn | undefined> {
  return MATERIALRETURNS_TABLE.get(id);
}

export async function addMaterialReturn(
  item: Omit<MaterialReturn, 'id' | 'createTime' | 'updateTime'>
): Promise<MaterialReturn> {
  const now = nowString();
  const newItem: MaterialReturn = { ...item, id: generateId('MA'), createTime: now, updateTime: now };
  await MATERIALRETURNS_TABLE.add(newItem);
  return newItem;
}

export async function updateMaterialReturn(id: string, updates: Partial<MaterialReturn>): Promise<MaterialReturn | null> {
  const existing = await MATERIALRETURNS_TABLE.get(id);
  if (!existing) return null;
  const updated: MaterialReturn = { ...existing, ...updates, id, updateTime: nowString() };
  await MATERIALRETURNS_TABLE.put(updated);
  return updated;
}

export async function deleteMaterialReturn(id: string): Promise<boolean> {
  const existing = await MATERIALRETURNS_TABLE.get(id);
  if (!existing) return false;
  await MATERIALRETURNS_TABLE.delete(id);
  return true;
}

export async function deleteMaterialReturns(ids: string[]): Promise<boolean> {
  await MATERIALRETURNS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetMaterialReturns(): Promise<void> {
  await MATERIALRETURNS_TABLE.clear();
}

function getDefaultMaterialReturns(): MaterialReturn[] {
  return [];
}
