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
  HARVESTING = 'harvesting',// 采收中（可多次采收，未总结束）
  HARVESTED = 'harvested',  // 已采收
  ENDED = 'ended',          // 已结束（总结束，软锁）
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
  DEPLETED = 'depleted',     // 耗尽
  ACTIVE = 'active',          // 活跃（兼容后端 DEFAULT 'active' 历史数据）
}

// ========== 繁殖途径类型（种源管理升级 V2.0）==========

/** 繁殖途径类型 - 区分种源入库的核心途径 */
export enum PropagationType {
  EXTERNAL = 'external',       // 外购（现有模式，默认值）
  BREEDING = 'breeding',       // 育种计划产出
  SEED_SAVING = 'seed_saving', // 种植留种
  ASEXUAL = 'asexual',         // 无性繁殖
}

/** 统一繁殖阶段 - 适用于所有繁殖途径 */
export enum PropagationStatus {
  PLANNED = 'planned',             // 已计划
  IN_PROGRESS = 'in_progress',     // 进行中
  HARVESTED = 'harvested',         // 已采收
  QUALITY_CHECKED = 'quality_checked', // 已质检
  COMPLETED = 'completed',         // 已入库
  FAILED = 'failed',               // 失败
}

/** 育种方法 - 育种计划产出途径专用 */
export enum BreedingMethod {
  CROSSBREEDING = 'crossbreeding',    // 杂交育种
  SELECTION = 'selection',             // 选择育种
  BACKCROSS = 'backcross',            // 回交育种
  HYBRID = 'hybrid',                   // 杂种优势
  OPEN_POLLINATION = 'open_pollination', // 开放授粉
  MUTATION = 'mutation',               // 诱变育种
  OTHER = 'other',                     // 其他
}

/** 无性繁殖方式 - 无性繁殖途径专用 */
export enum AsexualMethod {
  CUTTING = 'cutting',                  // 扦插
  GRAFTING = 'grafting',               // 嫁接
  DIVISION = 'division',               // 分株
  TISSUE_CULTURE = 'tissue_culture',   // 组培
  BULB = 'bulb',                       // 种球/球根
  LAYERING = 'layering',               // 压条
}

/** 繁殖过程记录 */
export interface PropagationRecord {
  id: string;
  seedSourceId: string;         // 关联种源ID
  recordDate: string;           // 记录日期
  stage: PropagationStatus;     // 当前阶段
  // 通用环境字段
  temperature?: number;         // 温度℃
  humidity?: number;            // 湿度%
  abnormality?: string;         // 异常描述
  operator?: string;            // 操作人员
  remarks?: string;             // 备注
  pictures?: string[];          // 阶段照片
  // 育种途径专用字段
  pollinationType?: 'self' | 'cross' | 'open'; // 授粉类型
  pollinatorCrop?: string;      // 授粉作物
  flowerCount?: number;         // 授粉花朵数
  fruitSetCount?: number;       // 坐果数
  // 采收阶段字段
  harvestSeedCount?: number;    // 采收种子数
  seedWeight?: number;          // 种子重量(g)
  harvestPlantCount?: number;   // 采收苗数（无性繁殖用）
  // 质检阶段字段
  germinationRate?: number;     // 发芽率%
  purity?: number;              // 净度%
  moisture?: number;            // 水分%
  survivalRate?: number;        // 成活率%（无性繁殖）
  rootedRate?: number;          // 生根率%（扦插用）
  graftSuccessRate?: number;    // 嫁接成活率%（嫁接用）
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
  /** @deprecated 2026-06-04 改为派生字段：由 computeStockStatus(availableCount, initialCount) 实时计算。后端不再返回/写入该字段。读取时建议用 computeStockStatus 替代。 */
  status?: StockStatus;         // 库存状态（已废弃，勿依赖）
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
  // 结束标记（2026-06-05：强结分支，绕过生产计划联动）
  endType?: 'normal' | 'abnormal'; // 结束类型
  endTime?: string;                // 结束时间（ISO）
  // 来源类型（V3.0 用于区分自产/外购）
  supplierIsInternal?: boolean; // true=自产, false=外购
  // 基地信息（V3.0 自产时必填）
  baseId?: string;            // 基地ID
  baseName?: string;          // 基地名称
  // 打印记录（新增）
  printRecords?: PrintRecord[];  // 打印历史
  // === 繁殖相关字段（propagationType ≠ 'external' 时有值）===
  propagationType?: PropagationType;      // 途径类型
  propagationStatus?: PropagationStatus;  // 当前繁殖阶段
  propagationMethod?: string;             // 具体方法（BreedingMethod 或 AsexualMethod）
  propagationRecords?: PropagationRecord[]; // 繁殖过程记录
  // 亲本/母株关联
  parentMaleId?: string;          // 父本ID（育种途径）
  parentMaleCode?: string;        // 父本批号
  parentFemaleId?: string;        // 母本ID（育种途径）
  parentFemaleCode?: string;      // 母本批号
  motherPlantId?: string;         // 母株ID（无性繁殖）
  motherPlantCode?: string;       // 母株批号
  // 种植留种关联
  linkedPlantingId?: string;      // 关联种植记录ID
  linkedPlantingCode?: string;    // 关联种植批号
  // 繁殖时间线
  propagationStartDate?: string;  // 繁殖开始日期
  expectedHarvestDate?: string;   // 预计采收日期
  actualHarvestDate?: string;     // 实际采收日期
  breedingLocation?: string;      // 育种/繁殖地点
  targetTraits?: string;          // 育种目标性状
  generation?: string;            // 世代（F1/F2/BC1）
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
  runnerIncreaseCount?: number;  // 2026-06-05: 扩繁小苗数量（草莓匍匐茎育苗等无性繁殖场景，记录当天新增的小苗数）
  replantChange?: number;     // 2026-06-16: 补苗数（1:1=补种子；1:多=补母株）
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
  // 2026-06-15: 数量体系重构 — 6 种模式合并为 2 种
  propagationMode?: 'one_to_one' | 'one_to_many';
  motherPlantCount?: number;  // 母株存活数（layering/tissue_culture/cutting 专用）
  expandedPlantCount?: number; // 累计扩繁产出数（layering/tissue_culture/cutting 专用）
  scionCount?: number;        // 砧木数（grafting 专用）
  replantCount?: number;      // 2026-06-16: 补苗累计（1:1=补种子；1:多=补母株；严格区分母株/小苗池子）
  // 2026-06-16: 派生字段 — 可定植数量 = expanded - 损耗 - 人工定植 - 自动定植 - 采收入库
  // 种植管理"经育苗移栽"模式选育苗批次时取此字段显示
  availableTransplantCount?: number;
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
  // 品种路径字段（来自作物品种库的标准化信息）
  categoryName?: string;    // 类别名称（如：蔬菜类）
  typeName?: string;       // 类型名称（如：茄果类）
  varietyName?: string;     // 品种名称（如：辣椒）
  subVarietyName?: string; // 子品种名称（如：尖椒）
  varietyPath?: string;     // 完整品种路径（categoryName > typeName > varietyName > subVarietyName）
  // 结束标记（2026-06-05：强结分支，绕过生产计划联动）
  endType?: 'normal' | 'abnormal'; // 结束类型
  endTime?: string;                // 结束时间（ISO）
}

// ========== 种植类型 ==========

/**
 * 种植采收记录（V2 — Phase 1: 2026-06-17）
 * 仿照 DailyRecord 结构，记录每次采收的去向/数量/单位
 */
export interface PlantingHarvestRecord {
  id: string
  recordDate: string                 // 采收日期 YYYY-MM-DD
  destination: 'harvest' | 'circulate' | 'self_seed' | 'dispose'
  subType?: 'cutting' | 'seed_saving' | 'quantity_refill' | 'quantity_inbound'
  warehouseId?: string
  warehouseName?: string
  quantity: number
  unit: string
  notes?: string
  operatorName?: string
  createBy?: string
  createById?: string
  createTime: string
  // 下游副作用关联 ID
  harvestRecordId?: string
  inventoryStockId?: string
  circulationRecordId?: string
}

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
  // 结束标记（2026-06-05：强结分支；2026-06-17：扩展 5 种 endType）
  endType?: 'normal' | 'abnormal' | 'harvest' | 'circulate' | 'self_seed' | 'disposal';
  endTime?: string;                // 结束时间（ISO）
  // V2 改造 (2026-06-11): 补充表格展示字段
  originPath?: 'direct_from_seed' | 'via_seedling'; // 来源路径
  harvestQuantity?: number;        // 已采收数量
  targetYield?: number;            // 目标产量（用于完成比例 = 采收入库量 / 目标产量）
  targetYieldUnit?: string;        // 目标产量单位（从数据词典 unit 选）
  unit?: string;                   // 数量单位
  // 2026-06-17: 种植采收记录 (Phase 1)
  isHarvestLocked?: boolean            // 软锁标志
  harvestToInventoryQty?: number       // 采收入库累计
  residualToSourceQty?: number         // 残株回种源累计
  selfSeedToSourceQty?: number         // 自交种子入种源累计
  disposeQty?: number                  // 直接废弃累计（2026-06-18 加；circulate_to_inventory 已去掉）
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
  // 方案1.3: 更多筛选字段
  cropType?: string;     // 作物类型（级联筛选）
  orgId?: string;        // 组织ID（级联筛选记录人）
  recorderId?: string;   // 记录人ID
  surplusMin?: number;   // 剩余数量最小值
  surplusMax?: number;   // 剩余数量最大值
  // 繁殖途径筛选
  propagationType?: string;    // 入库方式（external/breeding/seed_saving/asexual）
  propagationStatus?: string;  // 繁殖阶段
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
  // 方案3.3: 组织筛选 + 定植数量范围筛选
  orgName?: string;       // 组织名称
  countMin?: number;      // 定植数量最小值
  countMax?: number;      // 定植数量最大值
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
  instanceCode: string;           // 实例编码 = 品种编码(11位) + 年月日(6位) + 流水号(3位)
                                  // 示例: PD030100400240426001 (红果番茄 2024年4月26日 第001批)
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
  orderType: 'breeding' | 'seedling' | 'production' | 'research' | 'other';  // 订单类型

  // 关联的作物实例
  instanceIds: string[];           // 关联的作物实例ID列表

  // 订单详情
  cropCategory: string;            // 作物类别
  cropName: string;               // 作物名称
  cropVariety: string;            // 作物品种
  plannedQuantity: number;         // 计划数量
  completedQuantity: number;         // 完成数量
  unit: string;                   // 单位

  // 关联的供应商/客户
  supplierId?: string;
  supplierName?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  cropCode?: string;               // 作物编号（用于反向查 CropVariety，P0-4 新增）

  // 时间
  orderDate: string;               // 订单日期
  expectedCompletionDate?: string;    // 预计完成日期
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
  seedSource?: SeedSource;     // 兼容：保留第一条种源记录
  seedSources?: SeedSource[];  // 新增：所有关联的种源记录
  seedlings?: Seedling[];
  plantings?: Planting[];
  harvests?: HarvestRecord[];
}
