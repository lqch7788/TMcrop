/**
 * 作物管理模块类型定义
 * 包含种源管理、育苗管理、种植管理相关类型和枚举
 */

// ========== 枚举定义 ==========

/** 种源类型 */
export enum SourceType {
  SEEDLING = 'seedling',  // 种苗
  SEED = 'seed'           // 种子
}

/** 种子类型 */
export enum SeedType {
  SEED = 'seed',
  SEEDLING = 'seedling'
}

/** 育苗状态 */
export enum SeedlingStatus {
  IN_PROGRESS = 'in_progress',      // 进行中
  TRANSPLANT_READY = 'transplant_ready',  // 待定植
  COMPLETED = 'completed',          // 已完成
  ABNORMAL = 'abnormal'             // 异常
}

/** 种植状态 */
export enum PlantingStatus {
  PLANTED = 'planted',      // 已定植
  GROWING = 'growing',      // 生长期
  HARVESTED = 'harvested',  // 已采收
  CANCELLED = 'cancelled'   // 已取消
}

/** 打印模板类型 */
export enum PrintTemplate {
  SMALL = 'small',  // 小标签
  LARGE = 'large'    // 大标签
}

/** 种源库存状态 */
export enum StockStatus {
  SUFFICIENT = 'sufficient',  // 充足
  LOW = 'low',                // 不足
  DEPLETED = 'depleted'       // 耗尽
}

// ========== 种源类型 ==========

/**
 * 种源记录
 */
export interface SeedSource {
  id: string;
  seedCode: string;           // 种源批号
  sourceType: SourceType;     // 来源类型（种子/种苗）
  cropCategory: string;        // 作物类别
  cropName: string;           // 作物名称
  cropVariety: string;        // 作物品种
  supplierId: string;          // 供应商ID
  supplierName: string;        // 供应商名称
  purchaseDate: string;        // 采购日期
  quantity: number;            // 采购数量
  unit: string;               // 单位
  unitPrice: number;           // 单价
  totalAmount: number;        // 总金额
  initialCount: number;        // 初始数量
  availableCount: number;      // 可用数量
  pictures: string[];          // 图片（Base64数组）
  remarks?: string;           // 备注
  status: StockStatus;         // 库存状态
  traceabilityCode?: string;   // 溯源码
  printCount: number;          // 打印次数
  createBy: string;           // 创建人
  createTime: string;          // 创建时间
  updateTime: string;          // 更新时间
}

// ========== 每日记录类型 ==========

/**
 * 每日记录（育苗管理）
 */
export interface DailyRecord {
  id: string;
  seedlingId: string;         // 育苗ID
  recordDate: string;         // 记录日期
  temperature?: number;       // 温度
  humidity?: number;          // 湿度
  watering: boolean;          // 是否浇水
  abnormality?: string;       // 异常情况
  remarks?: string;           // 备注
}

// ========== 育苗类型 ==========

/**
 * 育苗记录
 */
export interface Seedling {
  id: string;
  seedlingCode: string;        // 育苗批号
  sourceId: string;           // 关联种源ID
  sourceCode: string;          // 关联种源批号
  cropName: string;            // 作物名称
  cropVariety: string;         // 作物品种
  seedlingType: string;        // 育苗方式
  siteId: string;             // 场地ID
  siteName: string;            // 场地名称
  startDate: string;          // 开始日期
  expectedEndDate?: string;   // 预计结束日期
  endDate?: string;           // 实际结束日期
  initialCount: number;       // 初始数量
  survivalCount: number;      // 成活数量
  plantedCount: number;       // 已定植数量
  survivalRate: number;       // 成苗率
  lossCount: number;          // 损耗数量
  lossRate: number;           // 损耗率
  isFinished: boolean;        // 是否已完成
  status: SeedlingStatus;     // 状态
  dailyRecords: DailyRecord[]; // 每日记录
  pictures: string[];         // 图片（Base64数组）
  qualityGrade?: string;      // 品质等级
  printCount: number;         // 打印次数
  remarks?: string;           // 备注
  createBy: string;           // 创建人
  createTime: string;         // 创建时间
  updateTime: string;         // 更新时间
}

// ========== 种植类型 ==========

/**
 * 种植记录
 */
export interface Planting {
  id: string;
  plantCode: string;          // 种植批号
  sourceType: SourceType;     // 来源类型
  sourceId: string;           // 来源ID（种源或育苗ID）
  sourceCode: string;         // 来源批号
  cropName: string;           // 作物名称
  cropVariety: string;         // 作物品种
  areaId: string;            // 区域ID
  areaName: string;           // 区域名称
  rootName: string;           // 大棚/根区名称
  plantingCount: number;      // 种植数量
  plantingDate: string;       // 种植日期
  soilPH?: number;            // 土壤PH值
  soilEC?: number;            // 土壤EC值
  transplantCount?: number;    // 移栽数量
  transplantDate?: string;    // 移栽日期
  isHarvest: boolean;         // 是否已采收
  harvestDate?: string;       // 采收日期
  attritionRate: number;      // 损耗率
  printCount: number;         // 打印次数
  traceabilityCode: string;   // 溯源码
  pictures: string[];         // 图片（Base64数组）
  remarks?: string;           // 备注
  status: PlantingStatus;     // 状态
  createBy: string;           // 创建人
  createTime: string;         // 创建时间
  updateTime: string;         // 更新时间
}

// ========== 筛选状态类型 ==========

/** 种源筛选条件 */
export interface SeedSourceFilters {
  cropName: string;      // 作物名称
  seedCode: string;      // 种源批号
  sourceType: string;    // 来源类型
  supplierName: string;  // 供应商名称
  startDate: string;     // 开始日期
  endDate: string;       // 结束日期
  status: string;        // 库存状态
}

/** 育苗筛选条件 */
export interface SeedlingFilters {
  siteName: string;      // 场地名称
  seedlingCode: string;  // 育苗批号
  startDate: string;     // 开始日期
  endDate: string;       // 结束日期
  cropName: string;      // 作物名称
  status: string;        // 状态
}

/** 种植筛选条件 */
export interface PlantingFilters {
  areaName: string;      // 区域名称
  plantCode: string;     // 种植批号
  isHarvest: string;     // 是否已采收
  startDate: string;     // 开始日期
  endDate: string;       // 结束日期
  cropName: string;      // 作物名称
}
