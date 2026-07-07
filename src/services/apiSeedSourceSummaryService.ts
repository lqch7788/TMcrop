/**
 * 种源入库汇总 API 服务
 * 2026-07-07: 种源外购入库按作物品种（cropName 最细化）汇总查询
 *
 * 对接后端 GET /api/seed-sources/inbound-summary
 * 数据流：API → enhancedApiClient → 汇总页面（无缓存层，V2.1 铁律）
 */

import { enhancedApiClient } from '../lib/apiClient';

/** 入库汇总筛选条件 */
export interface SummaryFilters {
  /** 入库日期起点（YYYY-MM-DD），空 = 不限 */
  startDate?: string;
  /** 入库日期终点（YYYY-MM-DD），空 = 不限 */
  endDate?: string;
  /** 作物品种名（最细化 cropName）模糊匹配，空 = 全部品种 */
  cropName?: string;
  /** 供应商 ID 精确匹配，空 = 全部供应商 */
  supplierId?: string;
}

/** 单次入库明细（Master 行展开后的每条流水） */
export interface InboundDetailRow {
  recordId: string;
  recordDate: string;
  seedCode: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  operatorName: string;
}

/** 聚合行（Master，1 行 = 1 个最细化作物品种） */
export interface InboundSummaryRow {
  cropName: string;
  cropCategory: string;
  typeName: string;
  varietyName: string;
  /** 入库次数（入库流水行数） */
  inboundCount: number;
  /** 累计入库数量（求和） */
  totalQuantity: number;
  /** 累计入库金额（求和） */
  totalAmount: number;
  /** 涉及的供应商清单（去重，顿号分隔） */
  supplierSummary: string;
  /** 最近一次入库日期（YYYY-MM-DD） */
  lastInboundDate: string;
  /** 该品种下所有入库流水（按 record_date 倒序） */
  details: InboundDetailRow[];
}

/**
 * 拉取种源外购入库汇总数据
 * @param filters 筛选条件（全部 optional）
 * @returns 聚合数组，每项 = 一个最细化作物品种 + 其全部入库明细
 */
export async function fetchSeedInboundSummary(
  filters: SummaryFilters = {},
): Promise<InboundSummaryRow[]> {
  // 2026-07-07: 用 URLSearchParams 拼查询串（enhancedApiClient.get 不支持 params 对象，已踩坑）
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.cropName?.trim()) params.set('cropName', filters.cropName.trim());
  if (filters.supplierId?.trim()) params.set('supplierId', filters.supplierId.trim());

  const qs = params.toString();
  const url = qs ? `/seed-sources/inbound-summary?${qs}` : '/seed-sources/inbound-summary';

  // 后端响应格式：{ success, data: InboundSummaryRow[] }
  // enhancedApiClient 已自动解包 data，所以这里直接拿 T
  const data = await enhancedApiClient.get<InboundSummaryRow[]>(url);
  return data ?? [];
}
