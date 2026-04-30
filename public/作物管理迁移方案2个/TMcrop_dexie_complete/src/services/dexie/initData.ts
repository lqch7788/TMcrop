/**
 * Dexie.js 首次启动自动导入默认数据
 * 从 src/data/cropData.ts 导入 Mock 数据到 IndexedDB
 * 仅在对应表为空时执行，避免覆盖已有数据
 */

import { db } from './db';
import {
  seedSources as defaultSeedSources,
  seedlings as defaultSeedlings,
  plantings as defaultPlantings,
} from '@/data/cropData';
import { SeedSource, Seedling, Planting } from '@/types/crop';
import { HarvestRecord } from '@/types';

/**
 * 初始化默认采收数据
 */
const defaultHarvests: HarvestRecord[] = [
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
 * 初始化所有默认数据
 * 仅在表为空时填充，安全调用多次不会覆盖
 */
export async function initDexieDefaultData(): Promise<{
  seedSources: number;
  seedlings: number;
  plantings: number;
  harvests: number;
  cropInstances: number;
  cropOrders: number;
}> {
  const result = {
    seedSources: 0,
    seedlings: 0,
    plantings: 0,
    harvests: 0,
    cropInstances: 0,
    cropOrders: 0,
  };

  // 1. 种源
  const ssCount = await db.seedSources.count();
  if (ssCount === 0) {
    await db.seedSources.bulkAdd(defaultSeedSources);
    result.seedSources = defaultSeedSources.length;
  }

  // 2. 育苗
  const slCount = await db.seedlings.count();
  if (slCount === 0) {
    await db.seedlings.bulkAdd(defaultSeedlings);
    result.seedlings = defaultSeedlings.length;
    // 同步 dailyRecords
    const allDRs = defaultSeedlings.flatMap(s => s.dailyRecords || []);
    if (allDRs.length > 0) {
      await db.dailyRecords.bulkAdd(allDRs);
    }
  }

  // 3. 种植
  const plCount = await db.plantings.count();
  if (plCount === 0) {
    await db.plantings.bulkAdd(defaultPlantings);
    result.plantings = defaultPlantings.length;
  }

  // 4. 采收
  const hvCount = await db.harvests.count();
  if (hvCount === 0) {
    await db.harvests.bulkAdd(defaultHarvests);
    result.harvests = defaultHarvests.length;
  }

  // 5. 作物实例（空表，不预置）
  // 6. 作物订单（空表，不预置）
  // 7. 品种库由 cropVarietyService.initVarieties() 处理

  return result;
}

/**
 * 检查 Dexie 是否已初始化
 */
export async function isDexieInitialized(): Promise<boolean> {
  const total = await db.seedSources.count() + await db.seedlings.count() + await db.plantings.count();
  return total > 0;
}
