/**
 * 采收入库数据服务
 * 使用 localStorage 实现数据持久化
 */

import { HarvestRecord } from '../types/index';

const STORAGE_KEY = 'harvest_records';

// 初始默认数据
const defaultData: HarvestRecord[] = [
  {
    id: '1',
    harvestCode: 'HS202604001',
    batchId: '1',
    batchCode: 'ZZ2026-001',
    cropName: '番茄',
    greenhouseId: 'GH001',
    greenhouseName: '1号大棚',
    harvestDate: '2026-04-15',
    harvestArea: 100,
    harvestQuantity: 500,
    unit: '公斤',
    quality: 'excellent',
    grade: 'A',
    harvesterIds: ['U001', 'U002'],
    harvesterNames: ['张三', '李四'],
    warehouseId: 'WH001',
    warehouseName: '主仓库',
    status: 'stored',
    auditor: '王五',
    variety: '红果番茄',
    plantingMode: '大棚种植',
    targetYield: 600,
    relatedTaskId: 'T001',
    relatedTaskCode: 'AGR20260401001',
  },
  {
    id: '2',
    harvestCode: 'HS202604002',
    batchId: '2',
    batchCode: 'ZZ2026-002',
    cropName: '黄瓜',
    greenhouseId: 'GH002',
    greenhouseName: '2号大棚',
    harvestDate: '2026-04-18',
    harvestArea: 80,
    harvestQuantity: 300,
    unit: '公斤',
    quality: 'good',
    grade: 'B',
    harvesterIds: ['U003'],
    harvesterNames: ['王六'],
    warehouseId: 'WH001',
    warehouseName: '主仓库',
    status: 'graded',
    auditor: '赵七',
    variety: '水果黄瓜',
    plantingMode: '露天种植',
    targetYield: 350,
    relatedTaskId: 'T002',
    relatedTaskCode: 'AGR20260402002',
  },
];

/**
 * 初始化数据 - 从localStorage读取或使用默认数据
 */
export function initHarvestRecords(): HarvestRecord[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultData;
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  return defaultData;
}

/**
 * 获取所有采收记录
 */
export function getHarvestRecords(): HarvestRecord[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultData;
    }
  }
  return initHarvestRecords();
}

/**
 * 根据ID获取单条记录
 */
export function getHarvestRecordById(id: string): HarvestRecord | undefined {
  const records = getHarvestRecords();
  return records.find(r => r.id === id);
}

/**
 * 根据ID数组获取多条记录
 */
export function getHarvestRecordsByIds(ids: string[]): HarvestRecord[] {
  const records = getHarvestRecords();
  return records.filter(r => ids.includes(r.id));
}

/**
 * 根据批次号获取采收记录
 */
export function getHarvestRecordsByBatchCode(batchCode: string): HarvestRecord[] {
  const records = getHarvestRecords();
  return records.filter(r => r.batchCode === batchCode);
}

/**
 * 添加新记录
 */
export function addHarvestRecord(
  record: Omit<HarvestRecord, 'id'>
): HarvestRecord {
  const records = getHarvestRecords();
  const newRecord: HarvestRecord = {
    ...record,
    id: String(Date.now()),
  };
  records.unshift(newRecord);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return newRecord;
}

/**
 * 批量添加记录
 */
export function addHarvestRecords(
  newRecords: Omit<HarvestRecord, 'id'>[]
): HarvestRecord[] {
  const records = getHarvestRecords();
  const created = newRecords.map(record => ({
    ...record,
    id: String(Date.now() + Math.random()),
  }));
  records.unshift(...created);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return created;
}

/**
 * 更新记录
 */
export function updateHarvestRecord(
  id: string,
  updates: Partial<HarvestRecord>
): HarvestRecord | null {
  const records = getHarvestRecords();
  const index = records.findIndex(r => r.id === id);
  if (index === -1) return null;

  records[index] = {
    ...records[index],
    ...updates,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return records[index];
}

/**
 * 删除记录
 */
export function deleteHarvestRecord(id: string): boolean {
  const records = getHarvestRecords();
  const index = records.findIndex(r => r.id === id);
  if (index === -1) return false;

  records.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return true;
}

/**
 * 批量删除记录
 */
export function deleteHarvestRecords(ids: string[]): boolean {
  const records = getHarvestRecords();
  const filtered = records.filter(r => !ids.includes(r.id));
  if (filtered.length === records.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * 生成采收单号
 */
export function generateHarvestCode(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
  const existingCodes = getHarvestRecords().filter(r => r.harvestCode.includes(dateStr));
  const seq = existingCodes.length + 1;
  return `HS${dateStr}${String(seq).padStart(3, '0')}`;
}

/**
 * 重置数据到默认状态
 */
export function resetHarvestRecords(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
}
