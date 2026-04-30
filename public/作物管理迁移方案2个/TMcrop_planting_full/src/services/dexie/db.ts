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
 * TMcropDB - 全模块 IndexedDB 数据库
 * 版本 2：追加 30+ 个新模块表
 */
export class TMcropDB extends Dexie {
  // ===== 作物管理（已有） =====
  seedSources!: Table<SeedSource, string>;
  seedlings!: Table<Seedling, string>;
  plantings!: Table<Planting, string>;
  dailyRecords!: Table<DailyRecord, string>;
  harvests!: Table<HarvestRecord, string>;
  cropInstances!: Table<CropInstance, string>;
  cropOrders!: Table<CropOrder, string>;
  cropVarieties!: Table<CropVariety, string>;
  pictures!: Table<PictureRecord, string>;

  // ===== 基础设置（3个模块） =====
  companyGroups!: Table<any, string>;
  bases!: Table<any, string>;
  indicators!: Table<any, string>;
  farmActivities!: Table<any, string>;

  // ===== 库存管理（3个模块） =====
  produceInventories!: Table<any, string>;
  warehouses!: Table<any, string>;
  materials!: Table<any, string>;
  materialReceivingRecords!: Table<any, string>;
  materialUsages!: Table<any, string>;
  materialReturns!: Table<any, string>;

  // ===== 审批中心 =====
  approvals!: Table<any, string>;

  // ===== 人工管理（12个子页面） =====
  attendanceRecords!: Table<any, string>;
  attendanceRepairs!: Table<any, string>;
  leaveRecords!: Table<any, string>;
  overtimeRecords!: Table<any, string>;
  recruitmentRecords!: Table<any, string>;
  contracts!: Table<any, string>;
  onboardings!: Table<any, string>;
  resignations!: Table<any, string>;
  salaryAdjustments!: Table<any, string>;
  salaryBudgets!: Table<any, string>;
  taskCenterRecords!: Table<any, string>;
  personnelRecords!: Table<any, string>;

  // ===== 生产计划 =====
  productionPlans!: Table<any, string>;
  dailyPlans!: Table<any, string>;
  monthlyPlans!: Table<any, string>;

  // ===== 系统设置 =====
  departments!: Table<any, string>;
  positions!: Table<any, string>;
  staff!: Table<any, string>;
  systemConfigs!: Table<any, string>;
  dictionaries!: Table<any, string>;

  // ===== 种植模式与区域 =====
  plantingModes!: Table<any, string>;
  plantAreas!: Table<any, string>;
  blocks!: Table<any, string>;

  constructor() {
    super('TMcropDB');
    this.version(2).stores({
      // 主键 id（string），索引根据查询场景设置
      // 作物管理（已有表保留不变）
      seedSources: 'id, seedCode, cropCode, cropName, cropCategory, sourceType, sourceOrigin, status, supplierId, purchaseDate',
      seedlings: 'id, seedlingCode, sourceId, sourceCode, cropName, cropCode, siteId, siteName, status, seedlingType, startDate, endDate',
      plantings: 'id, plantCode, sourceId, sourceCode, cropName, cropCode, areaId, areaName, status, plantingDate, harvestDate, isHarvest',
      dailyRecords: 'id, seedlingId, recordDate',
      harvests: 'id, harvestCode, batchCode, cropName, harvestDate, status, greenhouseId',
      cropInstances: 'id, instanceCode, cropName, cropCode, categoryCode, typeCode, subCode, status, orderId, sourceOrigin',
      cropOrders: 'id, orderCode, cropName, cropCode, status, orderDate, supplierId, customerId',
      cropVarieties: 'id, cropCode, categoryCode, typeCode, varietyCode, subVariety1Code, detailVarietyCode, varietyName, status',
      pictures: 'id, [entityType+entityId]',

      // ===== 基础设置层 =====
      companyGroups: 'id, name',
      bases: 'id, name, crop, status, city, companyId',
      indicators: 'id, code, name, category',
      farmActivities: 'id, code, name, type, status, priority, branchId, startTime, endTime',

      // ===== 库存管理 =====
      produceInventories: 'id, productName, warehouseId, status',
      warehouses: 'id, name, type, status',
      materials: 'id, code, name, category, supplier',
      materialReceivingRecords: 'id, code, date, applicant, status',
      materialUsages: 'id, materialId, recordId, quantity',
      materialReturns: 'id, materialId, recordId, quantity, date',

      // ===== 审批中心 =====
      approvals: 'id, code, type, status, applicantId, applyDate',

      // ===== 人工管理 =====
      attendanceRecords: 'id, employeeId, date, status',
      attendanceRepairs: 'id, employeeId, date, status',
      leaveRecords: 'id, employeeId, startDate, endDate, status',
      overtimeRecords: 'id, employeeId, date, status',
      recruitmentRecords: 'id, position, department, status',
      contracts: 'id, employeeId, startDate, endDate, status',
      onboardings: 'id, employeeId, joinDate, status',
      resignations: 'id, employeeId, resignDate, status',
      salaryAdjustments: 'id, employeeId, effectiveDate, status',
      salaryBudgets: 'id, year, month, department',
      taskCenterRecords: 'id, assigneeId, status, dueDate',
      personnelRecords: 'id, employeeId, name, department, status',

      // ===== 生产计划 =====
      productionPlans: 'id, planCode, cropName, status',
      dailyPlans: 'id, date, planId',
      monthlyPlans: 'id, yearMonth, planId',

      // ===== 系统设置 =====
      departments: 'id, name, parentId',
      positions: 'id, name, departmentId',
      staff: 'id, name, departmentId, positionId',
      systemConfigs: 'id, key, category',
      dictionaries: 'id, type, code',

      // ===== 种植模式与区域 =====
      plantingModes: 'id, name',
      plantAreas: 'id, name, baseId',
      blocks: 'id, name, areaId',
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
