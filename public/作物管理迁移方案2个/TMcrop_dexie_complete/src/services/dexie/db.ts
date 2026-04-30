/**
 * Dexie.js 数据库定义
 * 第三种存储实现：基于 IndexedDB 的纯前端持久化方案
 * 适用于演示版/原型阶段，无需后端即可运行
 */

import Dexie, { Table } from 'dexie';
import {
  SeedSource, Seedling, DailyRecord, Planting,
  CropInstance, CropOrder, CropVariety,
} from '@/types/crop';
import { HarvestRecord } from '@/types';

/**
 * TMcropDB - 作物管理模块 IndexedDB 数据库
 * 版本 1：包含所有作物管理相关表
 */
export class TMcropDB extends Dexie {
  // 种源表
  seedSources!: Table<SeedSource, string>;
  // 育苗表（dailyRecords 内嵌为 JSON 数组）
  seedlings!: Table<Seedling, string>;
  // 种植表
  plantings!: Table<Planting, string>;
  // 每日记录表（独立表，用于按日期查询等场景，同时 seedlings 中也保留内嵌副本）
  dailyRecords!: Table<DailyRecord, string>;
  // 采收记录表
  harvests!: Table<HarvestRecord, string>;
  // 作物实例表
  cropInstances!: Table<CropInstance, string>;
  // 作物订单表
  cropOrders!: Table<CropOrder, string>;
  // 品种库表
  cropVarieties!: Table<CropVariety, string>;
  // 图片表（存储 base64 字符串，IndexedDB 原生支持大字符串）
  pictures!: Table<PictureRecord, string>;

  constructor() {
    super('TMcropDB');
    this.version(1).stores({
      // 主键 id（string），索引根据查询场景设置
      seedSources: 'id, seedCode, cropCode, cropName, cropCategory, sourceType, sourceOrigin, status, supplierId, purchaseDate',
      seedlings: 'id, seedlingCode, sourceId, sourceCode, cropName, cropCode, siteId, siteName, status, seedlingType, startDate, endDate',
      plantings: 'id, plantCode, sourceId, sourceCode, cropName, cropCode, areaId, areaName, status, plantingDate, harvestDate, isHarvest',
      dailyRecords: 'id, seedlingId, recordDate',
      harvests: 'id, harvestCode, batchCode, cropName, harvestDate, status, greenhouseId',
      cropInstances: 'id, instanceCode, cropName, cropCode, categoryCode, typeCode, subCode, status, orderId, sourceOrigin',
      cropOrders: 'id, orderCode, cropName, cropCode, status, orderDate, supplierId, customerId',
      cropVarieties: 'id, cropCode, categoryCode, typeCode, varietyCode, subVariety1Code, detailVarietyCode, varietyName, status',
      pictures: 'id, [entityType+entityId]',
    });
  }
}

/** 图片记录结构（IndexedDB 原生支持 base64 大字符串和 Blob） */
export interface PictureRecord {
  id: string;
  entityType: 'seedSource' | 'seedling' | 'planting' | 'harvest' | 'cropInstance' | 'cropOrder' | 'cropVariety';
  entityId: string;
  data: string; // base64 字符串（过渡方案）或 Blob
  mimeType: string;
  fileName?: string;
  createTime: string;
}

/** 全局单例数据库实例 */
export const db = new TMcropDB();

/** 清除所有演示数据（删除整个 IndexedDB 数据库） */
export async function clearAllDexieData(): Promise<void> {
  await db.delete();
  // 重新打开以恢复可用状态
  await db.open();
}

export default db;
