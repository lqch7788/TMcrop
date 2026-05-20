/**
 * V3.0 库存服务集成层
 * 在现有服务基础上集成统一库存服务，实现库存联动
 */

import {
  StockType,
  SourceType,
  BusinessType,
  FrozenType,
  InboundRequest,
  OutboundRequest,
  FreezeRequest,
  TransactionType,
  InventoryStatus,
  TraceResult,
  DownstreamTraceResult,
  InventoryStock,
} from '../types/inventory';
import * as inventoryService from './inventoryService';
import { SeedSource } from '../types/crop';
import { Seedling } from '../types/crop';
import { Planting } from '../types/crop';
import { HarvestRecord } from '../types/index';

// ============================================
// 种源库存集成
// ============================================

/**
 * 种源入库（集成统一库存服务）
 * @param seedSource 种源记录
 * @param operatorId 操作人ID
 * @param operatorName 操作人姓名
 */
export async function inboundSeedSource(
  seedSource: SeedSource,
  operatorId: string,
  operatorName: string
): Promise<{ success: boolean; instanceId?: string; error?: string }> {
  const sourceType: SourceType = seedSource.supplierIsInternal
    ? SourceType.SELF_PRODUCED
    : SourceType.EXTERNAL_PURCHASED;

  const request: InboundRequest = {
    stockType: StockType.SEED,
    businessId: seedSource.id,
    businessType: BusinessType.SEED_SOURCE,
    cropId: seedSource.cropCode,
    cropName: seedSource.cropName,
    varietyId: seedSource.cropCode,
    varietyName: seedSource.varietyName,
    quantity: seedSource.availableCount,
    unit: seedSource.unit,
    sourceType,
    supplierId: seedSource.supplierId,
    supplierName: seedSource.supplierName,
    baseId: seedSource.baseId,
    baseName: seedSource.baseName,
    productionPlanId: seedSource.productionPlanId,
    productionPlanCode: seedSource.productionPlanCode,
    remarks: seedSource.remarks,
  };

  const result = await inventoryService.inbound(request, operatorId, operatorName);

  // 更新种源记录的 instanceId
  if (result.success && result.instanceId && seedSource.instanceId === undefined) {
    // 后续可通过 updateSeedSource 更新 instanceId
  }

  return result;
}

/**
 * 种源出库（向育苗模块出库）
 * @param seedSourceId 种源ID
 * @param quantity 出库数量
 * @param businessId 关联业务ID（如育苗ID）
 * @param businessCode 关联业务编号
 * @param operatorId 操作人ID
 * @param operatorName 操作人姓名
 */
export async function outboundSeedSource(
  seedSourceId: string,
  quantity: number,
  businessId: string,
  businessCode: string,
  operatorId: string,
  operatorName: string
): Promise<{ success: boolean; newQuantity?: number; error?: string }> {
  // 先查询种源对应的库存实例
  const stock = await inventoryService.getInventoryByBusinessId(seedSourceId);
  if (!stock) {
    return { success: false, error: '未找到种源库存记录' };
  }

  const request: OutboundRequest = {
    instanceId: stock.instanceId,
    businessId,
    businessType: BusinessType.SEEDLING,
    businessCode,
    quantity,
    operatorId,
    operatorName,
    remarks: '种源出库至育苗',
  };

  return inventoryService.outbound(request);
}

// ============================================
// 育苗库存集成
// ============================================

/**
 * 育苗入库（集成统一库存服务）
 * @param seedling 育苗记录
 * @param operatorId 操作人ID
 * @param operatorName 操作人姓名
 */
export async function inboundSeedling(
  seedling: Seedling,
  operatorId: string,
  operatorName: string
): Promise<{ success: boolean; instanceId?: string; error?: string }> {
  // 查找来源种源的库存实例（如果有）
  let sourceInstanceId: string | undefined;
  let sourceBusinessId: string | undefined;
  let sourceBusinessType: BusinessType | undefined;

  if (seedling.sourceId) {
    const sourceStock = await inventoryService.getInventoryByBusinessId(seedling.sourceId);
    if (sourceStock) {
      sourceInstanceId = sourceStock.instanceId;
      sourceBusinessId = seedling.sourceId;
      sourceBusinessType = BusinessType.SEED_SOURCE;
    }
  }

  const request: InboundRequest = {
    stockType: StockType.SEEDLING,
    businessId: seedling.id,
    businessType: BusinessType.SEEDLING,
    cropId: seedling.cropCode,
    cropName: seedling.cropName,
    varietyId: seedling.cropCode,
    varietyName: seedling.cropVariety,
    quantity: seedling.survivalCount,
    unit: '株',
    sourceType: sourceInstanceId ? SourceType.SELF_PRODUCED : SourceType.EXTERNAL_PURCHASED,
    productionPlanId: seedling.productionPlanId,
    productionPlanCode: seedling.productionPlanCode,
    sourceInstanceId,
    sourceBusinessId,
    sourceBusinessType,
  };

  return inventoryService.inbound(request, operatorId, operatorName);
}

/**
 * 育苗出库（向种植模块出库）
 * @param seedlingId 育苗ID
 * @param quantity 出库数量
 * @param businessId 关联业务ID（如种植ID）
 * @param businessCode 关联业务编号
 * @param operatorId 操作人ID
 * @param operatorName 操作人姓名
 */
export async function outboundSeedling(
  seedlingId: string,
  quantity: number,
  businessId: string,
  businessCode: string,
  operatorId: string,
  operatorName: string
): Promise<{ success: boolean; newQuantity?: number; error?: string }> {
  const stock = await inventoryService.getInventoryByBusinessId(seedlingId);
  if (!stock) {
    return { success: false, error: '未找到育苗库存记录' };
  }

  const request: OutboundRequest = {
    instanceId: stock.instanceId,
    businessId,
    businessType: BusinessType.PLANTING,
    businessCode,
    quantity,
    operatorId,
    operatorName,
    remarks: '育苗出库至种植',
  };

  return inventoryService.outbound(request);
}

// ============================================
// 种植库存集成
// ============================================

/**
 * 种植记录创建（集成统一库存服务）
 * @param planting 种植记录
 * @param operatorId 操作人ID
 * @param operatorName 操作人姓名
 */
export async function createPlantingInventory(
  planting: Planting,
  operatorId: string,
  operatorName: string
): Promise<{ success: boolean; error?: string }> {
  // 种植不直接创建库存，但需要记录来源追溯信息
  // 如果来源是育苗，育苗库存应该在 outboundSeedling 时已扣减
  // 如果来源是种源，种源库存应该在 outboundSeedSource 时已扣减

  // 更新种植记录的 sourceInstanceId 和 seedlingInstanceId
  // 这些信息用于后续追溯
  return { success: true };
}

// ============================================
// 采收库存集成（循环闭环核心）
// ============================================

/**
 * 采收入库（集成统一库存服务）
 * 根据 harvestType 决定入库到哪种库存：
 * - seed: 入库到种源库存（种子采收后可用于下次育苗）
 * - seedling: 入库到育苗库存（种苗采收后可用于下次定植）
 * - product: 入库到产品库存（成品销售）
 *
 * @param harvestRecord 采收记录
 * @param operatorId 操作人ID
 * @param operatorName 操作人姓名
 */
export async function inboundHarvest(
  harvestRecord: HarvestRecord,
  operatorId: string,
  operatorName: string
): Promise<{ success: boolean; instanceId?: string; error?: string }> {
  const harvestType = harvestRecord.harvestType || 'product';
  const targetInventory = harvestRecord.targetInventory || 'product';

  // 根据采收类型确定库存类型
  let stockType: StockType;
  switch (targetInventory) {
    case 'seed':
      stockType = StockType.SEED;
      break;
    case 'seedling':
      stockType = StockType.SEEDLING;
      break;
    default:
      stockType = StockType.PRODUCT;
  }

  // 确定来源类型（如果是自产）
  const sourceType: SourceType = SourceType.SELF_PRODUCED;

  const request: InboundRequest = {
    stockType,
    businessId: harvestRecord.id,
    businessType: BusinessType.HARVEST,
    cropId: harvestRecord.cropCode || '',
    cropName: harvestRecord.cropName,
    varietyId: harvestRecord.cropCode,
    varietyName: harvestRecord.variety,
    quantity: harvestRecord.harvestQuantity,
    unit: harvestRecord.unit,
    sourceType,
    productionPlanId: harvestRecord.productionPlanId,
    productionPlanCode: harvestRecord.productionPlanCode,
    sourceInstanceId: harvestRecord.plantingInstanceId,
    sourceBusinessId: harvestRecord.plantingInstanceId,
    sourceBusinessType: BusinessType.PLANTING,
    extensions: {
      harvestType,
      harvestCode: harvestRecord.harvestCode,
      batchCode: harvestRecord.batchCode,
      greenhouseName: harvestRecord.greenhouseName,
      plantingMode: harvestRecord.plantingMode,
      quality: harvestRecord.quality,
      grade: harvestRecord.grade,
    },
  };

  const result = await inventoryService.inbound(request, operatorId, operatorName);

  // 如果采收的是种子或种苗，需要冻结对应数量用于下次流转
  if (result.success && result.instanceId) {
    if (stockType === StockType.SEED || stockType === StockType.SEEDLING) {
      // 采收的种子/种苗默认全量冻结，用于下次流转
      await inventoryService.freezeInventory({
        instanceId: result.instanceId,
        frozenType: FrozenType.TASK,
        frozenQuantity: harvestRecord.harvestQuantity,
        businessId: harvestRecord.id,
        businessType: BusinessType.HARVEST,
        operatorId,
        operatorName,
        remarks: `${stockType === StockType.SEED ? '种子' : '种苗'}采收冻结，用于下次流转`,
      });
    }
  }

  return result;
}

/**
 * 采收出库（产品销售出库）
 */
export async function outboundHarvest(
  harvestRecordId: string,
  quantity: number,
  businessId: string,
  businessCode: string,
  operatorId: string,
  operatorName: string
): Promise<{ success: boolean; newQuantity?: number; error?: string }> {
  const stock = await inventoryService.getInventoryByBusinessId(harvestRecordId);
  if (!stock) {
    return { success: false, error: '未找到采收入库库存记录' };
  }

  const request: OutboundRequest = {
    instanceId: stock.instanceId,
    businessId,
    businessType: BusinessType.OTHER,
    businessCode,
    quantity,
    operatorId,
    operatorName,
    remarks: '产品销售出库',
  };

  return inventoryService.outbound(request);
}

// ============================================
// 库存查询与追溯
// ============================================

/**
 * 获取种源的完整追溯链
 */
export async function traceSeedSource(seedSourceId: string): Promise<{
  seedSource: InventoryStock | null;
  upstream: TraceResult[];
  downstream: DownstreamTraceResult[];
}> {
  const stock = await inventoryService.getInventoryByBusinessId(seedSourceId);

  let upstream: TraceResult[] = [];
  let downstream: DownstreamTraceResult[] = [];

  if (stock) {
    upstream = await inventoryService.traceUpstream(stock.instanceId);
    downstream = await inventoryService.traceDownstream(stock.instanceId);
  }

  return { seedSource: stock, upstream, downstream };
}

/**
 * 获取育苗的完整追溯链
 */
export async function traceSeedling(seedlingId: string): Promise<{
  seedling: InventoryStock | null;
  upstream: TraceResult[];
  downstream: DownstreamTraceResult[];
}> {
  const stock = await inventoryService.getInventoryByBusinessId(seedlingId);

  let upstream: TraceResult[] = [];
  let downstream: DownstreamTraceResult[] = [];

  if (stock) {
    upstream = await inventoryService.traceUpstream(stock.instanceId);
    downstream = await inventoryService.traceDownstream(stock.instanceId);
  }

  return { seedling: stock, upstream, downstream };
}

/**
 * 获取采收入库的完整追溯链
 */
export async function traceHarvest(harvestRecordId: string): Promise<{
  harvest: InventoryStock | null;
  upstream: TraceResult[];
  downstream: DownstreamTraceResult[];
}> {
  const stock = await inventoryService.getInventoryByBusinessId(harvestRecordId);

  let upstream: TraceResult[] = [];
  let downstream: DownstreamTraceResult[] = [];

  if (stock) {
    upstream = await inventoryService.traceUpstream(stock.instanceId);
    downstream = await inventoryService.traceDownstream(stock.instanceId);
  }

  return { harvest: stock, upstream, downstream };
}

// ============================================
// 库存统计
// ============================================

/**
 * 获取种源库存统计
 */
export async function getSeedInventoryStats(): Promise<{
  totalInstances: number;
  totalQuantity: number;
  byStatus: Record<string, number>;
}> {
  const stocks = await inventoryService.getInventoryList({ stockType: StockType.SEED });

  const byStatus: Record<string, number> = {};
  let totalQuantity = 0;

  for (const stock of stocks) {
    byStatus[stock.status] = (byStatus[stock.status] || 0) + stock.currentQuantity;
    totalQuantity += stock.currentQuantity;
  }

  return {
    totalInstances: stocks.length,
    totalQuantity,
    byStatus,
  };
}

/**
 * 获取育苗库存统计
 */
export async function getSeedlingInventoryStats(): Promise<{
  totalInstances: number;
  totalQuantity: number;
  byStatus: Record<string, number>;
}> {
  const stocks = await inventoryService.getInventoryList({ stockType: StockType.SEEDLING });

  const byStatus: Record<string, number> = {};
  let totalQuantity = 0;

  for (const stock of stocks) {
    byStatus[stock.status] = (byStatus[stock.status] || 0) + stock.currentQuantity;
    totalQuantity += stock.currentQuantity;
  }

  return {
    totalInstances: stocks.length,
    totalQuantity,
    byStatus,
  };
}

/**
 * 获取产品库存统计
 */
export async function getProductInventoryStats(): Promise<{
  totalInstances: number;
  totalQuantity: number;
  byStatus: Record<string, number>;
}> {
  const stocks = await inventoryService.getInventoryList({ stockType: StockType.PRODUCT });

  const byStatus: Record<string, number> = {};
  let totalQuantity = 0;

  for (const stock of stocks) {
    byStatus[stock.status] = (byStatus[stock.status] || 0) + stock.currentQuantity;
    totalQuantity += stock.currentQuantity;
  }

  return {
    totalInstances: stocks.length,
    totalQuantity,
    byStatus,
  };
}

// ============================================
// 导出库存服务（供外部使用）
// ============================================

export {
  inventoryService,
};
