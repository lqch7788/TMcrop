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
  quantity: number
  unit: string
  /** 入库日期（默认后端取当前） */
  recordDate?: string
  unitPrice?: number
  totalAmount?: number
  qualityGrade?: string
  supplierId?: string
  supplierName?: string
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
