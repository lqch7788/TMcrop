/**
 * 库存调拨入种源 Service（前端 API 封装）
 * 2026-06-24: B3 实施
 *
 * 对接后端 /api/inventory/transfer-to-source + /api/inventory/transferable-sources
 * 数据流：enhancedApiClient → API（V2.1 铁律：无缓存降级）
 *
 * 业务语义：
 * - 用户在「种源管理 → 新增弹窗」选「库存调拨」分支
 * - 调拨面板拉取 /transferable-sources 列表（多选 + 数量调整）
 * - 提交时 POST /transfer-to-source（多选调拨，移动语义）
 * - 后端事务扣减原库存 + 生成新种源（含 14 个 original_* 元数据）
 */

import { enhancedApiClient } from '../lib/apiClient';

// ============ 类型定义 ============

/** stock_type 字面量（与后端 StockType 对齐） */
export type TransferStockType = 'seed' | 'seedling' | 'product';

/** 调拨面板单条记录（来自 GET /transferable-sources） */
export interface TransferableSourceRow {
  id: string;
  instanceId: string;
  stockType: TransferStockType;
  businessType: string;
  businessCode: string;
  cropId: string | null;
  cropName: string;
  varietyId: string | null;
  varietyName: string | null;
  currentQuantity: number;
  availableQuantity: number;
  unit: string;
  inboundDate: string;
  sourceModule: string | null;
  sourceId: string | null;
  sourceType: string | null;
  unitPrice: number;
  supplierId: string | null;
  supplierName: string | null;
  productionPlanCode: string | null;
  // harvestRecordId: 生产 inventory_stock 无此列（修复 2026-06-24）
  warehouseId: string | null;
  warehouseName: string | null;
}

/** 调拨面板单条提交数据 */
export interface TransferItem {
  sourceStockId: string;
  transferQuantity: number;
  unit: string;
}

/** 单条调拨结果（来自 POST /transfer-to-source data 数组的每个元素） */
export interface TransferResult {
  newSeedSourceId: string;
  newSeedSourceCode: string;
  newInventoryStockId: string;
  transferOutTxId: string;
  transferInTxId: string;
}

/** 列出可调拨库存的查询参数 */
export interface ListTransferableFilters {
  stockType?: TransferStockType[];
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  /** P2-8 修复：分页参数（默认后端 500 条） */
  limit?: number;
  offset?: number;
}

// ============ Service ============

export const seedSourceTransferService = {
  /**
   * 列出可调拨到种源的库存记录
   * GET /api/inventory/transferable-sources
   */
  async listTransferableSources(filters: ListTransferableFilters = {}): Promise<TransferableSourceRow[]> {
    const params: string[] = [];
    if (filters.stockType && filters.stockType.length > 0) {
      params.push(`stockType=${filters.stockType.join(',')}`);
    }
    if (filters.keyword) {
      params.push(`keyword=${encodeURIComponent(filters.keyword)}`);
    }
    if (filters.dateFrom) {
      params.push(`dateFrom=${filters.dateFrom}`);
    }
    if (filters.dateTo) {
      params.push(`dateTo=${filters.dateTo}`);
    }
    if (filters.limit != null) {
      params.push(`limit=${filters.limit}`);
    }
    if (filters.offset != null) {
      params.push(`offset=${filters.offset}`);
    }
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    // 修复：enhancedApiClient 已自动解包 data 字段（apiClient.ts:223），service 不应再 .data 二层访问
    const rows = await enhancedApiClient.get<TransferableSourceRow[]>(
      `/inventory/transferable-sources${qs}`
    );
    return rows || [];
  },

  /**
   * 提交库存调拨入种源（多选 + 移动语义）
   * POST /api/inventory/transfer-to-source
   * @returns 新种源 code 列表 + inventory_stock id
   */
  async createFromTransfer(items: TransferItem[], operator?: { id?: string; name?: string }): Promise<TransferResult[]> {
    if (!items || items.length === 0) {
      throw new Error('至少选择 1 条调拨记录');
    }
    if (items.length > 100) {
      throw new Error('批量调拨单次最多 100 条');
    }
    // 修复：enhancedApiClient 已自动解包 data 字段
    const results = await enhancedApiClient.post<TransferResult[]>(
      '/inventory/transfer-to-source',
      {
        items,
        operatorId: operator?.id,
        operatorName: operator?.name,
      }
    );
    return results || [];
  },
};

export default seedSourceTransferService;
