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
  // 2026-07-06：种源外购入库联动成本 — 仅种源行（stockType=seed）外购入库（inboundSourceType=external_purchase）时必填
  supplierId?: string                  // 供应商 ID
  supplierName?: string                // 供应商名称（冗余，便于追溯）
  purchaserIds?: string[]              // 采购员 ID 列表
  purchaserNames?: string[]            // 采购员姓名列表
  purchasePlanId?: string              // 关联采购计划 ID（可选，未传则后端自动创建外购 PR）
  purchasePrice?: number               // 采购单价（区别于 unitPrice "售价"语义）
  purchaseTotalAmount?: number         // 采购总额 = purchasePrice × quantity
}

export interface UnifiedInboundResult {
  harvestRecordId: string
  harvestCode: string
  stockIds: string[]
  transactionIds: string[]
  // 2026-07-06：种源外购入库联动 — 关联/自动创建的采购计划 ID 和物料成本 ID（非外购时为 null）
  purchasePlanId?: string | null
  materialCostId?: string | null
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
  // 2026-06-30 Bug 21：删除 propagationForm 校验 — 用户选 B，统一从产品明细 sourceForm 读形态
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
 * 2026-08-14：育苗入库软校验 — 计算"剩余可入库"并判断本次入库量是否超出
 * 业务背景（D 决策）：不硬拦截（农业现场每日记录滞后是常态，可入库=0 时硬拦截会卡死业务），
 *   仅由调用方弹确认框警告"可能未及时登记每日产出"，确认后放行。
 * 剩余可入库 = max(0, 累计产出 − 小苗损耗 − 已入库)；不修改任何存储字段（扣减视角由列表派生列体现）
 */
export interface SeedlingInboundSoftCheckResult {
  exceeded: boolean    // 是否超出剩余可入库（需弹确认框）
  remaining: number    // 剩余可入库
  exceededBy: number   // 超出量（未超出时为 0）
}

export function checkSeedlingInboundSoftLimit(params: {
  expandedPlantCount?: number
  seedlingLossCount?: number
  harvestStockedCount?: number
  totalQty: number
}): SeedlingInboundSoftCheckResult {
  const remaining = Math.max(0,
    (params.expandedPlantCount || 0)
    - (params.seedlingLossCount || 0)
    - (params.harvestStockedCount || 0),
  )
  const exceeded = params.totalQty > 0 && params.totalQty > remaining
  return {
    exceeded,
    remaining,
    exceededBy: Math.max(0, params.totalQty - remaining),
  }
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
    } catch (e) {
      // 2026-07-10 P0-6 修复：catch(_) → catch(e) { console.warn(...) }
      // store 可能没实现 notifyChange，忽略
      console.warn('[unifiedHarvestInboundService] notifyChange 失败:', e)
    }

    return { success: true, data: result }
  } catch (e) {
    // 2026-07-10 P0-2 修复：catch(e) + narrowing 兼容 axios 错误
    const err = e as { message?: string; response?: { data?: { error?: string } } }
    const msg = err.response?.data?.error || err.message || '行级采收入库失败'
    return { success: false, error: msg }
  }
}
