/**
 * 生产计划 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IProductionPlanService } from '../interfaces';
import { nowString, generateId } from './utils';

const PRODUCTIONPLANS_TABLE = db.productionPlans;
const DAILYPLANS_TABLE = db.dailyPlans;
const MONTHLYPLANS_TABLE = db.monthlyPlans;

// ===== ProductionPlan =====
export async function initProductionPlans(): Promise<ProductionPlan[]> {
  const count = await PRODUCTIONPLANS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultProductionPlans();
    if (defaults.length > 0) {
      await PRODUCTIONPLANS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return PRODUCTIONPLANS_TABLE.toArray();
}

export async function getProductionPlans(): Promise<ProductionPlan[]> {
  return PRODUCTIONPLANS_TABLE.toArray();
}

export async function getProductionPlanById(id: string): Promise<ProductionPlan | undefined> {
  return PRODUCTIONPLANS_TABLE.get(id);
}

export async function addProductionPlan(
  item: Omit<ProductionPlan, 'id' | 'createTime' | 'updateTime'>
): Promise<ProductionPlan> {
  const now = nowString();
  const newItem: ProductionPlan = { ...item, id: generateId('PR'), createTime: now, updateTime: now };
  await PRODUCTIONPLANS_TABLE.add(newItem);
  return newItem;
}

export async function updateProductionPlan(id: string, updates: Partial<ProductionPlan>): Promise<ProductionPlan | null> {
  const existing = await PRODUCTIONPLANS_TABLE.get(id);
  if (!existing) return null;
  const updated: ProductionPlan = { ...existing, ...updates, id, updateTime: nowString() };
  await PRODUCTIONPLANS_TABLE.put(updated);
  return updated;
}

export async function deleteProductionPlan(id: string): Promise<boolean> {
  const existing = await PRODUCTIONPLANS_TABLE.get(id);
  if (!existing) return false;
  await PRODUCTIONPLANS_TABLE.delete(id);
  return true;
}

export async function deleteProductionPlans(ids: string[]): Promise<boolean> {
  await PRODUCTIONPLANS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetProductionPlans(): Promise<void> {
  await PRODUCTIONPLANS_TABLE.clear();
}

function getDefaultProductionPlans(): ProductionPlan[] {
  return [];
}

// ===== DailyPlan =====
export async function initDailyPlans(): Promise<DailyPlan[]> {
  const count = await DAILYPLANS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultDailyPlans();
    if (defaults.length > 0) {
      await DAILYPLANS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return DAILYPLANS_TABLE.toArray();
}

export async function getDailyPlans(): Promise<DailyPlan[]> {
  return DAILYPLANS_TABLE.toArray();
}

export async function getDailyPlanById(id: string): Promise<DailyPlan | undefined> {
  return DAILYPLANS_TABLE.get(id);
}

export async function addDailyPlan(
  item: Omit<DailyPlan, 'id' | 'createTime' | 'updateTime'>
): Promise<DailyPlan> {
  const now = nowString();
  const newItem: DailyPlan = { ...item, id: generateId('DA'), createTime: now, updateTime: now };
  await DAILYPLANS_TABLE.add(newItem);
  return newItem;
}

export async function updateDailyPlan(id: string, updates: Partial<DailyPlan>): Promise<DailyPlan | null> {
  const existing = await DAILYPLANS_TABLE.get(id);
  if (!existing) return null;
  const updated: DailyPlan = { ...existing, ...updates, id, updateTime: nowString() };
  await DAILYPLANS_TABLE.put(updated);
  return updated;
}

export async function deleteDailyPlan(id: string): Promise<boolean> {
  const existing = await DAILYPLANS_TABLE.get(id);
  if (!existing) return false;
  await DAILYPLANS_TABLE.delete(id);
  return true;
}

export async function deleteDailyPlans(ids: string[]): Promise<boolean> {
  await DAILYPLANS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetDailyPlans(): Promise<void> {
  await DAILYPLANS_TABLE.clear();
}

function getDefaultDailyPlans(): DailyPlan[] {
  return [];
}

// ===== MonthlyPlan =====
export async function initMonthlyPlans(): Promise<MonthlyPlan[]> {
  const count = await MONTHLYPLANS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultMonthlyPlans();
    if (defaults.length > 0) {
      await MONTHLYPLANS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return MONTHLYPLANS_TABLE.toArray();
}

export async function getMonthlyPlans(): Promise<MonthlyPlan[]> {
  return MONTHLYPLANS_TABLE.toArray();
}

export async function getMonthlyPlanById(id: string): Promise<MonthlyPlan | undefined> {
  return MONTHLYPLANS_TABLE.get(id);
}

export async function addMonthlyPlan(
  item: Omit<MonthlyPlan, 'id' | 'createTime' | 'updateTime'>
): Promise<MonthlyPlan> {
  const now = nowString();
  const newItem: MonthlyPlan = { ...item, id: generateId('MO'), createTime: now, updateTime: now };
  await MONTHLYPLANS_TABLE.add(newItem);
  return newItem;
}

export async function updateMonthlyPlan(id: string, updates: Partial<MonthlyPlan>): Promise<MonthlyPlan | null> {
  const existing = await MONTHLYPLANS_TABLE.get(id);
  if (!existing) return null;
  const updated: MonthlyPlan = { ...existing, ...updates, id, updateTime: nowString() };
  await MONTHLYPLANS_TABLE.put(updated);
  return updated;
}

export async function deleteMonthlyPlan(id: string): Promise<boolean> {
  const existing = await MONTHLYPLANS_TABLE.get(id);
  if (!existing) return false;
  await MONTHLYPLANS_TABLE.delete(id);
  return true;
}

export async function deleteMonthlyPlans(ids: string[]): Promise<boolean> {
  await MONTHLYPLANS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetMonthlyPlans(): Promise<void> {
  await MONTHLYPLANS_TABLE.clear();
}

function getDefaultMonthlyPlans(): MonthlyPlan[] {
  return [];
}
