/**
 * 出库流水前端 Service (V3.1 出库记录独立页)
 * 设计文档：docs/superpowers/specs/2026-06-04-outbound-records-design.md §4
 *
 * 架构铁律：API-only，无降级缓存/无 IndexedDB/无 localStorage
 * 职责：参数转换（camelCase → snake_case） + 调后端
 */

import { enhancedApiClient } from '../lib/apiClient';

// ============ 类型定义（与后端 OutboundRow 字段一一对应，camelCase） ============

export interface OutboundRow {
  id: string;
  instanceId: string;
  stockType: string;
  transactionType: string;
  quantity: number;
  quantityOut: number;
  balanceBefore: number;
  balanceAfter: number;
  businessId?: string;
  businessType?: string;
  businessCode?: string;
  operatorId?: string;
  operatorName?: string;
  operateDate: string;
  remarks?: string;
  createTime: string;
  cropName?: string;
  varietyName?: string;
  cropCode?: string;
  unit?: string;
  warehouseName?: string;
  plantingMode?: string;
  grade?: string;
  greenhouseName?: string;
}

export interface OutboundSummary {
  totalCount: number;
  totalQuantity: number;
  todayCount: number;
  byStockType: Record<string, { count: number; quantity: number }>;
  byBusinessType: Record<string, { count: number; quantity: number }>;
}

export interface OutboundQuery {
  from: string;
  to: string;
  stockType?: string;
  warehouseId?: string;
  cropName?: string;
  operatorName?: string;
  businessType?: string;
  page?: number;
  limit?: number;
}

export interface OutboundListResult {
  rows: OutboundRow[];
  total: number;
  summary: OutboundSummary;
}

// ============ API 调用 ============

/**
 * 列表 + 统计一次返回（避免前端发两次请求）
 * 调用后端 GET /api/inventory/transactions
 */
export async function getOutboundList(query: OutboundQuery): Promise<OutboundListResult> {
  return enhancedApiClient.get<OutboundListResult>('/inventory/transactions?' + buildQuery(query));
}

// 2026-07-28 审核 M：原 exportOutboundCSV（直调 fetch 绕过 enhancedApiClient）已无调用方
//  CSV 改用前端 selectedData + exportCsv 生成（2026-07-28 CRITICAL-3 修复）。删除此函数避免死代码与绕过 apiClient 风险。

// ============ 内部工具 ============

/**
 * 驼峰查询参数 → snake_case 字符串
 * 与后端 inventory.ts 路由接收参数对齐
 */
function buildQuery(q: OutboundQuery & { format?: string }): string {
  const params: Record<string, string> = {
    from: q.from,
    to: q.to,
  };
  if (q.stockType)    params.stock_type    = q.stockType;
  if (q.warehouseId)  params.warehouse_id  = q.warehouseId;
  if (q.cropName)     params.crop_name     = q.cropName;
  if (q.operatorName) params.operator_name = q.operatorName;
  if (q.businessType) params.business_type = q.businessType;
  if (q.page)         params.page          = String(q.page);
  if (q.limit)        params.limit         = String(q.limit);
  if (q.format)       params.format        = q.format;
  return new URLSearchParams(params).toString();
}
