/**
 * IndexedDB 数据库模块 - 使用 Dexie.js 封装
 *
 * 相比 localStorage 的优势：
 * - 存储容量大（可存储数百MB甚至GB级数据）
 * - 支持索引查询，性能更好
 * - 支持事务，数据一致性有保障
 * - API 现代化，使用 Promise
 *
 * 版本：v1.0
 * 创建时间：2026-05-01
 */

import Dexie, { Table } from 'dexie';

// ============================================
// 类型定义
// ============================================

// 订单
export interface CropOrder {
  id?: number;
  orderCode: string;
  orderType: string;
  orderName: string;
  cropCategory: string;
  cropName: string;
  cropVariety: string;
  plannedQuantity: number;
  actualQuantity: number;
  unit: string;
  customer: string;
  status: string;
  instanceIds: string[];
  createBy: string;
  createTime: string;
  updateTime: string;
}

// 作物实例
export interface CropInstance {
  id?: number;
  instanceCode: string;
  orderId: string;
  orderCode: string;
  cropCategory: string;
  cropName: string;
  cropVariety: string;
  categoryCode: string;
  typeCode: string;
  subCode: string;
  sourceOrigin: string;
  sourceDescription: string;
  initialQuantity: number;
  currentQuantity: number;
  plantedQuantity: number;
  harvestedQuantity: number;
  unit: string;
  status: string;
  seedEntryDate: string;
  plantingDate?: string;
  harvestDate?: string;
  createBy: string;
  createTime: string;
  updateTime: string;
}

// 种源记录
export interface SeedSource {
  id?: number;
  seedCode: string;
  sourceType: string;
  sourceOrigin: string;
  cropCategory: string;
  cropName: string;
  cropVariety: string;
  supplierName: string;
  purchaseDate: string;
  purchaseQuantity: number;
  initialCount: number;
  availableCount: number;
  lossCount: number;
  unit: string;
  instanceId: string;
  orderId: string;
  orderCode: string;
  status: string;
  printRecords: any[];
  createBy: string;
  createTime: string;
  updateTime: string;
}

// 育苗记录
export interface Seedling {
  id?: number;
  seedlingCode: string;
  sourceId: string;
  instanceId: string;
  orderId: string;
  orderCode: string;
  cropCategory: string;
  cropName: string;
  cropVariety: string;
  siteId: string;
  siteName: string;
  sourceCode: string;
  sourceOrigin: string;
  initialCount: number;
  survivalCount: number;
  lossCount: number;
  remainingCount: number;
  survivalRate: number;
  lossRate: number;
  startDate: string;
  endDate: string;
  status: string;
  dailyRecords: any[];
  transplantRecords: any[];
  printRecords: any[];
  createBy: string;
  createTime: string;
  updateTime: string;
}

// 种植记录
export interface Planting {
  id?: number;
  plantCode: string;
  sourceType: string;
  sourceId: string;
  instanceId: string;
  orderId: string;
  orderCode: string;
  cropCategory: string;
  cropName: string;
  cropVariety: string;
  areaId: string;
  areaName: string;
  plantingDate: string;
  plantingCount: number;
  lossRate: number;
  lossCount: number;
  survivalCount: number;
  status: string;
  harvestRecords: any[];
  printRecords: any[];
  createBy: string;
  createTime: string;
  updateTime: string;
}

// 采收记录
export interface HarvestRecord {
  id?: number;
  harvestCode: string;
  batchId: string;
  batchCode: string;
  instanceId: string;
  orderId: string;
  orderCode: string;
  cropCategory: string;
  cropName: string;
  variety: string;
  greenhouseId: string;
  greenhouseName: string;
  harvestDate: string;
  harvestArea: number;
  harvestQuantity: number;
  unit: string;
  quality: string;
  grade: string;
  harvesterIds: string[];
  harvesterNames: string[];
  warehouseId: string;
  warehouseName: string;
  status: string;
  auditor: string;
  plantingMode: string;
  targetYield: number;
  storageLocation: string;
  createBy: string;
  createTime: string;
  updateTime: string;
}

// ============================================
// 数据库类定义
// ============================================

class CropDatabase extends Dexie {
  // 表定义
  orders!: Table<CropOrder, number>;
  instances!: Table<CropInstance, number>;
  seedSources!: Table<SeedSource, number>;
  seedlings!: Table<Seedling, number>;
  plantings!: Table<Planting, number>;
  harvestRecords!: Table<HarvestRecord, number>;

  constructor() {
    super('CropManagementDB');

    this.version(1).stores({
      // primary key: '++id' 表示自增主键
      orders: '++id, orderCode, orderType, cropName, status, createBy',
      instances: '++id, instanceCode, orderId, cropName, status',
      seedSources: '++id, seedCode, instanceId, orderId, cropName, status',
      seedlings: '++id, seedlingCode, instanceId, orderId, cropName, status',
      plantings: '++id, plantCode, instanceId, orderId, cropName, status',
      harvestRecords: '++id, harvestCode, batchCode, instanceId, orderId, cropName, status',
    });
  }
}

// 导出数据库实例
export const db = new CropDatabase();

// ============================================
// 数据库操作工具函数
// ============================================

/**
 * 清空所有作物管理数据
 */
export async function clearAllData(): Promise<void> {
  await db.orders.clear();
  await db.instances.clear();
  await db.seedSources.clear();
  await db.seedlings.clear();
  await db.plantings.clear();
  await db.harvestRecords.clear();
  console.log('🧹 已清空所有作物管理数据');
}

/**
 * 获取所有数据统计
 */
export async function getDataStats(): Promise<{
  orders: number;
  instances: number;
  seedSources: number;
  seedlings: number;
  plantings: number;
  harvests: number;
}> {
  const [orders, instances, seedSources, seedlings, plantings, harvestRecords] = await Promise.all([
    db.orders.count(),
    db.instances.count(),
    db.seedSources.count(),
    db.seedlings.count(),
    db.plantings.count(),
    db.harvestRecords.count(),
  ]);

  return { orders, instances, seedSources, seedlings, plantings, harvests: harvestRecords };
}

/**
 * 检查数据库是否已初始化
 */
export async function isDataInitialized(): Promise<boolean> {
  const count = await db.orders.count();
  return count > 0;
}

// ============================================
// 数据迁移工具（从 localStorage 迁移到 IndexedDB）
// ============================================

/**
 * 从 localStorage 迁移数据到 IndexedDB
 * 用于过渡期间保留原有数据
 */
export async function migrateFromLocalStorage(): Promise<void> {
  console.log('🔄 开始从 localStorage 迁移数据到 IndexedDB...');

  // 迁移订单
  const orders = localStorage.getItem('crop_orders');
  if (orders) {
    const parsed = JSON.parse(orders);
    if (Array.isArray(parsed) && parsed.length > 0) {
      await db.orders.bulkAdd(parsed.map((item: any) => {
        const { id, ...rest } = item;
        return rest;
      }));
      console.log(`  ✅ 迁移了 ${parsed.length} 条订单`);
    }
  }

  // 迁移实例
  const instances = localStorage.getItem('crop_instances');
  if (instances) {
    const parsed = JSON.parse(instances);
    if (Array.isArray(parsed) && parsed.length > 0) {
      await db.instances.bulkAdd(parsed.map((item: any) => {
        const { id, ...rest } = item;
        return rest;
      }));
      console.log(`  ✅ 迁移了 ${parsed.length} 条实例`);
    }
  }

  // 迁移种源
  const seedSources = localStorage.getItem('crop_seed_sources');
  if (seedSources) {
    const parsed = JSON.parse(seedSources);
    if (Array.isArray(parsed) && parsed.length > 0) {
      await db.seedSources.bulkAdd(parsed.map((item: any) => {
        const { id, ...rest } = item;
        return rest;
      }));
      console.log(`  ✅ 迁移了 ${parsed.length} 条种源`);
    }
  }

  // 迁移育苗
  const seedlings = localStorage.getItem('crop_seedlings');
  if (seedlings) {
    const parsed = JSON.parse(seedlings);
    if (Array.isArray(parsed) && parsed.length > 0) {
      await db.seedlings.bulkAdd(parsed.map((item: any) => {
        const { id, ...rest } = item;
        return rest;
      }));
      console.log(`  ✅ 迁移了 ${parsed.length} 条育苗`);
    }
  }

  // 迁移种植
  const plantings = localStorage.getItem('crop_plantings');
  if (plantings) {
    const parsed = JSON.parse(plantings);
    if (Array.isArray(parsed) && parsed.length > 0) {
      await db.plantings.bulkAdd(parsed.map((item: any) => {
        const { id, ...rest } = item;
        return rest;
      }));
      console.log(`  ✅ 迁移了 ${parsed.length} 条种植`);
    }
  }

  // 迁移采收
  const harvests = localStorage.getItem('harvest_records');
  if (harvests) {
    const parsed = JSON.parse(harvests);
    if (Array.isArray(parsed) && parsed.length > 0) {
      await db.harvestRecords.bulkAdd(parsed.map((item: any) => {
        const { id, ...rest } = item;
        return rest;
      }));
      console.log(`  ✅ 迁移了 ${parsed.length} 条采收`);
    }
  }

  console.log('✅ 数据迁移完成！');
}
