/**
 * 薪资调整 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { ISalaryAdjustmentService } from '../interfaces';
import { nowString, generateId } from './utils';

const SALARYADJUSTMENTS_TABLE = db.salaryAdjustments;

export async function initSalaryAdjustments(): Promise<SalaryAdjustment[]> {
  const count = await SALARYADJUSTMENTS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultSalaryAdjustments();
    if (defaults.length > 0) {
      await SALARYADJUSTMENTS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return SALARYADJUSTMENTS_TABLE.toArray();
}

export async function getSalaryAdjustments(): Promise<SalaryAdjustment[]> {
  return SALARYADJUSTMENTS_TABLE.toArray();
}

export async function getSalaryAdjustmentById(id: string): Promise<SalaryAdjustment | undefined> {
  return SALARYADJUSTMENTS_TABLE.get(id);
}

export async function addSalaryAdjustment(
  item: Omit<SalaryAdjustment, 'id' | 'createTime' | 'updateTime'>
): Promise<SalaryAdjustment> {
  const now = nowString();
  const newItem: SalaryAdjustment = { ...item, id: generateId('SA'), createTime: now, updateTime: now };
  await SALARYADJUSTMENTS_TABLE.add(newItem);
  return newItem;
}

export async function updateSalaryAdjustment(id: string, updates: Partial<SalaryAdjustment>): Promise<SalaryAdjustment | null> {
  const existing = await SALARYADJUSTMENTS_TABLE.get(id);
  if (!existing) return null;
  const updated: SalaryAdjustment = { ...existing, ...updates, id, updateTime: nowString() };
  await SALARYADJUSTMENTS_TABLE.put(updated);
  return updated;
}

export async function deleteSalaryAdjustment(id: string): Promise<boolean> {
  const existing = await SALARYADJUSTMENTS_TABLE.get(id);
  if (!existing) return false;
  await SALARYADJUSTMENTS_TABLE.delete(id);
  return true;
}

export async function deleteSalaryAdjustments(ids: string[]): Promise<boolean> {
  await SALARYADJUSTMENTS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetSalaryAdjustments(): Promise<void> {
  await SALARYADJUSTMENTS_TABLE.clear();
}

function getDefaultSalaryAdjustments(): SalaryAdjustment[] {
  return [];
}
