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
 * 统一的数据读取函数 - 从localStorage读取并解析
 */
function getStoredData(): HarvestRecord[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('采收数据解析失败:', error);
      return defaultData;
    }
  }
  return defaultData;
}

/**
 * 初始化数据 - 从localStorage读取或使用默认数据
 */
export function initHarvestRecords(): HarvestRecord[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    // localStorage 为空时，初始化默认数据
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
  }
  try {
    const data = JSON.parse(stored);
    return data.length > 0 ? data : defaultData;
  } catch {
    return defaultData;
  }
}

/**
 * 获取所有采收记录
 */
export function getHarvestRecords(): HarvestRecord[] {
  return getStoredData();
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

/**
 * 更新补录记录状态（审批通过后调用）
 * @param harvestCode 采收单号
 * @param supplementaryStatus 补录状态：approved-已通过，rejected-已驳回
 * @param supplementaryApprover 审核人
 * @param supplementaryDate 审核日期
 */
export function updateSupplementaryStatus(
  harvestCode: string,
  supplementaryStatus: 'approved' | 'rejected',
  supplementaryApprover: string,
  supplementaryDate: string
): HarvestRecord | null {
  const records = getHarvestRecords();
  const index = records.findIndex(r => r.harvestCode === harvestCode && r.isSupplementary);
  if (index === -1) return null;

  records[index] = {
    ...records[index],
    supplementaryStatus,
    supplementaryApprover,
    supplementaryDate,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return records[index];
}

/**
 * 根据补录状态获取记录
 * @param status 补录状态
 */
export function getHarvestRecordsBySupplementaryStatus(
  status: 'pending' | 'approved' | 'rejected'
): HarvestRecord[] {
  const records = getHarvestRecords();
  return records.filter(r => r.isSupplementary && r.supplementaryStatus === status);
}

/**
 * 获取所有待审核的补录记录
 */
export function getPendingSupplementaryRecords(): HarvestRecord[] {
  return getHarvestRecordsBySupplementaryStatus('pending');
}

