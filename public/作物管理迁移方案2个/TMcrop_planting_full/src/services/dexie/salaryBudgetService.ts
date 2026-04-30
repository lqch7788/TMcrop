/**
 * 薪资预算 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { ISalaryBudgetService } from '../interfaces';
import { nowString, generateId } from './utils';

const SALARYBUDGETS_TABLE = db.salaryBudgets;

export async function initSalaryBudgets(): Promise<SalaryBudget[]> {
  const count = await SALARYBUDGETS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultSalaryBudgets();
    if (defaults.length > 0) {
      await SALARYBUDGETS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return SALARYBUDGETS_TABLE.toArray();
}

export async function getSalaryBudgets(): Promise<SalaryBudget[]> {
  return SALARYBUDGETS_TABLE.toArray();
}

export async function getSalaryBudgetById(id: string): Promise<SalaryBudget | undefined> {
  return SALARYBUDGETS_TABLE.get(id);
}

export async function addSalaryBudget(
  item: Omit<SalaryBudget, 'id' | 'createTime' | 'updateTime'>
): Promise<SalaryBudget> {
  const now = nowString();
  const newItem: SalaryBudget = { ...item, id: generateId('SA'), createTime: now, updateTime: now };
  await SALARYBUDGETS_TABLE.add(newItem);
  return newItem;
}

export async function updateSalaryBudget(id: string, updates: Partial<SalaryBudget>): Promise<SalaryBudget | null> {
  const existing = await SALARYBUDGETS_TABLE.get(id);
  if (!existing) return null;
  const updated: SalaryBudget = { ...existing, ...updates, id, updateTime: nowString() };
  await SALARYBUDGETS_TABLE.put(updated);
  return updated;
}

export async function deleteSalaryBudget(id: string): Promise<boolean> {
  const existing = await SALARYBUDGETS_TABLE.get(id);
  if (!existing) return false;
  await SALARYBUDGETS_TABLE.delete(id);
  return true;
}

export async function deleteSalaryBudgets(ids: string[]): Promise<boolean> {
  await SALARYBUDGETS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetSalaryBudgets(): Promise<void> {
  await SALARYBUDGETS_TABLE.clear();
}

function getDefaultSalaryBudgets(): SalaryBudget[] {
  return [];
}
