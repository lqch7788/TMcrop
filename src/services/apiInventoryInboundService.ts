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
 *  ⚠️ enhancedApiClient 已自动 unwrap response.data，所以 res 直接就是 InventoryInboundRecord[]
 *     （修复 2026-06-26：之前错误地再次取 res.data → undefined，导致种源页面入库记录始终显示 0 条）
 *
 *  2026-06-27 修复：enhancedApiClient.get 第二个参数 options 是 ApiOptions（只有 retryCount），
 *     没有 params 字段。原代码传 `{params: q}` 被当作 ApiOptions 丢弃，导致
 *     sourceModule/sourceId 等过滤条件完全没传到后端，后端返回全量数据。
 *     现改为直接拼到 URL 上。
 */
export async function listInboundRecords(
  q: InboundRecordsQuery
): Promise<{ data: InventoryInboundRecord[]; total: number }> {
  // 过滤掉 undefined / null / 空串，避免产生 `key=` 这种无效 query
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null && v !== '') {
      cleaned[k] = String(v);
    }
  }
  const qs = new URLSearchParams(cleaned).toString();
  const url = qs ? `/inventory/inbound-records?${qs}` : '/inventory/inbound-records';

  const res = await enhancedApiClient.get<InventoryInboundRecord[]>(url);

  const records = Array.isArray(res) ? res : [];
  return {
    data: records,
    // 注：后端响应包含 meta.total，但 enhancedApiClient 已 unwrap data，total 信息丢失
    // 当前 UI 不依赖 total（前端只用 records 数组），如需恢复 total 请改为单独 GET 端点
    total: records.length,
  };
}
