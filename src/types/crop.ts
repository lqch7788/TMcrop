/**
 * 作物管理模块类型定义
 * 包含种源管理、育苗管理、种植管理相关类型和枚举
 */

// ========== 枚举定义 ==========

/** 种源类型 - 基于繁殖方式分类 */
export enum SourceType {
  SEED = 'seed',                    // 种子
  SEEDLING = 'seedling',            // 种苗/实生苗
  CUTTING = 'cutting',              // 扦插苗
  GRAFTING = 'grafting',            // 嫁接苗
  TISSUE_CULTURE = 'tissue_culture', // 组培苗
  SPLIT = 'split',                  // 分株苗
  BULB = 'bulb',                    // 种球/球根
  OTHER = 'other'                   // 其他
}

/** 种源来源途径 - 基于获取渠道分类
 * 注意：此类型使用 string literal union，不再使用 enum
 */
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

/** 育苗计划类型 */
export enum SeedlingPlanType {
  ROUTINE = 'routine',            // 常规
  URGENT = 'urgent',              // 加急
  EXPERIMENT = 'experiment'       // 实验
}

/** 育苗计算模式 */
export enum SeedlingCalculateMode {
  SINGLE = 'single',              // 单株育苗
  PROPAGATION = 'propagation'     // 扩繁育苗
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

/** 标签打印类型 */
export enum LabelPrintType {
  NEW = 'new',           // 新建标签
  REPRINT = 'reprint',   // 重打印
  BATCH = 'batch'        // 批量打印
}

/** 定植记录状态 */
export enum TransplantRecordStatus {
  IN_STOCK = 'in_stock',       // 库存中
  TRANSPLANTING = 'transplanting', // 定植中
  GROWING = 'growing',         // 生长期
  HARVESTED = 'harvested'      // 已采收
}

/** 栽种操作类型 */
export enum TransplantAction {
  MOVE_IN = 'move_in',         // 移入
  MOVE_OUT = 'move_out',       // 移出
  TRANSPLANT = 'transplant',   // 定植
  MARK = 'mark'                // 标记
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
  sourceType: SourceType;     // 种源类型（基于繁殖方式）
  sourceOrigin: SourceOrigin;  // 来源途径（基于获取渠道）
  cropCategory: string;        // 作物类别（如：蔬菜类）
  typeName: string;          // 类型名称（如：叶菜类）
  varietyName: string;        // 品种名称（如：菠菜）
  cropName: string;           // 作物名称（最细化，如：圆叶菠菜）
  cropVariety: string;        // 作物品种（对应数据库字段，存储上一级品种名）
  cropCode: string;           // 作物编码（11位）- 类别(2) + 类型(2) + 品种(2) + 子品种(3) + 详细(2)
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
  // 生产计划关联（V3.0 必填）
  productionPlanId?: string;   // 关联生产计划ID
  productionPlanCode?: string; // 关联生产计划批次号
  // 来源类型（V3.0 用于区分自产/外购）
  supplierIsInternal?: boolean; // true=自产, false=外购
  // 基地信息（V3.0 自产时必填）
  baseId?: string;            // 基地ID
  baseName?: string;          // 基地名称
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
  // 数量变化字段
  survivalCountChange?: number;  // 成活数量变化（正数增加，负数减少）
  plantedCountChange?: number;  // 定植数量变化
  lossCountChange?: number;    // 损耗数量
  remarks?: string;           // 备注
  // 水质参数（补充）
  phValue?: number;          // pH值
  ecValue?: number;           // EC值 (电导率)
  // 操作信息（补充）
  operator?: string;          // 操作人员
}

// ========== 打印记录类型（新增） ==========

/**
 * 标签打印记录
 */
export interface PrintRecord {
  id: string;                  // 打印记录ID
  printTime: string;          // 打印时间
  printType: LabelPrintType;  // 打印类型：新建/重打印/批量
  printCount: number;          // 打印数量
  operator: string;           // 操作人员
  labelNumbers?: string[];     // 二维码编号列表（重打印时）
  seedlingId: string;         // 关联的育苗ID
}

// ========== 栽种记录类型（新增） ==========

/**
 * 栽种记录 - 记录每次定植操作
 */
export interface TransplantRecord {
  id: string;                  // 栽种记录ID
  seedlingId: string;         // 关联的育苗ID
  transplantDate: string;      // 栽种日期
  areaId: string;             // 场地ID
  areaName: string;           // 场地名称
  zoneId?: string;           // 区域ID
  zoneName?: string;          // 区域名称
  bedId?: string;            // 苗床ID
  bedName?: string;           // 苗床名称
  transplantCount: number;     // 本次定植数量
  remainingCount: number;     // 剩余数量
  status: TransplantRecordStatus; // 状态
  remarks?: string;           // 备注
  createTime: string;         // 创建时间
}

/**
 * 栽种历史条目
 */
export interface TransplantHistoryItem {
  id: string;                  // 历史条目ID
  action: TransplantAction;   // 操作类型：移入/移出/定植/标记
  fromArea?: string;          // 来源位置
  toArea?: string;            // 目标位置
  count?: number;             // 操作数量
  date: string;               // 操作日期
  operator?: string;          // 操作人员
  remarks?: string;           // 备注
  // 标记相关
  markName?: string;          // 标记状态名称
  markColor?: string;         // 标记颜色
  markIcon?: string;          // 标记图标
}

/**
 * 栽种历史 - 完整操作轨迹
 */
export interface TransplantHistory {
  id: string;                  // 历史记录ID
  seedlingId: string;         // 关联的育苗ID
  labelNumber: string;         // 二维码编号
  currentArea: string;        // 当前位置
  status: TransplantRecordStatus; // 当前状态
  history: TransplantHistoryItem[]; // 操作历史
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
  cropCode: string;           // 作物编码（11位）- 类别(2) + 类型(2) + 品种(2) + 子品种(3) + 详细(2)
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
  // 补充字段
  orgName?: string;           // 所属组织名称
  seedlingTaskTime?: number;  // 育苗工时(小时)
  // 新增字段
  planType?: SeedlingPlanType; // 计划类型（常规/加急/实验）
  targetSurvivalRate?: number; // 目标成苗率
  targetSurvivalCount?: number; // 目标成苗数
  qualityGrade?: string;      // 品质等级预判
  chargePerson?: string;      // 负责人
  // 关联字段
  productionPlanId?: string;   // 关联生产计划ID
  productionPlanCode?: string;  // 关联生产计划批次号
  // 扩繁计算模式
  calculateMode?: SeedlingCalculateMode; // 计算模式：单株育苗/扩繁育苗
  motherPlantCount?: number;     // 母株数量（扩繁模式用）
  propagationMultiple?: number;   // 扩繁倍数（扩繁模式用）
  theoreticalYield?: number;     // 理论产量（扩繁模式用）
  // 打印记录（新增）
  printRecords?: PrintRecord[];  // 打印历史
  // 栽种记录（新增）
  transplantRecords?: TransplantRecord[];  // 栽种记录列表
  transplantHistory?: TransplantHistory[]; // 定植履历列表
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
  cropCode: string;           // 作物编码（11位）- 类别(2) + 类型(2) + 品种(2) + 子品种(3) + 详细(2)
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
  // 生产计划关联（V3.0 必填）
  productionPlanId?: string;   // 关联生产计划ID
  productionPlanCode?: string; // 关联生产计划批次号
  // 来源信息（V3.0 追溯用）
  sourceInstanceId?: string;   // 来源库存实例ID
  seedlingInstanceId?: string; // 育苗实例ID（如果来源是种苗）
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
  // 更多筛选条件（新增）
  initialCountMin?: number;   // 初始数量最小值
  initialCountMax?: number;   // 初始数量最大值
  survivalCountMin?: number;   // 成苗数量最小值
  survivalCountMax?: number;   // 成苗数量最大值
  lossCountMin?: number;      // 损耗数量最小值
  lossCountMax?: number;      // 损耗数量最大值
  surplusMin?: number;        // 剩余数量最小值
  surplusMax?: number;        // 剩余数量最大值
  survivalRateMin?: number;   // 成苗率最小值
  survivalRateMax?: number;   // 成苗率最大值
  lossRateMin?: number;       // 损耗率最小值
  lossRateMax?: number;       // 损耗率最大值
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
