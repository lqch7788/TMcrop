/**
 * 种植数据服务
 * 使用 localStorage 实现数据持久化
 */

import { Planting, PlantingStatus, SourceType, LabelPrintType, PrintRecord } from '../types/crop';

const STORAGE_KEY = 'crop_plantings';

// 初始化默认数据
const defaultData: Planting[] = [
  {
    id: 'PL001',
    plantCode: 'ZZ2026-001-01',
    sourceType: SourceType.SEEDLING,
    sourceId: 'SD001',
    sourceCode: 'YM2026-001',
    cropName: '番茄',
    cropVariety: '红果番茄',
    areaId: 'G001',
    areaName: '一棚 > 01区',
    rootName: '一棚',
    plantingCount: 40000,
    plantingDate: '2026-03-01',
    soilPH: 6.5,
    soilEC: 1.2,
    transplantCount: 40000,
    transplantDate: '2026-03-05',
    isHarvest: false,
    attritionRate: 5,
    printCount: 1,
    traceabilityCode: 'TR202603010001',
    pictures: [],
    status: PlantingStatus.GROWING,
    remarks: '长势良好',
    createBy: '李明辉',
    createTime: '2026-03-01 09:00:00',
    updateTime: '2026-04-20 16:00:00'
  },
  {
    id: 'PL002',
    plantCode: 'ZZ2026-002-01',
    sourceType: SourceType.SEED,
    sourceId: 'SS003',
    sourceCode: 'ZZ2026-003',
    cropName: '黄瓜',
    cropVariety: '水果黄瓜',
    areaId: 'G002',
    areaName: '一棚 > 02区',
    rootName: '一棚',
    plantingCount: 5000,
    plantingDate: '2026-03-15',
    soilPH: 6.8,
    soilEC: 1.5,
    isHarvest: true,
    harvestDate: '2026-04-15',
    attritionRate: 3,
    printCount: 2,
    traceabilityCode: 'TR202603150002',
    pictures: [],
    status: PlantingStatus.HARVESTED,
    remarks: '第一批采收完成',
    createBy: '王建国',
    createTime: '2026-03-15 10:00:00',
    updateTime: '2026-04-15 18:00:00'
  }
];

/**
 * 统一的数据读取函数 - 从localStorage读取并解析
 */
function getStoredData(): Planting[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('种植数据解析失败:', error);
      return defaultData;
    }
  }
  return defaultData;
}

/**
 * 初始化数据 - 从localStorage读取或使用默认数据
 */
export function initPlantings(): Planting[] {
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
 * 获取所有种植数据
 */
export function getPlantings(): Planting[] {
  return getStoredData();
}

/**
 * 根据ID获取单条种植记录
 */
export function getPlantingById(id: string): Planting | undefined {
  const plantings = getPlantings();
  return plantings.find(p => p.id === id);
}

/**
 * 根据ID数组获取多条种植记录
 */
export function getPlantingsByIds(ids: string[]): Planting[] {
  const plantings = getPlantings();
  return plantings.filter(p => ids.includes(p.id));
}

/**
 * 根据来源ID获取种植记录（用于级联查询）
 */
export function getPlantingsBySourceId(sourceId: string): Planting[] {
  const plantings = getPlantings();
  return plantings.filter(p => p.sourceId === sourceId);
}

/**
 * 添加新种植记录
 */
export function addPlanting(planting: Omit<Planting, 'id' | 'createTime' | 'updateTime'>): Planting {
  const plantings = getPlantings();
  const newPlanting: Planting = {
    ...planting,
    id: 'PL' + Date.now(),
    createTime: new Date().toLocaleString('zh-CN'),
    updateTime: new Date().toLocaleString('zh-CN')
  };
  plantings.push(newPlanting);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plantings));
  return newPlanting;
}

/**
 * 更新种植记录
 */
export function updatePlanting(id: string, updates: Partial<Planting>): Planting | null {
  const plantings = getPlantings();
  const index = plantings.findIndex(p => p.id === id);
  if (index === -1) return null;

  plantings[index] = {
    ...plantings[index],
    ...updates,
    updateTime: new Date().toLocaleString('zh-CN')
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plantings));
  return plantings[index];
}

/**
 * 删除种植记录
 */
export function deletePlanting(id: string): boolean {
  const plantings = getPlantings();
  const index = plantings.findIndex(p => p.id === id);
  if (index === -1) return false;

  plantings.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plantings));
  return true;
}

/**
 * 批量删除种植记录
 */
export function deletePlantings(ids: string[]): boolean {
  const plantings = getPlantings();
  const filtered = plantings.filter(p => !ids.includes(p.id));
  if (filtered.length === plantings.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * 采收登记
 */
export function harvestPlanting(id: string, harvestDate: string, harvestCount?: number): boolean {
  const planting = getPlantingById(id);
  if (!planting) return false;

  updatePlanting(id, {
    isHarvest: true,
    harvestDate,
    status: PlantingStatus.HARVESTED,
    attritionRate: harvestCount ? Math.round((1 - harvestCount / planting.plantingCount) * 100) : planting.attritionRate
  });
  return true;
}

/**
 * 获取未采收的种植列表
 */
export function getUnharvestedPlantings(): Planting[] {
  const plantings = getPlantings();
  return plantings.filter(p => !p.isHarvest);
}

/**
 * 获取已采收的种植列表
 */
export function getHarvestedPlantings(): Planting[] {
  const plantings = getPlantings();
  return plantings.filter(p => p.isHarvest);
}

/**
 * 生成种植批号
 */
export function generatePlantCode(sourceCode: string): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `${sourceCode}-${dateStr}`;
}

/**
 * 重置数据到默认状态
 */
export function resetPlantings(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
}

/**
 * 生成单个二维码编号
 * 格式：ZZ + 种植批号 + 序号（3位）
 */
export function generateLabelNumber(plantCode: string, index: number): string {
  return `${plantCode}-${String(index).padStart(3, '0')}`;
}

/**
 * 生成种植批号对应的所有二维码编号
 * @param plantingId 种植ID
 */
export function generateAllLabelNumbers(plantingId: string): string[] {
  const planting = getPlantingById(plantingId);
  if (!planting) return [];

  const labels: string[] = [];
  for (let i = 0; i < planting.plantingCount; i++) {
    labels.push(generateLabelNumber(planting.plantCode, i + 1));
  }
  return labels;
}

/**
 * 获取打印记录
 * @param plantingId 种植ID
 */
export function getPrintRecords(plantingId: string): PrintRecord[] {
  const planting = getPlantingById(plantingId);
  return planting?.printRecords || [];
}

/**
 * 打印标签
 * @param plantingId 种植ID
 * @param printType 打印类型
 * @param printCount 打印数量
 * @param operator 操作人员
 * @param labelNumbers 指定二维码编号（重打印时）
 */
export function printLabel(
  plantingId: string,
  printType: LabelPrintType,
  printCount: number,
  operator: string,
  labelNumbers?: string[]
): PrintRecord | null {
  const planting = getPlantingById(plantingId);
  if (!planting) return null;

  // 生成打印记录
  const printRecord: PrintRecord = {
    id: 'PR' + Date.now(),
    printTime: new Date().toLocaleString('zh-CN'),
    printType,
    printCount,
    operator,
    labelNumbers: labelNumbers || []
  };

  // 初始化打印记录数组
  if (!planting.printRecords) {
    planting.printRecords = [];
  }
  planting.printRecords.push(printRecord);

  // 更新打印次数
  const newPrintCount = (planting.printCount || 0) + printCount;
  updatePlanting(plantingId, {
    printRecords: planting.printRecords,
    printCount: newPrintCount
  });

  return printRecord;
}
