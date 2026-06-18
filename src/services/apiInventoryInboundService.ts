/**
 * 库存入库按模块下沉 — Service 层
 * 2026-06-18 任务 3
 *
 * 数据流：Store → Service → enhancedApiClient → API → SQLite DB
 * 路径修正（2026-06-18 任务 1+2）：POST 走 /inbound-record，避让原 inventoryController.inbound
 *
 * ⚠️ 重要：enhancedApiClient 已自动解包后端响应的 `data` 字段，
 *    所以这里直接返回解包后的值，不能再 `res.data` 二次访问。
 *    （参见项目记忆 [api-client-response-unwrapping.md]）
 */

import { enhancedApiClient } from '@/lib/apiClient'
import type { InventoryInboundInput, InventoryInboundRecord } from '@/types/inventoryInbound'

/** POST /api/inventory/inbound-record — 创建一条入库记录（含写库存） */
export async function inbound(
  input: InventoryInboundInput
): Promise<{ stockId: string; recordId: string }> {
  // enhancedApiClient 自动解包 {success, data} → 直接返回内层 data
  return await enhancedApiClient.post<{ stockId: string; recordId: string }>(
    '/api/inventory/inbound-record',
    input
  )
}

/** 入库记录查询参数 */
export interface InboundRecordsQuery {
  sourceModule?: string
  sourceId?: string
  stockType?: string
  warehouseId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

/** GET /api/inventory/inbound-records — 分页查询入库记录 */
export async function listInboundRecords(
  q: InboundRecordsQuery
): Promise<{ data: InventoryInboundRecord[]; total: number }> {
  // enhancedApiClient 自动解包：{success, data, meta} → 内层 data 是数组，meta 在同层
  // 但根据 api-client-response-unwrapping 记忆，response 是 {data, meta?}，不是 {data, meta:{total}}
  // 所以解包后是 { data: [...] , meta: { total, page, limit } }
  const res = await enhancedApiClient.get<{
    data: InventoryInboundRecord[]
    meta: { total: number; page: number; limit: number }
  }>('/api/inventory/inbound-records', { params: q as Record<string, unknown> })

  return {
    data: res?.data ?? [],
    total: res?.meta?.total ?? 0,
  }
}
