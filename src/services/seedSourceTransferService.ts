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

/** 2026-06-26 Q1: 种源的可退库流水（用于退库弹窗） */
export interface ReturnableInboundRow {
  id: string;
  sourceId: string;
  sourceCode: string;
  sourceInstanceId: string | null;
  stockType: string;
  warehouseId: string | null;
  warehouseName: string | null;
  recordDate: string;
  quantity: number;
  returnedQuantity: number;
  returnableQuantity: number;
  unit: string;
  cropName: string | null;
  cropCode: string | null;
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
  /** 2026-06-26 修复：追加模式作物过滤（只列同作物的库存） */
  cropName?: string;
  /** 2026-06-26 修复：与 cropName 组合精确定位（同作物名下的品种） */
  cropVariety?: string;
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
    // 2026-06-26 修复：追加模式作物过滤参数
    if (filters.cropName) {
      params.push(`cropName=${encodeURIComponent(filters.cropName)}`);
    }
    if (filters.cropVariety) {
      params.push(`cropVariety=${encodeURIComponent(filters.cropVariety)}`);
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

  /**
   * 2026-06-25 v3: 库存调拨 → 追加到现有种源（不创建新记录）
   * POST /api/seed-sources/append-from-inventory
   * 用途：种源操作列「调拨」按钮 — 用户给已存在的种源补货
   * @returns 追加数量 + 新可用库存
   */
  async appendToExistingSeedSource(params: {
    targetSeedSourceId: string;
    items: TransferItem[];
    operator?: { id?: string; name?: string };
    remarks?: string;
  }): Promise<{ appendedCount: number; newAvailableCount: number; newQuantity: number }> {
    if (!params.targetSeedSourceId) {
      throw new Error('目标种源 ID 不能为空');
    }
    if (!params.items || params.items.length === 0) {
      throw new Error('至少选择 1 条调拨记录');
    }
    if (params.items.length > 100) {
      throw new Error('批量调拨单次最多 100 条');
    }
    // 修复：enhancedApiClient 已自动解包 data 字段
    const result = await enhancedApiClient.post<{
      appendedCount: number;
      newAvailableCount: number;
      newQuantity: number;
    }>('/seed-sources/append-from-inventory', {
      targetSeedSourceId: params.targetSeedSourceId,
      items: params.items,
      operatorId: params.operator?.id,
      operatorName: params.operator?.name,
      remarks: params.remarks,
    });
    return result || { appendedCount: 0, newAvailableCount: 0, newQuantity: 0 };
  },

  /**
   * 2026-06-26 Q1: 种源退库 — 严格 1:1 关联原库存（inventory_inbound_records）
   * POST /api/seed-sources/return-to-inventory
   * 用途：种源操作列「退库」按钮 — 把调拨入种源的数量退回原作物库存
   */
  async returnToInventory(params: {
    targetSeedSourceId: string;
    items: Array<{ inboundRecordId: string; quantity: number; unit?: string }>;
    operator?: { id?: string; name?: string };
    remarks?: string;
  }): Promise<{ returnedCount: number; newSourceRemaining: number; newSourceTotal: number }> {
    if (!params.targetSeedSourceId) {
      throw new Error('目标种源 ID 不能为空');
    }
    if (!params.items || params.items.length === 0) {
      throw new Error('至少选择 1 条退库流水');
    }
    if (params.items.length > 100) {
      throw new Error('批量退库单次最多 100 条');
    }
    const result = await enhancedApiClient.post<{
      returnedCount: number;
      newSourceRemaining: number;
      newSourceTotal: number;
    }>('/seed-sources/return-to-inventory', {
      targetSeedSourceId: params.targetSeedSourceId,
      items: params.items,
      operatorId: params.operator?.id,
      operatorName: params.operator?.name,
      remarks: params.remarks,
    });
    return result || { returnedCount: 0, newSourceRemaining: 0, newSourceTotal: 0 };
  },

  /**
   * 2026-06-26 Q1: 列出种源的可退库流水（用于退库弹窗）
   * GET /api/seed-sources/:id/inbound-records
   */
  async listReturnableInboundRecords(seedSourceId: string): Promise<ReturnableInboundRow[]> {
    if (!seedSourceId) return [];
    const rows = await enhancedApiClient.get<ReturnableInboundRow[]>(
      `/seed-sources/${seedSourceId}/inbound-records`,
    );
    return rows || [];
  },
};

export default seedSourceTransferService;
