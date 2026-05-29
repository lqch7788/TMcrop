/**
 * 生产计划关联服务 V3.0
 * 用于查询生产计划与种源、育苗、种植、采收模块的关联关系
 */

import { StockType } from '../types/inventory';
import * as inventoryService from './apiInventoryService';
import * as seedSourceService from './apiSeedSourceService';
import * as seedlingService from './apiSeedlingService';
import * as plantingService from './apiPlantingService';
import * as harvestService from './apiHarvestService';

/**
 * 生产计划关联记录
 */
export interface ProductionPlanRelation {
  /** 关联类型 */
  type: 'seed_source' | 'seedling' | 'planting' | 'harvest';
  /** 关联的业务ID */
  businessId: string;
  /** 关联的业务编号 */
  businessCode: string;
  /** 关联时间 */
  relatedDate: string;
  /** 数量 */
  quantity: number;
  /** 单位 */
  unit: string;
  /** 状态 */
  status: string;
  /** 关联的库存实例ID */
  instanceId?: string;
}

/**
 * 生产计划关联汇总
 */
export interface ProductionPlanRelationSummary {
  productionPlanId: string;
  productionPlanCode: string;
  relations: ProductionPlanRelation[];
  summary: {
    seedSourceCount: number;
    seedlingCount: number;
    plantingCount: number;
    harvestCount: number;
    totalQuantity: number;
  };
}

/**
 * 根据生产计划ID查询关联的种源记录
 */
export async function getRelatedSeedSources(productionPlanId: string): Promise<ProductionPlanRelation[]> {
  const relations: ProductionPlanRelation[] = [];

  // 1. 先通过库存服务查询
  const stocks = await inventoryService.getInventoryList({
    productionPlanId,
    stockType: StockType.SEED,
  });

  for (const stock of stocks) {
    relations.push({
      type: 'seed_source',
      businessId: stock.businessId,
      businessCode: stock.businessId, // 暂时用 businessId
      relatedDate: stock.inboundDate,
      quantity: stock.currentQuantity,
      unit: stock.unit,
      status: stock.status,
      instanceId: stock.instanceId,
    });
  }

  // 2. 备用：直接从种源服务查询（兼容未接入库存服务的记录）
  const seedSources = await seedSourceService.getSeedSources();
  for (const source of seedSources) {
    if (source.productionPlanId === productionPlanId) {
      // 检查是否已通过库存服务添加
      if (!relations.some(r => r.businessId === source.id)) {
        relations.push({
          type: 'seed_source',
          businessId: source.id,
          businessCode: source.seedCode,
          relatedDate: source.purchaseDate,
          quantity: source.availableCount,
          unit: source.unit,
          status: source.status,
        });
      }
    }
  }

  return relations;
}

/**
 * 根据生产计划ID查询关联的育苗记录
 */
export async function getRelatedSeedlings(productionPlanId: string): Promise<ProductionPlanRelation[]> {
  const relations: ProductionPlanRelation[] = [];

  // 1. 先通过库存服务查询
  const stocks = await inventoryService.getInventoryList({
    productionPlanId,
    stockType: StockType.SEEDLING,
  });

  for (const stock of stocks) {
    relations.push({
      type: 'seedling',
      businessId: stock.businessId,
      businessCode: stock.businessId,
      relatedDate: stock.inboundDate,
      quantity: stock.currentQuantity,
      unit: stock.unit,
      status: stock.status,
      instanceId: stock.instanceId,
    });
  }

  // 2. 备用：直接从育苗服务查询
  const seedlings = await seedlingService.getSeedlings();
  for (const seedling of seedlings) {
    if (seedling.productionPlanId === productionPlanId) {
      if (!relations.some(r => r.businessId === seedling.id)) {
        relations.push({
          type: 'seedling',
          businessId: seedling.id,
          businessCode: seedling.seedlingCode,
          relatedDate: seedling.startDate,
          quantity: seedling.survivalCount,
          unit: '株',
          status: seedling.status,
        });
      }
    }
  }

  return relations;
}

/**
 * 根据生产计划ID查询关联的种植记录
 */
export async function getRelatedPlantings(productionPlanId: string): Promise<ProductionPlanRelation[]> {
  const relations: ProductionPlanRelation[] = [];

  // 通过库存服务查询
  const stocks = await inventoryService.getInventoryList({
    productionPlanId,
    stockType: StockType.PRODUCT,
  });

  // 种植记录本身不入库，所以直接从种植服务查询
  const plantings = await plantingService.getPlantings();
  for (const planting of plantings) {
    if (planting.productionPlanId === productionPlanId) {
      const stock = stocks.find(s => s.businessId === planting.id);
      relations.push({
        type: 'planting',
        businessId: planting.id,
        businessCode: planting.plantCode,
        relatedDate: planting.plantingDate,
        quantity: planting.plantingCount,
        unit: '株',
        status: planting.status,
        instanceId: stock?.instanceId,
      });
    }
  }

  return relations;
}

/**
 * 根据生产计划ID查询关联的采收记录
 */
export async function getRelatedHarvests(productionPlanId: string): Promise<ProductionPlanRelation[]> {
  const relations: ProductionPlanRelation[] = [];

  // 1. 先通过库存服务查询
  const stocks = await inventoryService.getInventoryList({
    productionPlanId,
    stockType: StockType.PRODUCT,
  });

  for (const stock of stocks) {
    if (stock.businessType === 'harvest') {
      relations.push({
        type: 'harvest',
        businessId: stock.businessId,
        businessCode: stock.businessId,
        relatedDate: stock.inboundDate,
        quantity: stock.currentQuantity,
        unit: stock.unit,
        status: stock.status,
        instanceId: stock.instanceId,
      });
    }
  }

  // 2. 备用：直接从采收服务查询
  const harvests = await harvestService.getHarvestRecords();
  for (const harvest of harvests) {
    if (harvest.productionPlanId === productionPlanId) {
      if (!relations.some(r => r.businessId === harvest.id)) {
        relations.push({
          type: 'harvest',
          businessId: harvest.id,
          businessCode: harvest.harvestCode,
          relatedDate: harvest.harvestDate,
          quantity: harvest.harvestQuantity,
          unit: harvest.unit,
          status: harvest.status,
        });
      }
    }
  }

  return relations;
}

/**
 * 获取生产计划的完整关联汇总
 */
export async function getProductionPlanRelations(
  productionPlanId: string,
  productionPlanCode: string
): Promise<ProductionPlanRelationSummary> {
  const [seedSources, seedlings, plantings, harvests] = await Promise.all([
    getRelatedSeedSources(productionPlanId),
    getRelatedSeedlings(productionPlanId),
    getRelatedPlantings(productionPlanId),
    getRelatedHarvests(productionPlanId),
  ]);

  const relations = [...seedSources, ...seedlings, ...plantings, ...harvests];

  const summary = {
    seedSourceCount: seedSources.length,
    seedlingCount: seedlings.length,
    plantingCount: plantings.length,
    harvestCount: harvests.length,
    totalQuantity: [...seedSources, ...seedlings, ...plantings, ...harvests].reduce(
      (sum, r) => sum + r.quantity,
      0
    ),
  };

  return {
    productionPlanId,
    productionPlanCode,
    relations,
    summary,
  };
}

/**
 * 获取生产计划进度
 */
export async function getProductionPlanProgress(productionPlanId: string): Promise<{
  planned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}> {
  const [seedSources, seedlings, plantings, harvests] = await Promise.all([
    getRelatedSeedSources(productionPlanId),
    getRelatedSeedlings(productionPlanId),
    getRelatedPlantings(productionPlanId),
    getRelatedHarvests(productionPlanId),
  ]);

  const all = [...seedSources, ...seedlings, ...plantings, ...harvests];

  return {
    planned: all.filter(r => r.status === 'draft' || r.status === 'planned').length,
    inProgress: all.filter(r => r.status === 'in_progress' || r.status === 'pending').length,
    completed: all.filter(r => r.status === 'completed' || r.status === 'stored').length,
    cancelled: all.filter(r => r.status === 'cancelled' || r.status === 'void').length,
  };
}
