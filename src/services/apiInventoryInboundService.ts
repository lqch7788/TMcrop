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

/** POST /api/inventory/inbound-record — 创建一条入库记录（含写库存）
 *  ⚠️ enhancedApiClient 的 baseURL 已含 /api 前缀，service 不要再加 /api
 */
export async function inbound(
  input: InventoryInboundInput
): Promise<{ stockId: string; recordId: string }> {
  return await enhancedApiClient.post<{ stockId: string; recordId: string }>(
    '/inventory/inbound-record',
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

/** GET /api/inventory/inbound-records — 分页查询入库记录
 *  ⚠️ enhancedApiClient 的 baseURL 已含 /api 前缀，service 不要再加 /api
 */
export async function listInboundRecords(
  q: InboundRecordsQuery
): Promise<{ data: InventoryInboundRecord[]; total: number }> {
  const res = await enhancedApiClient.get<{
    data: InventoryInboundRecord[]
    meta: { total: number; page: number; limit: number }
  }>('/inventory/inbound-records', { params: q as Record<string, unknown> })

  return {
    data: res?.data ?? [],
    total: res?.meta?.total ?? 0,
  }
}
