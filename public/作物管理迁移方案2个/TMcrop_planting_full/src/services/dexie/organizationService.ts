/**
 * 部门 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IOrganizationService } from '../interfaces';
import { nowString, generateId } from './utils';

const DEPARTMENTS_TABLE = db.departments;
const POSITIONS_TABLE = db.positions;
const STAFF_TABLE = db.staff;

// ===== Department =====
export async function initDepartments(): Promise<Department[]> {
  const count = await DEPARTMENTS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultDepartments();
    if (defaults.length > 0) {
      await DEPARTMENTS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return DEPARTMENTS_TABLE.toArray();
}

export async function getDepartments(): Promise<Department[]> {
  return DEPARTMENTS_TABLE.toArray();
}

export async function getDepartmentById(id: string): Promise<Department | undefined> {
  return DEPARTMENTS_TABLE.get(id);
}

export async function addDepartment(
  item: Omit<Department, 'id' | 'createTime' | 'updateTime'>
): Promise<Department> {
  const now = nowString();
  const newItem: Department = { ...item, id: generateId('DE'), createTime: now, updateTime: now };
  await DEPARTMENTS_TABLE.add(newItem);
  return newItem;
}

export async function updateDepartment(id: string, updates: Partial<Department>): Promise<Department | null> {
  const existing = await DEPARTMENTS_TABLE.get(id);
  if (!existing) return null;
  const updated: Department = { ...existing, ...updates, id, updateTime: nowString() };
  await DEPARTMENTS_TABLE.put(updated);
  return updated;
}

export async function deleteDepartment(id: string): Promise<boolean> {
  const existing = await DEPARTMENTS_TABLE.get(id);
  if (!existing) return false;
  await DEPARTMENTS_TABLE.delete(id);
  return true;
}

export async function deleteDepartments(ids: string[]): Promise<boolean> {
  await DEPARTMENTS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetDepartments(): Promise<void> {
  await DEPARTMENTS_TABLE.clear();
}

function getDefaultDepartments(): Department[] {
  return [];
}

// ===== Position =====
export async function initPositions(): Promise<Position[]> {
  const count = await POSITIONS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultPositions();
    if (defaults.length > 0) {
      await POSITIONS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return POSITIONS_TABLE.toArray();
}

export async function getPositions(): Promise<Position[]> {
  return POSITIONS_TABLE.toArray();
}

export async function getPositionById(id: string): Promise<Position | undefined> {
  return POSITIONS_TABLE.get(id);
}

export async function addPosition(
  item: Omit<Position, 'id' | 'createTime' | 'updateTime'>
): Promise<Position> {
  const now = nowString();
  const newItem: Position = { ...item, id: generateId('PO'), createTime: now, updateTime: now };
  await POSITIONS_TABLE.add(newItem);
  return newItem;
}

export async function updatePosition(id: string, updates: Partial<Position>): Promise<Position | null> {
  const existing = await POSITIONS_TABLE.get(id);
  if (!existing) return null;
  const updated: Position = { ...existing, ...updates, id, updateTime: nowString() };
  await POSITIONS_TABLE.put(updated);
  return updated;
}

export async function deletePosition(id: string): Promise<boolean> {
  const existing = await POSITIONS_TABLE.get(id);
  if (!existing) return false;
  await POSITIONS_TABLE.delete(id);
  return true;
}

export async function deletePositions(ids: string[]): Promise<boolean> {
  await POSITIONS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetPositions(): Promise<void> {
  await POSITIONS_TABLE.clear();
}

function getDefaultPositions(): Position[] {
  return [];
}

// ===== Staff =====
export async function initStaffs(): Promise<Staff[]> {
  const count = await STAFF_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultStaffs();
    if (defaults.length > 0) {
      await STAFF_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return STAFF_TABLE.toArray();
}

export async function getStaffs(): Promise<Staff[]> {
  return STAFF_TABLE.toArray();
}

export async function getStaffById(id: string): Promise<Staff | undefined> {
  return STAFF_TABLE.get(id);
}

export async function addStaff(
  item: Omit<Staff, 'id' | 'createTime' | 'updateTime'>
): Promise<Staff> {
  const now = nowString();
  const newItem: Staff = { ...item, id: generateId('ST'), createTime: now, updateTime: now };
  await STAFF_TABLE.add(newItem);
  return newItem;
}

export async function updateStaff(id: string, updates: Partial<Staff>): Promise<Staff | null> {
  const existing = await STAFF_TABLE.get(id);
  if (!existing) return null;
  const updated: Staff = { ...existing, ...updates, id, updateTime: nowString() };
  await STAFF_TABLE.put(updated);
  return updated;
}

export async function deleteStaff(id: string): Promise<boolean> {
  const existing = await STAFF_TABLE.get(id);
  if (!existing) return false;
  await STAFF_TABLE.delete(id);
  return true;
}

export async function deleteStaffs(ids: string[]): Promise<boolean> {
  await STAFF_TABLE.bulkDelete(ids);
  return true;
}

export async function resetStaffs(): Promise<void> {
  await STAFF_TABLE.clear();
}

function getDefaultStaffs(): Staff[] {
  return [];
}
