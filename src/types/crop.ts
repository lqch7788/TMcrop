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

/** 作物来源类型（灵活支持多种来源） */
export type SourceOrigin =
  | 'internal_seed'       // 内部种源
  | 'external_purchase'   // 外部采购（种子/种苗）
  | 'tissue_culture'     // 组培苗
  | 'grafting'           // 嫁接苗
  | 'seedling_split'     // 分株繁殖
  | 'cutting'            // 扦插繁殖
  | 'direct_seedling'     // 直接育苗（自繁）
  | 'direct_planting'     // 直接种植（外购苗）
  | 'external_harvest';   // 外购成品入库

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
  cropCode: string;           // 作物编码（9位）
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
  // 关联字段（新增）
  instanceId?: string;         // 关联的作物实例ID
  orderId?: string;           // 关联的订单ID
  orderCode?: string;         // 关联的订单编号
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
  cropCode: string;           // 作物编码（9位）
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
  // 关联字段（新增）
  instanceId?: string;         // 关联的作物实例ID
  orderId?: string;           // 关联的订单ID
  orderCode?: string;         // 关联的订单编号
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
  cropCode: string;           // 作物编码（9位）
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
  // 关联字段（新增）
  instanceId?: string;        // 关联的作物实例ID
  orderId?: string;          // 关联的订单ID
  orderCode?: string;         // 关联的订单编号
}

// ========== 筛选状态类型 ==========

/** 种源筛选条件 */
export interface SeedSourceFilters {
  cropCategory: string;  // 作物类别
  cropName: string;      // 作物名称
  seedCode: string;      // 种源批号
  sourceType: string;    // 来源类型
  supplierName: string;  // 供应商名称
  startDate: string;     // 开始日期
  endDate: string;       // 结束日期
  status: string;       // 库存状态
  createBy: string;      // 记录人员
}

/** 育苗筛选条件 */
export interface SeedlingFilters {
  siteName: string;      // 场地名称
  seedlingCode: string;  // 育苗批号
  sourceCode: string;     // 种源批号
  startDate: string;     // 开始日期
  endDate: string;       // 结束日期
  cropName: string;      // 作物名称
  seedlingType: string;   // 育苗方式
  createBy: string;       // 记录人员
  status: string;        // 状态
}

/** 种植筛选条件 */
export interface PlantingFilters {
  areaName: string;      // 区域名称
  plantCode: string;     // 种植批号
  sourceCode: string;     // 来源批号（种源/育苗批号）
  isHarvest: string;     // 是否已采收
  startDate: string;     // 开始日期
  endDate: string;       // 结束日期
  cropName: string;      // 作物名称
  transplantDate: string; // 定植日期
  createBy: string;      // 记录人员
}

// ========== 作物实例类型（核心） ==========

/**
 * 作物实例状态
 */
export type CropInstanceStatus =
  | 'seedling'    // 育苗中
  | 'planted'     // 已定植
  | 'growing'     // 生长期
  | 'harvested'   // 已采收
  | 'outbound'    // 已出库
  | 'cancelled';  // 已取消

/**
 * 作物实例 - 贯穿整个生命周期的核心实体
 */
export interface CropInstance {
  id: string;                    // 唯一ID
  instanceCode: string;           // 实例编码 = 品种编码(9位) + 年月日(6位) + 流水号(3位)
                                  // 示例: PD0301000100240426001 (红果番茄 2024年4月26日 第001批)
  orderId?: string;              // 关联的订单ID（可选）
  orderCode?: string;            // 关联的订单编号（可选）

  // 作物基本信息（来自品种编码）
  cropCategory: string;           // 作物类别
  cropName: string;               // 作物名称
  cropVariety: string;            // 作物品种
  categoryCode: string;            // 大类代码 (PD)
  typeCode: string;               // 类型代码 (03)
  subCode: string;                // 品种代码 (01)

  // 来源信息（灵活）
  sourceOrigin: SourceOrigin;      // 来源类型
  sourceDescription?: string;      // 来源描述（如：XX供应商，XX组培实验室）

  // 数量信息
  initialQuantity: number;         // 初始数量
  currentQuantity: number;         // 当前剩余数量
  plantedQuantity: number;         // 已定植数量
  harvestedQuantity: number;      // 已采收数量

  // 状态
  status: CropInstanceStatus;

  // 时间节点（根据来源类型，某些节点可能为空）
  seedEntryDate?: string;         // 种源入库日期（可选）
  seedlingStartDate?: string;     // 育苗开始日期（可选）
  plantingDate?: string;          // 定植日期（可选）
  harvestDate?: string;           // 首次采收日期（可选）
  outboundDate?: string;           // 出库日期（可选）

  // 溯源关系
  sourceInstanceId?: string;      // 来源实例ID（如果是育苗分株等繁殖方式）

  // 扩展信息
  createBy: string;
  createTime: string;
  updateTime: string;
}

// ========== 作物订单类型 ==========

/**
 * 作物订单状态
 */
export enum CropOrderStatus {
  PLANNED = 'planned',      // 已计划
  IN_PROGRESS = 'in_progress',  // 进行中
  COMPLETED = 'completed',    // 已完成
  CANCELLED = 'cancelled'  // 已取消
}

/**
 * 作物订单类型
 */
export interface CropOrder {
  id: string;                     // 唯一ID
  orderCode: string;              // 订单编号 = 订单前缀 + 年月日 + 流水号
                                  // 示例: DD20240426001 (订单2024年4月26日第1单)
  orderName: string;              // 订单名称
  orderType: 'production' | 'seed' | 'research';  // 订单类型

  // 关联的作物实例
  instanceIds: string[];           // 关联的作物实例ID列表

  // 订单详情
  cropCategory: string;            // 作物类别
  cropName: string;               // 作物名称
  cropVariety: string;            // 作物品种
  plannedQuantity: number;         // 计划数量
  actualQuantity: number;         // 实际数量
  unit: string;                   // 单位

  // 关联的供应商/客户
  supplierId?: string;
  supplierName?: string;
  customerId?: string;
  customerName?: string;

  // 时间
  orderDate: string;               // 订单日期
  expectedHarvestDate?: string;    // 预计采收日期
  actualHarvestDate?: string;      // 实际完成日期

  // 状态
  status: CropOrderStatus;

  remarks?: string;

  createBy: string;
  createTime: string;
  updateTime: string;
}

// ========== 溯源链类型 ==========

/**
 * 作物实例完整溯源链
 */
export interface CropTraceChain {
  instance: CropInstance;
  order?: CropOrder;
  seedSource?: SeedSource;
  seedlings?: Seedling[];
  plantings?: Planting[];
  harvests?: HarvestRecord[];
}
