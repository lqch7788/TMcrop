/**
 * 行级采收入库 service（unify-harvest-inbound-into-source-operations）
 * 2026-06-19 Phase 4
 *
 * 封装 3 页面（种源/育苗/种植）操作列调用的统一入库 service。
 * 后端走 POST /api/inventory/inbound-from-source，4 步写入 + 事务回滚在后端。
 *
 * 弹窗 → service → enhancedApiClient → 后端，遵循 V2.1 架构铁律
 */

import { enhancedApiClient } from '@/lib/apiClient'
import { useInventoryStore } from '@/stores/useInventoryStore'

export type StockType = 'seed' | 'seedling' | 'product'
export type SourceModule = 'seed_source' | 'seedling' | 'planting'

export interface InboundProduct {
  cropCode?: string
  cropName: string
  cropVariety?: string
  plantingMode?: string
  harvestQuantity: number
  unit: string
  targetYield?: number
  grade?: string
  auditor?: string
  remarks?: string
  // 2026-06-30 Bug 12 修复：形态字段
  productForm?: string  // 成品形态（果实/种子/花朵等，写入 inventory_stock.product_form）
  sourceForm?: string   // 产物形态（种源/育苗/种植行通用，历史兼容）
}

export interface UnifiedInboundInput {
  stockType: StockType
  sourceModule: SourceModule
  /** 入库来源类型（外购入库/自产入库/内部调拨 等）— 种源入库专用 */
  inboundSourceType?: string
  sourceRecordId: string
  sourceRecordCode: string
  harvestDate: string
  greenhouseIds?: string[]
  greenhouseNames?: string[]
  harvesterIds?: string[]
  harvesterNames?: string[]
  auditor?: string
  remarks?: string
  isSupplementary?: boolean
  supplementaryReason?: string
  unitPrice?: number
  unit: string
  warehouseId: string
  warehouseName?: string
  products: InboundProduct[]
  operatorName?: string
  /**
   * 2026-06-27：成品形态（仅种植行入库时可选，整株/花朵/果实/种子/块茎 等）
   * 由 UnifiedRowHarvestInboundModal 的"成品类型"下拉框传入
   */
  harvestForm?: string
}

export interface UnifiedInboundResult {
  harvestRecordId: string
  harvestCode: string
  stockIds: string[]
  transactionIds: string[]
}

/**
 * service 层预校验（与后端 Zod schema 一致，防御性重复）
 */
export function validateUnifiedInboundInput(input: UnifiedInboundInput): { ok: true } | { ok: false; error: string } {
  if (!input.sourceRecordId) return { ok: false, error: '源记录 ID 必填' }
  if (!input.sourceRecordCode) return { ok: false, error: '源记录 code 必填' }
  if (!input.harvestDate) return { ok: false, error: '采收日期必填' }
  if (!input.warehouseId) return { ok: false, error: '仓库必选' }
  if (!input.unit) return { ok: false, error: '单位必填' }
  if (!input.products || input.products.length === 0) {
    return { ok: false, error: '至少需要 1 条产品明细' }
  }
  for (let i = 0; i < input.products.length; i++) {
    const p = input.products[i]
    if (!p.cropName) return { ok: false, error: `第 ${i + 1} 行：作物名必填` }
    if (!p.harvestQuantity || p.harvestQuantity <= 0) {
      return { ok: false, error: `第 ${i + 1} 行：采收数量必须 > 0` }
    }
    if (!p.unit) return { ok: false, error: `第 ${i + 1} 行：单位必填` }
  }
  if (input.unitPrice !== undefined && (input.unitPrice < 0 || input.unitPrice > 1000000)) {
    return { ok: false, error: '单价必须在 0-1,000,000 之间' }
  }
  if (input.isSupplementary && !input.supplementaryReason) {
    return { ok: false, error: '补录时必须填写补录原因' }
  }
  // 2026-06-19: 种源行入库时种源形态必填
  if (input.sourceModule === 'seed_source' && !input.propagationForm) {
    return { ok: false, error: '种源行入库必须填写种源形态（种子/种苗/实生苗/扦插苗/嫁接苗/组培苗/分株苗/种球/球根）' }
  }
  // 采收日期 ≤ 今天
  const today = new Date().toISOString().slice(0, 10)
  if (input.harvestDate > today) {
    return { ok: false, error: '采收日期不能晚于今天' }
  }
  // sourceModule ↔ stockType 一致性
  if (input.sourceModule === 'seed_source' && input.stockType !== 'seed') {
    return { ok: false, error: '种源行 stockType 必须为 "seed"' }
  }
  if (input.sourceModule === 'seedling' && input.stockType !== 'seedling') {
    return { ok: false, error: '育苗行 stockType 必须为 "seedling"' }
  }
  if (input.sourceModule === 'planting' && input.stockType !== 'product') {
    return { ok: false, error: '种植行 stockType 必须为 "product"' }
  }
  return { ok: true }
}

/**
 * 提交行级采收入库
 * 调 POST /api/inventory/inbound-from-source
 * 成功后调 useInventoryStore.notifyChange() 触发跨页刷新
 */
export async function submitUnifiedInbound(
  input: UnifiedInboundInput
): Promise<{ success: boolean; data?: UnifiedInboundResult; error?: string }> {
  // 预校验
  const validation = validateUnifiedInboundInput(input)
  if (!validation.ok) {
    return { success: false, error: validation.error }
  }

  try {
    const result = await enhancedApiClient.post<UnifiedInboundResult>(
      '/inventory/inbound-from-source',
      input
    )

    // 跨页通知库存订阅者（与 HarvestPage.handleCreateRecord 行为一致）
    try {
      useInventoryStore.getState().notifyChange?.()
    } catch (_) {
      // store 可能没实现 notifyChange，忽略
    }

    return { success: true, data: result }
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || '行级采收入库失败'
    return { success: false, error: msg }
  }
}
