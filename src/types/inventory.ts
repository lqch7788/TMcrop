/**
 * 统一库存管理系统 V3.0 类型定义
 * 基于架构设计：双核心驱动 + 循环闭环 + instance_id 追溯
 */

// ============================================
// 枚举定义
// ============================================

/** 库存实例状态 */
export enum InventoryStatus {
  /** 正常库存 */
  IN_STOCK = 'in_stock',
  /** 低库存警告 */
  LOW_STOCK = 'low_stock',
  /** 冻结中 */
  FROZEN = 'frozen',
  /** 已出库 */
  OUTBOUND = 'outbound',
  /** 已用完 */
  EMPTY = 'empty',
  /** 2026-06-24: 已调拨到种源管理（源行从作物库存列表中隐藏） */
  TRANSFERRED = 'transferred',
}

/** 库存类型（种源/种苗/成品） */
export enum StockType {
  /** 种源 */
  SEED = 'seed',
  /** 种苗 */
  SEEDLING = 'seedling',
  /** 成品 */
  PRODUCT = 'product',
}

/** 来源类型（入库途径） */
export enum SourceType {
  /** 自产（采收入库） */
  SELF_PRODUCED = 'self_produced',
  /** 外购（外部采购入库） */
  EXTERNAL_PURCHASED = 'external_purchased',
  /** 赠送/受赠 */
  GIFT = 'gift',
  /** 委托生产 */
  COMMISSIONED = 'commissioned',
  /** 调拨（从其他基地/仓库调入） */
  TRANSFER = 'transfer',
  /** 手动新建（盘点/期初/其他） */
  MANUAL = 'manual',
}

/** 库存交易类型 */
export enum TransactionType {
  /** 入库 */
  INBOUND = 'inbound',
  /** 出库 */
  OUTBOUND = 'outbound',
  /** 调拨 */
  TRANSFER = 'transfer',
  /** 冻结 */
  FREEZE = 'freeze',
  /** 解冻 */
  UNFREEZE = 'unfreeze',
  /** 调整 */
  ADJUST = 'adjust',
}

/** 业务类型（关联的业务模块） */
export enum BusinessType {
  /** 种源管理 */
  SEED_SOURCE = 'seed_source',
  /** 育苗管理 */
  SEEDLING = 'seedling',
  /** 种植管理 */
  PLANTING = 'planting',
  /** 采收入库 */
  HARVEST = 'harvest',
  /** 采购入库 */
  PURCHASE = 'purchase',
  /** 手动新建（无上游业务单据） */
  MANUAL = 'manual',
  /** 其他 */
  OTHER = 'other',
}

/** 冻结类型 */
export enum FrozenType {
  /** 任务冻结（农事任务占用） */
  TASK = 'task',
  /** 预留冻结（预分配） */
  RESERVED = 'reserved',
  /** 质检冻结（待质检） */
  QC = 'qc',
  /** 其他冻结 */
  OTHER = 'other',
}

/** 冻结状态 */
export enum FreezeStatus {
  /** 已冻结 */
  FROZEN = 'frozen',
  /** 部分解冻 */
  PARTIAL_UNFROZEN = 'partial_unfrozen',
  /** 已解冻 */
  UNFROZEN = 'unfrozen',
}

// ============================================
// 接口定义
// ============================================

/**
 * 库存中心表 - instance_id 为唯一标识
 */
export interface InventoryStock {
  /** 库存实例ID（格式：类型-日期-序号，如 INS-20260430-001） */
  instanceId: string;

  /** 库存类型 */
  stockType: StockType;

  /** 关联的业务ID（如种源ID、采收ID等） */
  businessId: string;
  businessType: BusinessType;

  /** 品种信息 */
  cropId: string;
  cropName: string;
  varietyId?: string;
  varietyName?: string;

  /** 数量信息 */
  currentQuantity: number;    // 当前库存数量
  frozenQuantity: number;    // 已冻结数量
  availableQuantity: number; // 可用数量 = current - frozen
  unit: string;              // 单位

  /** 来源信息 */
  sourceType: SourceType;
  supplierId?: string;        // 供应商ID（外购时必填）
  supplierName?: string;     // 供应商名称
  baseId?: string;           // 基地ID（自产时必填）
  baseName?: string;         // 基地名称

  /** 关联的生产计划 */
  productionPlanId?: string;
  productionPlanCode?: string;

  /** 溯源信息（上游来源） */
  sourceInstanceId?: string;      // 来源库存实例ID
  sourceBusinessId?: string;      // 来源业务ID
  sourceBusinessType?: BusinessType;

  /** 状态 */
  status: InventoryStatus;

  /** 时间信息 */
  inboundDate: string;        // 入库日期
  lastOutboundDate?: string;  // 最后出库日期
  expiryDate?: string;        // 过期/保质期日期

  /** 版本号（乐观锁） */
  version: number;

  /** 扩展字段（JSON格式存储） */
  extensions?: Record<string, unknown>;

  // ========== V3 扩展字段（采收入库对接）==========
  /** 11 位作物编码（来自品种库） */
  cropCode?: string;
  /** 种植模式（如：土壤/水培/基质） */
  plantingMode?: string;
  /** 目标产量 */
  targetYield?: number;
  /** 品质等级（A/B/C） */
  grade?: string;
  /** 审核人 */
  auditor?: string;
  /** 备注 */
  remarks?: string;
  /** 2026-07-13：补录入库标记 */
  isSupplementary?: number;
  /** 2026-07-13：补录原因 */
  supplementaryReason?: string;
  /** 2026-07-13：补录来源模块（planting/seedling） */
  sourceModule?: string;
  /** 2026-07-13：补录来源记录ID */
  sourceRecordId?: string;
  /** 采收区域（多个时用、分隔） */
  greenhouseName?: string;
  /** 种植区域（plantings.area_name） */
  areaName?: string;
  // 采购信息（外购入库财务字段）
  unitPrice?: number;
  totalAmount?: number;
  purchaseDate?: string;
  // 2026-06-30 Bug 12 修复：成品形态（果实/种子/花朵/枝条/整株/其他 12 选）
  // 来源：行级采收入库 / HarvestRecordModal 顶部"采收形态" → inventory_stock.product_form
  // 注意：历史库存（2026-06-30 前的入库）未带 productForm 写入，UI 显示空即可，不要假设一定有值
  productForm?: string;
  // 2026-06-30 Bug 21 修复：种源/育苗产物形态（写入 inventory_stock.source_form）
  // 产品明细"采收形态"sourceForm 字段 (果实/种子/种苗/穗条/枝条/块根/块茎/鳞茎/叶片/花朵/整株/其他 12 选)
  // InventoryTable 形态列统一读 productForm → sourceForm（fallback）
  sourceForm?: string;
  // ========== 2026-07-08 T7 扩展：详情弹窗扩展信息 4 分组字段 ==========
  // 财务信息（外购入库专属）
  supplierPhone?: string;       // 供应商联系电话
  // 审计信息
  operatorName?: string;        // 操作员（与 InventoryTransaction.operatorName 对齐）
  createBy?: string;            // 创建人
  createTime?: string;          // 创建时间
  updateTime?: string;          // 更新时间
  // 业务信息
  businessCode?: string;        // 业务单号（从 extensions?.businessCode 提升为顶层字段）
  // 来源专属
  giftFrom?: string;            // 赠送来源（人/单位/备注）
  consignor?: string;           // 委托方名称
  sourceWarehouseName?: string; // 调拨源仓库
  stocktakeNo?: string;         // 盘点单号
}

/**
 * 库存流水表 - 记录所有库存变动
 */
export interface InventoryTransaction {
  id: string;

  /** 关联的库存实例ID */
  instanceId: string;

  /** 库存类型 */
  stockType: StockType;

  /** 交易类型 */
  transactionType: TransactionType;

  /** 数量变化（正数表示增加，负数表示减少） */
  quantity: number;

  /** 交易前余额 */
  balanceBefore: number;
  /** 交易后余额 */
  balanceAfter: number;

  /** 关联的业务信息 */
  businessId?: string;
  businessType: BusinessType;
  businessCode?: string;      // 业务单号

  /** 操作信息 */
  operatorId: string;
  operatorName: string;
  operateDate: string;

  /** 备注 */
  remarks?: string;

  /** 扩展字段 */
  extensions?: Record<string, unknown>;
}

/**
 * 库存冻结表 - 记录冻结详情
 */
export interface InventoryFreeze {
  id: string;

  /** 关联的库存实例ID */
  instanceId: string;

  /** 冻结类型 */
  frozenType: FrozenType;

  /** 冻结数量 */
  frozenQuantity: number;

  /** 关联的业务ID（如任务ID） */
  businessId?: string;
  businessType?: BusinessType;

  /** 冻结状态 */
  status: FreezeStatus;

  /** 冻结时间 */
  frozenDate: string;
  /** 解冻时间 */
  unfrozenDate?: string;

  /** 操作信息 */
  operatorId: string;
  operatorName: string;

  /** 备注 */
  remarks?: string;
}

// ============================================
// Repository 接口定义（依赖注入，支持后续切换数据库）
// ============================================

/** 库存操作返回结果 */
export interface InventoryOperationResult {
  success: boolean;
  instanceId?: string;
  newQuantity?: number;
  error?: string;
}

/** 可用数量计算结果 */
export interface AvailableQuantityResult {
  instanceId: string;
  currentQuantity: number;
  frozenQuantity: number;
  availableQuantity: number;
}

/** 业务关联信息 */
export interface BusinessInfo {
  businessId: string;
  businessType: BusinessType;
  businessCode: string;
  [key: string]: unknown;
}

/** 溯源结果 */
export interface TraceResult {
  instanceId: string;
  stockType: StockType;
  businessType: BusinessType;
  businessId: string;
  businessCode?: string;    // 2026-07-04：批次号/来源描述（如"育苗批次: YM20260701-001"）
  cropName: string;
  varietyName?: string;
  quantity: number;
  inboundDate: string;
  sourceInstanceId?: string;
  // Phase 13.1.5: BFS 深度 + 父节点（前端画树用）
  depth?: number;
  parentInstanceId?: string | null;
}

/** 下游追溯结果 */
export interface DownstreamTraceResult {
  instanceId: string;
  stockType: StockType;
  businessType: BusinessType;
  businessId: string;
  businessCode?: string;    // 2026-07-04：批次号/来源描述
  outboundQuantity: number;
  outboundDate: string;
  targetInstanceId?: string;
  // Phase 13.1.5: BFS 深度 + 父节点
  depth?: number;
  parentInstanceId?: string | null;
}

/** 库存统计结果 */
export interface InventoryStats {
  totalInstances: number;
  totalQuantity: number;
  byStockType: Record<StockType, { count: number; quantity: number }>;
  lowStockCount: number;
  expiringCount: number;
}

// ============================================
// Repository 接口（定义标准操作，支持依赖注入）
// ============================================

export interface IInventoryStockRepository {
  /** 创建库存实例 */
  create(stock: Omit<InventoryStock, 'version'>): Promise<InventoryStock>;

  /** 根据ID查询 */
  findById(instanceId: string): Promise<InventoryStock | null>;

  /** 根据业务ID查询 */
  findByBusinessId(businessId: string): Promise<InventoryStock | null>;

  /** 条件查询列表 */
  findAll(filters?: {
    stockType?: StockType;
    status?: InventoryStatus;
    sourceType?: SourceType;
    productionPlanId?: string;
    baseId?: string;
    supplierId?: string;
    cropName?: string;       // 作物名称模糊匹配
    cropId?: string;        // 作物ID精确匹配
  }): Promise<InventoryStock[]>;

  /** 更新库存（带乐观锁） */
  update(
    instanceId: string,
    updates: Partial<InventoryStock>,
    expectedVersion: number
  ): Promise<InventoryStock>;

  /** 更新数量（出库/扣减） */
  updateQuantity(
    instanceId: string,
    newQuantity: number,
    expectedVersion: number
  ): Promise<InventoryStock>;

  /** 统计 */
  getStats(filters?: {
    stockType?: StockType;
    baseId?: string;
  }): Promise<InventoryStats>;
}

export interface IInventoryTransactionRepository {
  /** 创建交易记录 */
  create(transaction: Omit<InventoryTransaction, 'id'>): Promise<InventoryTransaction>;

  /** 根据实例ID查询交易记录 */
  findByInstanceId(instanceId: string): Promise<InventoryTransaction[]>;

  /** 根据业务ID查询交易记录 */
  findByBusinessId(businessId: string): Promise<InventoryTransaction[]>;

  /** 条件查询 */
  findAll(filters?: {
    stockType?: StockType;
    transactionType?: TransactionType;
    businessType?: BusinessType;
    startDate?: string;
    endDate?: string;
  }): Promise<InventoryTransaction[]>;
}

export interface IInventoryFreezeRepository {
  /** 创建冻结记录 */
  create(freeze: Omit<InventoryFreeze, 'id'>): Promise<InventoryFreeze>;

  /** 根据ID查询冻结记录 */
  findById(id: string): Promise<InventoryFreeze | null>;

  /** 根据实例ID查询冻结记录 */
  findByInstanceId(instanceId: string): Promise<InventoryFreeze[]>;

  /** 根据业务ID查询冻结记录 */
  findByBusinessId(businessId: string): Promise<InventoryFreeze[]>;

  /** 解冻 */
  unfreeze(id: string): Promise<InventoryFreeze>;

  /** 更新冻结状态 */
  updateStatus(id: string, status: FreezeStatus): Promise<InventoryFreeze>;
}

// ============================================
// 辅助类型定义
// ============================================

/** 入库请求 */
export interface InboundRequest {
  stockType: StockType;
  businessId: string;
  businessType: BusinessType;
  cropId: string;
  cropName: string;
  varietyId?: string;
  varietyName?: string;
  quantity: number;
  unit: string;
  sourceType: SourceType;
  supplierId?: string;
  supplierName?: string;
  baseId?: string;
  baseName?: string;
  productionPlanId?: string;
  productionPlanCode?: string;
  sourceInstanceId?: string;
  sourceBusinessId?: string;
  sourceBusinessType?: BusinessType;
  remarks?: string;
  extensions?: Record<string, unknown>;
  // V3 扩展字段（让库存页展示完整采收元数据）
  cropCode?: string;
  plantingMode?: string;
  targetYield?: number;
  grade?: string;
  auditor?: string;
  greenhouseName?: string;
  // 采购信息（外购入库财务字段）
  unitPrice?: number;
  totalAmount?: number;
  purchaseDate?: string;
}

/** 出库请求 */
export interface OutboundRequest {
  instanceId: string;
  businessId: string;
  businessType: BusinessType;
  businessCode?: string;
  quantity: number;
  operatorId: string;
  operatorName: string;
  remarks?: string;
}

/** 冻结请求 */
export interface FreezeRequest {
  instanceId: string;
  freezeType: 'order' | 'manual';  // 订单关联 / 手动独立
  freezeQuantity: number;
  orderId?: string;                // 关联订单ID(freezeType='order'时必填)
  purpose?: string;                // 冻结用途(freezeType='manual'时)
  operatorId?: string;
  operatorName?: string;
  remarks?: string;
}

/** 冻结果（API返回） */
export interface FreezeResult {
  success: boolean;
  freezeId?: string;
  instanceId?: string;
  frozenQuantity?: number;
  freezeQuantity?: number;
  freezeType?: string;
  orderId?: string;
  orderCode?: string;
  customerName?: string;
  deliveryDate?: string;
  purpose?: string;
  status?: string;
  freezeDate?: string;
  error?: string;
}

/** 冻结记录（列表展示用） */
export interface FreezeRecord {
  id: string;
  instanceId: string;
  freezeQuantity: number;
  usedQuantity: number;
  freezeType: 'order' | 'manual';
  orderId?: string;
  orderCode?: string;
  customerName?: string;
  deliveryDate?: string;
  purpose?: string;
  operatorId?: string;
  operatorName?: string;
  freezeDate?: string;
  unfreezeDate?: string;
  status: 'frozen' | 'released';
  remarks?: string;
}

/** 预警信息 */
export interface AlertInfo {
  type: 'storage_time' | 'low_stock' | 'high_stock' | 'expiration';
  level: 'info' | 'warning' | 'critical';
  instanceId: string;
  message: string;
  threshold: number;
  currentValue: number;
}

/** 预警设置 */
export interface AlertSettings {
  enableStorageTimeAlert: boolean;
  storageTimeThreshold: number;
  enableQuantityAlert: boolean;
  minQuantityThreshold: number;
  maxQuantityThreshold: number;
  minStock: number;
  maxStock: number;
  expirationDays: number;
}

/** 采收产品库存（兼容V2.0） */
export interface ProduceInventory {
  id: string;
  harvestRecordId: string;
  productCode: string;
  cropName: string;
  variety: string;
  /** 库存类型：种子/种苗/成品 */
  stockType?: StockType;
  quantity: number;
  unit: string;
  grade: 'A' | 'B' | 'C';
  quality: 'excellent' | 'good' | 'average' | 'poor';
  warehouseId: string;
  warehouseName: string;
  storageLocation: string;
  harvestDate: string;
  storageDate: string;
  expirationDate: string;
  alertSettings: AlertSettings;
  batchCode: string;
  greenhouseName: string;
  plantingMode: string;
  status: InventoryStatus;
  inboundRecords: InventoryTransaction[];
  outboundRecords: InventoryTransaction[];
}

/** 作物库存聚合查询结果 */
export interface CropInventoryAggregation {
  cropName: string;
  seed: ProduceInventory[];
  seedling: ProduceInventory[];
  product: ProduceInventory[];
  total: number;
  totalQuantity: {
    seed: number;
    seedling: number;
    product: number;
  };
}

/** 预警统计 */
export interface AlertStats {
  totalAlerts: number;
  storageTimeAlerts: number;
  lowStockAlerts: number;
  highStockAlerts: number;
  expirationAlerts: number;
}
