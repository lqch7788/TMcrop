/**
 * LocalStorage → Dexie.js 一键迁移脚本
 * 读取 localStorage 中所有 crop_* keys，解析后批量写入 Dexie.js
 * 图片 base64 保持原样存入 Dexie.js（IndexedDB 原生支持大字符串）
 */

import { db } from '@/services/dexie/db';
import {
  SeedSource, Seedling, Planting,
  CropInstance, CropOrder, CropVariety,
  SourceType, SeedlingStatus, PlantingStatus, StockStatus,
} from '@/types/crop';
import { HarvestRecord } from '@/types';

const LS_KEYS = {
  seedSources: 'crop_seed_sources',
  seedlings: 'crop_seedlings',
  plantings: 'crop_plantings',
  harvests: 'harvest_records',
  cropInstances: 'crop_instances',
  cropOrders: 'crop_orders',
  cropVarieties: 'crop_varieties',
};

interface MigrationResult {
  success: boolean;
  message: string;
  details: Record<string, { sourceCount: number; migratedCount: number; error?: string }>;
}

/**
 * 执行完整迁移
 */
export async function migrateLocalStorageToDexie(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    message: '迁移完成',
    details: {},
  };

  // 1. 种源
  try {
    const raw = localStorage.getItem(LS_KEYS.seedSources);
    const data: SeedSource[] = raw ? JSON.parse(raw) : [];
    if (data.length > 0) {
      await db.seedSources.clear();
      await db.seedSources.bulkAdd(data);
    }
    result.details.seedSources = { sourceCount: data.length, migratedCount: data.length };
  } catch (e: any) {
    result.details.seedSources = { sourceCount: 0, migratedCount: 0, error: e.message };
  }

  // 2. 育苗
  try {
    const raw = localStorage.getItem(LS_KEYS.seedlings);
    const data: Seedling[] = raw ? JSON.parse(raw) : [];
    if (data.length > 0) {
      await db.seedlings.clear();
      await db.seedlings.bulkAdd(data);
      // 同步 dailyRecords 到独立表
      const allDRs = data.flatMap(s => s.dailyRecords || []);
      if (allDRs.length > 0) {
        await db.dailyRecords.clear();
        await db.dailyRecords.bulkAdd(allDRs);
      }
    }
    result.details.seedlings = { sourceCount: data.length, migratedCount: data.length };
  } catch (e: any) {
    result.details.seedlings = { sourceCount: 0, migratedCount: 0, error: e.message };
  }

  // 3. 种植
  try {
    const raw = localStorage.getItem(LS_KEYS.plantings);
    const data: Planting[] = raw ? JSON.parse(raw) : [];
    if (data.length > 0) {
      await db.plantings.clear();
      await db.plantings.bulkAdd(data);
    }
    result.details.plantings = { sourceCount: data.length, migratedCount: data.length };
  } catch (e: any) {
    result.details.plantings = { sourceCount: 0, migratedCount: 0, error: e.message };
  }

  // 4. 采收
  try {
    const raw = localStorage.getItem(LS_KEYS.harvests);
    const data: HarvestRecord[] = raw ? JSON.parse(raw) : [];
    if (data.length > 0) {
      await db.harvests.clear();
      await db.harvests.bulkAdd(data);
    }
    result.details.harvests = { sourceCount: data.length, migratedCount: data.length };
  } catch (e: any) {
    result.details.harvests = { sourceCount: 0, migratedCount: 0, error: e.message };
  }

  // 5. 作物实例
  try {
    const raw = localStorage.getItem(LS_KEYS.cropInstances);
    const data: CropInstance[] = raw ? JSON.parse(raw) : [];
    if (data.length > 0) {
      await db.cropInstances.clear();
      await db.cropInstances.bulkAdd(data);
    }
    result.details.cropInstances = { sourceCount: data.length, migratedCount: data.length };
  } catch (e: any) {
    result.details.cropInstances = { sourceCount: 0, migratedCount: 0, error: e.message };
  }

  // 6. 作物订单
  try {
    const raw = localStorage.getItem(LS_KEYS.cropOrders);
    const data: CropOrder[] = raw ? JSON.parse(raw) : [];
    if (data.length > 0) {
      await db.cropOrders.clear();
      await db.cropOrders.bulkAdd(data);
    }
    result.details.cropOrders = { sourceCount: data.length, migratedCount: data.length };
  } catch (e: any) {
    result.details.cropOrders = { sourceCount: 0, migratedCount: 0, error: e.message };
  }

  // 7. 品种库
  try {
    const raw = localStorage.getItem(LS_KEYS.cropVarieties);
    const data: CropVariety[] = raw ? JSON.parse(raw) : [];
    if (data.length > 0) {
      await db.cropVarieties.clear();
      await db.cropVarieties.bulkAdd(data);
    }
    result.details.cropVarieties = { sourceCount: data.length, migratedCount: data.length };
  } catch (e: any) {
    result.details.cropVarieties = { sourceCount: 0, migratedCount: 0, error: e.message };
  }

  // 统计
  const totalMigrated = Object.values(result.details).reduce((sum, d) => sum + d.migratedCount, 0);
  const hasErrors = Object.values(result.details).some(d => d.error);
  result.success = !hasErrors;
  result.message = hasErrors
    ? `迁移完成，部分失败。共迁移 ${totalMigrated} 条记录。`
    : `迁移成功！共迁移 ${totalMigrated} 条记录。`;

  return result;
}

/**
 * 检查 localStorage 中是否有作物管理数据
 */
export function hasLocalStorageData(): boolean {
  return Object.values(LS_KEYS).some(key => !!localStorage.getItem(key));
}

/**
 * 获取 localStorage 数据概览
 */
export function getLocalStorageDataSummary(): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const [name, key] of Object.entries(LS_KEYS)) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        summary[name] = Array.isArray(arr) ? arr.length : 0;
      } catch {
        summary[name] = -1;
      }
    } else {
      summary[name] = 0;
    }
  }
  return summary;
}
