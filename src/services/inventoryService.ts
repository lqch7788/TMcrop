/**
 * 统一库存服务 V3.0
 * 数据流：前端 → enhancedApiClient → 后端 Express → SQLite
 *
 * 架构铁律：
 * - 组件不直接调用 fetch/axios
 * 业务直连 API，无任何缓存层（V2.1 铁律）
 * - 所有数据操作通过 enhancedApiClient 直连后端 API
 */

import { enhancedApiClient } from '../lib/apiClient';
import { todayLocal } from '@/lib/dateUtils';
import {
  InventoryStock,
  InventoryTransaction,
  InventoryStatus,
  StockType,
  BusinessType,
  InventoryOperationResult,
  AvailableQuantityResult,
  InboundRequest,
  OutboundRequest,
  FreezeRequest,
  TraceResult,
  DownstreamTraceResult,
  InventoryStats,
  CropInventoryAggregation,
  SourceType,
  TransactionType,
} from '../types/inventory';

// ============================================
// 辅助方法
// ============================================

/** 计算可用数量（前端展示用） */
export function calculateAvailableQuantity(stock: InventoryStock): number {
  return Math.max(0, (stock.currentQuantity ?? 0) - (stock.frozenQuantity ?? 0));
}

// ============================================
// 核心 API 方法
// ============================================

/**
 * 入库操作（采收、采购、自产等场景共用）
 * 调用后端 POST /api/inventory/inbound
 */
export async function inbound(
  request: InboundRequest,
  operatorId: string,
  operatorName: string
): Promise<InventoryOperationResult> {
  try {
    const response = await enhancedApiClient.post<{
      instanceId: string;
      transactionId: string;
      currentQuantity: number;
      availableQuantity: number;
    }>('/inventory/inbound', {
      stockType: request.stockType,
      businessId: request.businessId,
      businessType: request.businessType,
      businessCode: request.businessCode,
      cropId: request.cropId,
      cropName: request.cropName,
      varietyId: request.varietyId,
      varietyName: request.varietyName,
      quantity: request.quantity,
      unit: request.unit,
      warehouseId: request.extensions?.warehouseId || '',
      warehouseName: request.extensions?.warehouseName || '',
      inboundDate: request.extensions?.inboundDate || todayLocal(),
      sourceType: request.sourceType,
      sourceInstanceId: request.sourceInstanceId,
      productionPlanCode: request.productionPlanCode,
      remarks: request.remarks,
      operatorId,
      operatorName,
      // V3 扩展字段（让库存页展示完整采收元数据）
      cropCode: request.cropCode,
      plantingMode: request.plantingMode,
      targetYield: request.targetYield,
      grade: request.grade,
      auditor: request.auditor,
      greenhouseName: request.greenhouseName,
    });
    return {
      success: true,
      instanceId: response.instanceId,
      newQuantity: response.currentQuantity,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '入库失败',
    };
  }
}

/**
 * 出库操作（带乐观锁）
 * 调用后端 POST /api/inventory/outbound
 */
export async function outbound(request: OutboundRequest): Promise<InventoryOperationResult> {
  try {
    const response = await enhancedApiClient.post<{
      instanceId: string;
      currentQuantity: number;
      availableQuantity: number;
      transactionId: string;
    }>('/inventory/outbound', {
      instanceId: request.instanceId,
      businessId: request.businessId,
      businessType: request.businessType,
      businessCode: request.businessCode,
      quantity: request.quantity,
      operatorId: request.operatorId,
      operatorName: request.operatorName,
      remarks: request.remarks,
    });
    return {
      success: true,
      instanceId: response.instanceId,
      newQuantity: response.currentQuantity,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '出库失败',
    };
  }
}

/**
 * 冻结库存
 * 调用后端 POST /api/inventory/freeze
 */
export async function freezeInventory(request: FreezeRequest): Promise<InventoryOperationResult> {
  try {
    const response = await enhancedApiClient.post<{
      freezeId: string;
      instanceId: string;
      frozenQuantity: number;
    }>('/inventory/freeze', {
      instanceId: request.instanceId,
      frozenType: request.frozenType,
      frozenQuantity: request.frozenQuantity,
      businessId: request.businessId,
      businessType: request.businessType,
      operatorId: request.operatorId,
      operatorName: request.operatorName,
      remarks: request.remarks,
    });
    return {
      success: true,
      instanceId: response.instanceId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '冻结失败',
    };
  }
}

/**
 * 解冻库存
 * 调用后端 POST /api/inventory/unfreeze/:freezeId
 */
export async function unfreezeInventory(freezeId: string): Promise<InventoryOperationResult> {
  try {
    const response = await enhancedApiClient.post<{ instanceId: string }>(
      `/inventory/unfreeze/${encodeURIComponent(freezeId)}`
    );
    return {
      success: true,
      instanceId: response.instanceId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '解冻失败',
    };
  }
}

// ============================================
// 查询方法
// ============================================

/**
 * 获取库存列表（支持多种过滤）
 * 调用后端 GET /api/inventory/list
 *
 * 注意：后端 query 参数约定 snake_case（stock_type / source_type），
 * 前端这里显式转换，避免出现"前端发了 filter、后端没收到"的 bug。
 */
export async function getInventoryList(filters?: {
  stockType?: StockType;
  status?: InventoryStatus;
  sourceType?: SourceType;
  productionPlanId?: string;
  cropName?: string;
  page?: number;
  limit?: number;
}): Promise<InventoryStock[]> {
  const params: Record<string, string> = {};
  // camelCase → snake_case：后端 inventory.controller.getList 读 snake_case 参数
  if (filters?.stockType) params.stock_type = filters.stockType;
  if (filters?.status) params.status = filters.status;
  if (filters?.sourceType) params.source_type = filters.sourceType;
  if (filters?.productionPlanId) params.production_plan_id = filters.productionPlanId;
  if (filters?.cropName) params.crop_name = filters.cropName;
  if (filters?.page) params.page = String(filters.page);
  if (filters?.limit) params.limit = String(filters.limit);

  const query = new URLSearchParams(params).toString();
  // 注意：enhancedApiClient 已自动解包一层 data，这里直接得到数组
  // 不要写成 data.data，否则会变成 undefined（与项目 memory api-client-response-unwrapping 教训一致）
  const items = await enhancedApiClient.get<InventoryStock[]>(
    `/inventory/list${query ? `?${query}` : ''}`
  );

  // 后端字段为 snake_case，转换为前端 camelCase
  return (items || []).map(toCamelStock);
}

/**
 * 获取库存统计
 * 调用后端 GET /api/inventory/stats
 */
export async function getInventoryStats(filters?: {
  stockType?: StockType;
  page?: number;
  limit?: number;
}): Promise<InventoryStats> {
  const params: Record<string, string> = {};
  if (filters?.stockType) params.stockType = filters.stockType;

  const query = new URLSearchParams(params).toString();
  const data = await enhancedApiClient.get<InventoryStats>(
    `/inventory/stats${query ? `?${query}` : ''}`
  );
  return data;
}

/**
 * 查询可用数量
 * 调用后端 GET /api/inventory/available/:instanceId
 */
export async function getAvailableQuantity(
  instanceId: string
): Promise<AvailableQuantityResult | null> {
  try {
    return await enhancedApiClient.get<AvailableQuantityResult>(
      `/inventory/available/${encodeURIComponent(instanceId)}`
    );
  } catch {
    return null;
  }
}

/**
 * 根据业务ID获取库存
 * 调用后端 GET /api/inventory/by-business/:businessId
 */
export async function getInventoryByBusinessId(
  businessId: string
): Promise<InventoryStock | null> {
  try {
    const data = await enhancedApiClient.get<InventoryStock>(
      `/inventory/by-business/${encodeURIComponent(businessId)}`
    );
    return data ? toCamelStock(data) : null;
  } catch {
    return null;
  }
}

/**
 * 批量删除库存
 * 调用后端 DELETE /api/inventory/batch?ids=id1,id2,id3
 */
export async function deleteInventoryBatch(ids: string[]): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  if (ids.length === 0) {
    return { success: true, deletedCount: 0 };
  }
  try {
    const result = await enhancedApiClient.delete<{ deletedCount: number }>(
      `/inventory/batch?ids=${encodeURIComponent(ids.join(','))}`
    );
    return { success: true, deletedCount: result?.deletedCount ?? ids.length };
  } catch (error) {
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : '批量删除失败',
    };
  }
}

/**
 * 获取交易记录
 * 调用后端 GET /api/inventory/transaction/:instanceId
 */
export async function getTransactions(instanceId: string): Promise<InventoryTransaction[]> {
  const data = await enhancedApiClient.get<InventoryTransaction[]>(
    `/inventory/transaction/${encodeURIComponent(instanceId)}`
  );
  return (data || []).map(toCamelTransaction);
}

/**
 * 获取冻结记录
 * 调用后端 GET /api/inventory/freezes/:instanceId
 */
export async function getFreezes(instanceId: string): Promise<unknown[]> {
  try {
    const data = await enhancedApiClient.get<unknown[]>(
      `/inventory/freezes/${encodeURIComponent(instanceId)}`
    );
    return data || [];
  } catch {
    return [];
  }
}

// ============================================
// 追溯（上游/下游）
// ============================================

/**
 * 上游追溯
 * 调用后端 GET /api/inventory/trace/upstream/:instanceId
 */
export async function traceUpstream(
  instanceId: string,
  maxDepth: number = 10
): Promise<TraceResult[]> {
  const data = await enhancedApiClient.get<TraceResult[]>(
    `/inventory/trace/upstream/${encodeURIComponent(instanceId)}?maxDepth=${maxDepth}`
  );
  return data || [];
}

/**
 * 下游追溯
 * 调用后端 GET /api/inventory/trace/downstream/:instanceId
 */
export async function traceDownstream(
  instanceId: string,
  maxDepth: number = 10
): Promise<DownstreamTraceResult[]> {
  const data = await enhancedApiClient.get<DownstreamTraceResult[]>(
    `/inventory/trace/downstream/${encodeURIComponent(instanceId)}?maxDepth=${maxDepth}`
  );
  return data || [];
}

// ============================================
// 作物聚合查询
// ============================================

/**
 * 按作物名称聚合查询库存（多形态搜索）
 * 调用后端 GET /api/inventory/aggregate/by-crop
 */
export async function searchInventoryByCropName(
  cropName?: string
): Promise<CropInventoryAggregation> {
  const params = new URLSearchParams();
  if (cropName) params.append('crop_name', cropName);
  const query = params.toString();

  return await enhancedApiClient.get<CropInventoryAggregation>(
    `/inventory/aggregate/by-crop${query ? `?${query}` : ''}`
  );
}

// ============================================
// 字段映射：后端 snake_case → 前端 camelCase
// ============================================

function toCamelStock(row: any): InventoryStock {
  if (!row) return row;
  return {
    instanceId: row.instance_id ?? row.instanceId,
    stockType: (row.stock_type ?? row.stockType) as StockType,
    businessId: row.business_id ?? row.businessId,
    businessType: (row.business_type ?? row.businessType) as BusinessType,
    businessCode: row.business_code ?? row.businessCode,
    cropId: row.crop_id ?? row.cropId,
    cropName: row.crop_name ?? row.cropName,
    varietyId: row.variety_id ?? row.varietyId,
    varietyName: row.variety_name ?? row.varietyName,
    currentQuantity: Number(row.current_quantity ?? row.currentQuantity ?? 0),
    frozenQuantity: Number(row.frozen_quantity ?? row.frozenQuantity ?? 0),
    availableQuantity: Number(row.available_quantity ?? row.availableQuantity ?? 0),
    unit: row.unit ?? '',
    sourceType: (row.source_type ?? row.sourceType) as SourceType,
    supplierId: row.supplier_id ?? row.supplierId,
    supplierName: row.supplier_name ?? row.supplierName,
    baseId: row.base_id ?? row.baseId,
    baseName: row.base_name ?? row.baseName,
    productionPlanId: row.production_plan_id ?? row.productionPlanId,
    productionPlanCode: row.production_plan_code ?? row.productionPlanCode,
    sourceInstanceId: row.source_instance_id ?? row.sourceInstanceId,
    sourceBusinessId: row.source_business_id ?? row.sourceBusinessId,
    sourceBusinessType: (row.source_business_type ?? row.sourceBusinessType) as BusinessType,
    status: (row.status ?? 'in_stock') as InventoryStatus,
    inboundDate: row.inbound_date ?? row.inboundDate ?? '',
    lastOutboundDate: row.last_outbound_date ?? row.lastOutboundDate,
    expiryDate: row.expiry_date ?? row.expiryDate,
    version: Number(row.version ?? 1),
    warehouseId: row.warehouse_id ?? row.warehouseId,
    warehouseName: row.warehouse_name ?? row.warehouseName,
    extensions: row.extensions,
    // V3 扩展字段（采收入库对接）
    cropCode: row.crop_code ?? row.cropCode,
    plantingMode: row.planting_mode ?? row.plantingMode,
    targetYield: Number(row.target_yield ?? row.targetYield ?? 0),
    grade: row.grade ?? row.grade,
    auditor: row.auditor ?? row.auditor,
    remarks: row.remarks ?? row.remarks,
    greenhouseName: row.greenhouse_name ?? row.greenhouseName,
  } as unknown as InventoryStock;
}

function toCamelTransaction(row: any): InventoryTransaction {
  if (!row) return row;
  return {
    id: row.id ?? '',
    instanceId: row.instance_id ?? row.instanceId,
    stockType: (row.stock_type ?? row.stockType) as StockType,
    transactionType: (row.transaction_type ?? row.transactionType) as TransactionType,
    quantity: Number(row.quantity ?? 0),
    balanceBefore: Number(row.balance_before ?? row.balanceBefore ?? 0),
    balanceAfter: Number(row.balance_after ?? row.balanceAfter ?? 0),
    businessId: row.business_id ?? row.businessId,
    businessType: (row.business_type ?? row.businessType) as BusinessType,
    businessCode: row.business_code ?? row.businessCode,
    operatorId: row.operator_id ?? row.operatorId ?? '',
    operatorName: row.operator_name ?? row.operatorName ?? '',
    operateDate: row.operate_date ?? row.operateDate ?? '',
    remarks: row.remarks,
    extensions: row.extensions,
  } as InventoryTransaction;
}
