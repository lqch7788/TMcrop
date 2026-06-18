/**
 * 作物管理 V2 共享类型
 * 任务 12: Phase 3 UI 流程
 *
 * - CirculationTypeEnum: 3 种回流类型
 * - OriginPathEnum: 种植来源路径
 * - InventoryBusinessTypeEnum: 库存业务类型
 * - PropagationSubTypeEnum: 代际型子类型
 * - CirculationInput: 回流输入
 * - CirculationRecord: 回流记录
 */
export type CirculationType = 'PROPAGATION' | 'QUANTITY' | 'DISPOSAL'

export type OriginPath = 'direct_from_seed' | 'via_seedling'

export type InventoryBusinessType = 'harvest' | 'seedling' | 'seed' | 'circulation'

export type PropagationSubType = 'cutting' | 'seed_saving' | 'g0_g1' | 'quantity_refill' | 'quantity_inbound'

export type CirculationDestination = 'seed_source' | 'inventory_stock'

export type EndType = 'harvest' | 'circulate' | 'self_seed' | 'dispose'

export interface CirculationInput {
  circulationType: CirculationType
  sourceModule: 'planting' | 'harvest' | 'seedling'
  sourceId: string
  parentSourceId: string
  subType?: PropagationSubType
  destination?: CirculationDestination
  warehouseId?: string
  quantity?: number
  unit?: string
  notes?: string
  operatorId?: string
}

export interface CirculationRecord {
  id: string
  circulationType: CirculationType
  sourceModule: 'planting' | 'harvest' | 'seedling'
  sourceId: string
  parentSourceId: string
  newSourceId?: string | null
  quantity?: number | null
  unit?: string | null
  circulationDate: string
  operatorId?: string | null
  notes?: string | null
  residueType?: 'STEM' | 'ROOT' | 'BRANCH' | 'OTHER' | null
  disposition?: 'CIRCULATE' | 'DISPOSAL' | 'SALES' | null
  isRevoked: number
  revokedAt?: string | null
  revokedBy?: string | null
  createdAt: string
}

export interface TraceSourceResult {
  businessType: InventoryBusinessType | string
  businessId: string
  detailUrl: string
}
