/**
 * 合同记录 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IContractService } from '../interfaces';
import { nowString, generateId } from './utils';

const CONTRACTS_TABLE = db.contracts;

export async function initContractRecords(): Promise<ContractRecord[]> {
  const count = await CONTRACTS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultContractRecords();
    if (defaults.length > 0) {
      await CONTRACTS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return CONTRACTS_TABLE.toArray();
}

export async function getContractRecords(): Promise<ContractRecord[]> {
  return CONTRACTS_TABLE.toArray();
}

export async function getContractRecordById(id: string): Promise<ContractRecord | undefined> {
  return CONTRACTS_TABLE.get(id);
}

export async function addContractRecord(
  item: Omit<ContractRecord, 'id' | 'createTime' | 'updateTime'>
): Promise<ContractRecord> {
  const now = nowString();
  const newItem: ContractRecord = { ...item, id: generateId('CO'), createTime: now, updateTime: now };
  await CONTRACTS_TABLE.add(newItem);
  return newItem;
}

export async function updateContractRecord(id: string, updates: Partial<ContractRecord>): Promise<ContractRecord | null> {
  const existing = await CONTRACTS_TABLE.get(id);
  if (!existing) return null;
  const updated: ContractRecord = { ...existing, ...updates, id, updateTime: nowString() };
  await CONTRACTS_TABLE.put(updated);
  return updated;
}

export async function deleteContractRecord(id: string): Promise<boolean> {
  const existing = await CONTRACTS_TABLE.get(id);
  if (!existing) return false;
  await CONTRACTS_TABLE.delete(id);
  return true;
}

export async function deleteContractRecords(ids: string[]): Promise<boolean> {
  await CONTRACTS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetContractRecords(): Promise<void> {
  await CONTRACTS_TABLE.clear();
}

function getDefaultContractRecords(): ContractRecord[] {
  return [];
}
