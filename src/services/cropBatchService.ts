/**
 * 生产计划批次服务
 * 使用 localStorage 实现数据持久化
 * 提供结束计划功能（正常结束/异常结束）
 */

import { CropBatch } from '../types/index';

const STORAGE_KEY = 'crop_batches';

// 初始化默认数据
const defaultData: CropBatch[] = [
  // 种源计划（育种计划）
  { id: 'B101', batchCode: 'JZB2026-001', planType: 'seed_breeding', planTypeName: '育种计划', cropName: '番茄', cropType: '茄果类', variety: '红果番茄', greenhouseId: '', greenhouseName: '', plantingArea: 0, stage: 'seedling', stageName: '种子期', startDate: '2026-01-05', expectedHarvestDate: '2026-01-15', targetYield: 0, actualYield: 0, status: 'planned', plantingMode: '', responsiblePerson: '王建国', publisher: '陆启闯', publishDate: '2026-01-03', lastModifyDate: '2026-01-03', batchStatus: 'published', supplierName: '先正达种业', seedQuantity: 500, unit: 'kg', targetQuantity: 500 },
  { id: 'B102', batchCode: 'JZB2026-002', planType: 'seed_breeding', planTypeName: '育种计划', cropName: '黄瓜', cropType: '瓜类', variety: '水果黄瓜', greenhouseId: '', greenhouseName: '', plantingArea: 0, stage: 'seedling', stageName: '种子期', startDate: '2026-01-08', expectedHarvestDate: '2026-01-18', targetYield: 0, actualYield: 0, status: 'planned', plantingMode: '', responsiblePerson: '李明辉', publisher: '陆启闯', publishDate: '2026-01-06', lastModifyDate: '2026-01-06', batchStatus: 'in_progress', supplierName: '圣尼斯种业', seedQuantity: 300, unit: 'kg', targetQuantity: 300 },
  // 育苗计划
  { id: 'B201', batchCode: 'YMB2026-001', planType: 'seedling', planTypeName: '育苗计划', cropName: '番茄', cropType: '茄果类', variety: '红果番茄', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', plantingArea: 500, stage: 'seedling', stageName: '苗期', startDate: '2026-01-20', expectedHarvestDate: '2026-03-20', targetYield: 0, actualYield: 0, status: 'planned', plantingMode: '椰糠育苗', responsiblePerson: '陈小芳', publisher: '陆启闯', publishDate: '2026-01-15', lastModifyDate: '2026-01-15', batchStatus: 'published', seedlingSiteName: '育苗基地A区', targetSeedlingCount: 45000, unit: '株', targetQuantity: 45000 },
  { id: 'B202', batchCode: 'YMB2026-002', planType: 'seedling', planTypeName: '育苗计划', cropName: '黄瓜', cropType: '瓜类', variety: '水果黄瓜', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', plantingArea: 400, stage: 'seedling', stageName: '苗期', startDate: '2026-01-25', expectedHarvestDate: '2026-03-15', targetYield: 0, actualYield: 0, status: 'planned', plantingMode: '水培育苗', responsiblePerson: '周志强', publisher: '陆启闯', publishDate: '2026-01-20', lastModifyDate: '2026-01-20', batchStatus: 'in_progress', seedlingSiteName: '育苗基地B区', targetSeedlingCount: 35000, unit: '株', targetQuantity: 35000 },
  { id: 'B203', batchCode: 'YMB2026-003', planType: 'seedling', planTypeName: '育苗计划', cropName: '草莓', cropType: '浆果类', variety: '红颜', greenhouseId: 'G004', greenhouseName: '日光温室1号', plantingArea: 200, stage: 'seedling', stageName: '苗期', startDate: '2026-02-01', expectedHarvestDate: '2026-04-01', targetYield: 0, actualYield: 0, status: 'planned', plantingMode: '土壤育苗', responsiblePerson: '吴美丽', publisher: '陆启闯', publishDate: '2026-01-28', lastModifyDate: '2026-01-28', batchStatus: 'published', seedlingSiteName: '草莓育苗区', targetSeedlingCount: 15000, unit: '株', targetQuantity: 15000 },
  // 种植计划
  { id: 'B301', batchCode: 'ZZB2026-001', planType: 'planting', planTypeName: '种植计划', cropName: '番茄', cropType: '茄果类', variety: '红果番茄', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', plantingArea: 3000, stage: 'vegetative', stageName: '生长期', startDate: '2026-03-25', expectedHarvestDate: '2026-07-15', targetYield: 30000, actualYield: 0, status: 'planned', plantingMode: '椰糠种植', responsiblePerson: '郭靖', publisher: '陆启闯', publishDate: '2026-03-20', lastModifyDate: '2026-03-20', batchStatus: 'published', targetQuantity: 30000 },
  { id: 'B302', batchCode: 'ZZB2026-002', planType: 'planting', planTypeName: '种植计划', cropName: '黄瓜', cropType: '瓜类', variety: '水果黄瓜', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', plantingArea: 2500, stage: 'seedling', stageName: '苗期', startDate: '2026-03-20', expectedHarvestDate: '2026-06-20', targetYield: 25000, actualYield: 0, status: 'planned', plantingMode: '椰糠种植', responsiblePerson: '黄蓉', publisher: '陆启闯', publishDate: '2026-03-15', lastModifyDate: '2026-03-15', batchStatus: 'published', targetQuantity: 25000 },
  { id: 'B303', batchCode: 'ZZB2026-003', planType: 'planting', planTypeName: '种植计划', cropName: '草莓', cropType: '浆果类', variety: '红颜', greenhouseId: 'G004', greenhouseName: '日光温室1号', plantingArea: 800, stage: 'harvest', stageName: '采收期', startDate: '2025-11-01', expectedHarvestDate: '2026-04-30', targetYield: 5000, actualYield: 2100, status: 'in_progress', plantingMode: '土壤种植', responsiblePerson: '张无忌', publisher: '陆启闯', publishDate: '2025-10-25', lastModifyDate: '2026-04-10', batchStatus: 'in_progress', targetQuantity: 5000 },
];

/**
 * 初始化数据 - 从localStorage读取或使用默认数据
 */
export function initCropBatches(): CropBatch[] {
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
 * 获取所有生产计划
 */
export function getCropBatches(): CropBatch[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultData;
    }
  }
  return initCropBatches();
}

/**
 * 根据ID获取单个生产计划
 */
export function getCropBatchById(id: string): CropBatch | undefined {
  const batches = getCropBatches();
  return batches.find(b => b.id === id);
}

/**
 * 根据批次号获取单个生产计划
 */
export function getCropBatchByCode(batchCode: string): CropBatch | undefined {
  const batches = getCropBatches();
  return batches.find(b => b.batchCode === batchCode);
}

/**
 * 更新生产计划
 */
export function updateCropBatch(id: string, updates: Partial<CropBatch>): CropBatch | null {
  const batches = getCropBatches();
  const index = batches.findIndex(b => b.id === id);
  if (index === -1) return null;

  batches[index] = {
    ...batches[index],
    ...updates,
    lastModifyDate: new Date().toLocaleString('zh-CN')
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  return batches[index];
}

/**
 * 结束生产计划
 * @param id 生产计划ID
 * @param endType 结束类型：normal-正常结束，abnormal-异常结束
 * @returns 更新后的生产计划或null
 */
export function endCropBatch(id: string, endType: 'normal' | 'abnormal'): CropBatch | null {
  const batch = getCropBatchById(id);
  if (!batch) return null;

  // 更新状态为已完成
  const updates: Partial<CropBatch> = {
    batchStatus: 'completed',
    endType: endType,
    lastModifyDate: new Date().toLocaleString('zh-CN')
  };

  return updateCropBatch(id, updates);
}

/**
 * 检查生产计划是否可以进行入库操作
 * @param id 生产计划ID
 * @returns 是否可以入库
 */
export function canInbound(id: string): { allowed: boolean; reason?: string } {
  const batch = getCropBatchById(id);
  if (!batch) {
    return { allowed: false, reason: '生产计划不存在' };
  }

  if (batch.batchStatus === 'completed') {
    if (batch.endType === 'normal') {
      return { allowed: false, reason: '该计划已正常结束，禁止入库和补录' };
    } else if (batch.endType === 'abnormal') {
      // 异常结束的计划允许补录
      return { allowed: true, reason: '该计划已异常结束，可以补录入库（需审核）' };
    }
  }

  return { allowed: true };
}

/**
 * 获取计划完成比例
 * @param batch 生产计划
 * @param currentQuantity 当前数量（入库数量）
 * @returns 完成比例（0-1之间）
 */
export function getCompletionRate(batch: CropBatch, currentQuantity: number): number {
  if (!batch.targetQuantity || batch.targetQuantity === 0) {
    return 0;
  }
  return Math.min(currentQuantity / batch.targetQuantity, 1);
}

/**
 * 重置数据到默认状态
 */
export function resetCropBatches(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
}
