/**
 * 审批单 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IApprovalService } from '../interfaces';
import { nowString, generateId } from './utils';

const APPROVALS_TABLE = db.approvals;

export async function initApprovals(): Promise<Approval[]> {
  const count = await APPROVALS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultApprovals();
    if (defaults.length > 0) {
      await APPROVALS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return APPROVALS_TABLE.toArray();
}

export async function getApprovals(): Promise<Approval[]> {
  return APPROVALS_TABLE.toArray();
}

export async function getApprovalById(id: string): Promise<Approval | undefined> {
  return APPROVALS_TABLE.get(id);
}

export async function addApproval(
  item: Omit<Approval, 'id' | 'createTime' | 'updateTime'>
): Promise<Approval> {
  const now = nowString();
  const newItem: Approval = { ...item, id: generateId('AP'), createTime: now, updateTime: now };
  await APPROVALS_TABLE.add(newItem);
  return newItem;
}

export async function updateApproval(id: string, updates: Partial<Approval>): Promise<Approval | null> {
  const existing = await APPROVALS_TABLE.get(id);
  if (!existing) return null;
  const updated: Approval = { ...existing, ...updates, id, updateTime: nowString() };
  await APPROVALS_TABLE.put(updated);
  return updated;
}

export async function deleteApproval(id: string): Promise<boolean> {
  const existing = await APPROVALS_TABLE.get(id);
  if (!existing) return false;
  await APPROVALS_TABLE.delete(id);
  return true;
}

export async function deleteApprovals(ids: string[]): Promise<boolean> {
  await APPROVALS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetApprovals(): Promise<void> {
  await APPROVALS_TABLE.clear();
}

function getDefaultApprovals(): Approval[] {
  return [];
}
