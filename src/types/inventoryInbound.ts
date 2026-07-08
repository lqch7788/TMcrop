/**
 * 库存入库按模块下沉 — 类型定义
 * 2026-06-18 任务 3
 *
 * 设计要点：
 * - StockType / SourceType 用字符串字面量联合（与 inventory.ts 中 enum 保持兼容，但避免依赖 enum 运行时）
 * - SourceModule 标识入库数据的来源业务模块
 * - InboundSourceRecord 是"打开入库弹窗前由调用方传入的源数据快照"
 */

/** 库存类型（与 types/inventory.ts 的 StockType enum 一致） */
export type StockType = 'seed' | 'seedling' | 'product'

/** 入库数据的来源业务模块 */
export type SourceModule = 'seed_source' | 'seedling' | 'planting'

/** 入库来源类型（与 types/inventory.ts 的 SourceType enum 保持一致） */
export type SourceType =
  | 'external_purchased'
  | 'gift'
  | 'commissioned'
  | 'transfer'
  | 'manual'
  | 'self_produced'

/** 入库记录实体（GET /inbound-records 返回结构） */
export interface InventoryInboundRecord {
  id: string
  /** 2026-07-08 新增：后端 inventory_inbound_records 表 record_type 列（前端类型漏补） */
  recordType?: string | null
  recordDate: string
  sourceModule: SourceModule
  sourceId: string
  sourceCode: string | null
  stockType: StockType
  sourceType: SourceType
  warehouseId: string | null
  warehouseName: string | null
  cropId: string | null
  cropCode: string | null
  cropName: string | null
  varietyName: string | null
  /** 2026-06-28：后端 LEFT JOIN harvest_records 取的采收形态（whole_plant/flower/fruit/...） */
  harvestForm?: string | null
  /** 2026-07-08 新增：fixMissingSchema.ts 已加列，前端类型漏补（退料累计） */
  returnedQuantity?: number | null
  quantity: number
  unit: string
  unitPrice: number
  totalAmount: number
  qualityGrade: string | null
  supplierId: string | null
  supplierName: string | null
  productionPlanId: string | null
  productionPlanCode: string | null
  businessId: string | null
  notes: string | null
  operatorName: string | null
  createBy: string | null
  createTime: string
  updateTime: string
}

/** 入库入参（POST /inbound-record body） */
export interface InventoryInboundInput {
  sourceModule: SourceModule
  sourceId: string
  stockType: StockType
  sourceType: SourceType
  warehouseId: string
  /** 仓库名称快照（前端弹窗直接展示，无需再次查字典） */
  warehouseName?: string
  /** 作物 id（前端弹窗从来源记录带出，无需后端查字典）*/
  cropId?: string
  /** 作物 11 位编码（如 010203040501）*/
  cropCode?: string
  /** 作物名称（最细分，如"粉冠 F1"）*/
  cropName?: string
  /** 品种名称（冗余展示，可与 cropName 同时存在）*/
  varietyName?: string
  quantity: number
  unit: string
  /** 入库日期（默认后端取当前） */
  recordDate?: string
  unitPrice?: number
  totalAmount?: number
  qualityGrade?: string
  supplierId?: string
  supplierName?: string
  /** 2026-07-08 新增：外购入库 — 供应商联系电话 */
  supplierPhone?: string
  /** 2026-07-08 新增：赠送入库 — 赠送来源（人/单位/备注） */
  giftFrom?: string
  /** 2026-07-08 新增：委托入库 — 委托方名称 */
  consignor?: string
  /** 2026-07-08 新增：调拨入库 — 源仓库名称 */
  sourceWarehouseName?: string
  /** 2026-07-08 新增：手动入库 — 盘点单号 */
  stocktakeNo?: string
  /** 2026-07-08 新增：自产入库 — 基地 id */
  baseId?: string
  /** 2026-07-08 新增：自产入库 — 基地名称 */
  baseName?: string
  productionPlanId?: string
  productionPlanCode?: string
  businessId?: string
  notes?: string
  operatorName?: string
}

/**
 * 源记录快照：调用方在打开弹窗前从种源/育苗/种植一行数据提取的最小集。
 * 弹窗内不直接依赖完整源数据实体，只展示必要字段。
 */
export interface InboundSourceRecord {
  module: SourceModule
  id: string
  code: string
  cropName: string
  cropVariety: string
  cropCode: string
  /** 源记录的单位（用于弹窗打开时初始化 unit 字段） */
  unit?: string
  productionPlanId?: string
  productionPlanCode?: string
  // 2026-07-07: 蓝色源记录块要展示"形态详实" — 种源类型 + 种源形态（与种源列表形态列同源）
  sourceType?: SourceType
  seedForm?: string | null
}
