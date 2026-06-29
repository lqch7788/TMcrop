/**
 * 生产链条统计 Hook
 * 用于获取和计算生产链条各环节的统计数据
 *
 * 关联逻辑：
 * - 生产计划 → 育苗：通过 seedlings.productionPlanCode = productionPlans.batchCode
 * - 育苗 → 种植：通过 plantings.sourceId = seedlings.id
 * - 种植 → 采收：通过 plantings.productionPlanCode = harvestRecords.productionPlanCode
 * - 库存 → 计划：通过 inventory.batch_code = productionPlans.batchCode
 */

import { useQuery } from '@tanstack/react-query';
import { getProductionPlans } from '@/services/apiProductionPlanService';
import { getSeedlings } from '@/services/apiSeedlingService';
import { getPlantings } from '@/services/apiPlantingService';
import { listHarvestRecords } from '@/services/harvestRecordService';
import { getInventoryList } from '@/services/apiInventoryService';
import { CropBatch } from '@/types';
import { Seedling } from '@/types/crop';
import { Planting } from '@/types/crop';
import { HarvestRecord } from '@/types/index';
import { InventoryRecord } from '@/services/apiInventoryService';

// 统计数据接口
export interface ChainStats {
  total: number;       // 总数
  related: number;     // 已关联数
  pending?: number;   // 待处理数（仅生产计划有）
  completed?: number; // 已完成数（仅生产计划有）
}

/**
 * 生产链条统计 Hook
 * 并行获取各环节数据并计算关联统计
 */
export function useProductionChainStats() {
  // 并行获取所有数据
  const { data: productionPlans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: ['production-plans'],
    queryFn: getProductionPlans,
  });

  const { data: seedlings = [], isLoading: isLoadingSeedlings } = useQuery({
    queryKey: ['seedlings'],
    queryFn: getSeedlings,
  });

  const { data: plantings = [], isLoading: isLoadingPlantings } = useQuery({
    queryKey: ['plantings'],
    queryFn: getPlantings,
  });

  const { data: harvestRecords = [], isLoading: isLoadingHarvest } = useQuery({
    queryKey: ['harvest-records'],
    queryFn: listHarvestRecords,
  });

  const { data: inventoryRecords = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => getInventoryList(),
  });

  // 计算生产计划统计
  const productionPlansStats: ChainStats = {
    total: productionPlans.length,
    related: 0,
    pending: 0,
    completed: 0,
  };

  // 收集所有已关联的生产计划批次号
  const relatedPlanCodes = new Set<string>();

  // 计算育苗关联：seedlings.productionPlanCode = productionPlans.batchCode
  seedlings.forEach(seedling => {
    if (seedling.productionPlanCode) {
      relatedPlanCodes.add(seedling.productionPlanCode);
    }
  });

  // 计算种植关联：plantings.productionPlanCode = productionPlans.batchCode
  plantings.forEach(planting => {
    if (planting.productionPlanCode) {
      relatedPlanCodes.add(planting.productionPlanCode);
    }
  });

  // 计算采收关联：harvestRecords.productionPlanCode = productionPlans.batchCode
  harvestRecords.forEach(record => {
    if (record.productionPlanCode) {
      relatedPlanCodes.add(record.productionPlanCode);
    }
  });

  // 计算库存关联：inventory.batch_code = productionPlans.batchCode
  inventoryRecords.forEach(inv => {
    if (inv.batch_code) {
      relatedPlanCodes.add(inv.batch_code);
    }
  });

  // 统计已关联的生产计划
  productionPlans.forEach(plan => {
    if (relatedPlanCodes.has(plan.batchCode)) {
      productionPlansStats.related++;
    }
    // pending: 规划中、进行中的计划
    if (plan.status === 'planning' || plan.status === 'in_progress') {
      productionPlansStats.pending!++;
    }
    // completed: 已完成的计划
    if (plan.status === 'completed' || plan.batchStatus === 'completed') {
      productionPlansStats.completed!++;
    }
  });

  // 计算育苗统计
  const seedlingsStats: ChainStats = {
    total: seedlings.length,
    related: seedlings.filter(s => s.productionPlanCode && relatedPlanCodes.has(s.productionPlanCode)).length,
  };

  // 计算种植统计（关联到育苗或生产计划）
  const plantingRelatedIds = new Set<string>();
  // 关联到育苗的种植
  plantings.forEach(planting => {
    if (planting.sourceId) {
      plantingRelatedIds.add(planting.sourceId);
    }
  });
  // 关联到生产计划的种植
  plantings.forEach(planting => {
    if (planting.productionPlanCode && relatedPlanCodes.has(planting.productionPlanCode)) {
      plantingRelatedIds.add(planting.id);
    }
  });

  const plantingsStats: ChainStats = {
    total: plantings.length,
    related: plantings.filter(p => plantingRelatedIds.has(p.id) || (p.productionPlanCode && relatedPlanCodes.has(p.productionPlanCode))).length,
  };

  // 计算采收统计（关联到种植或生产计划）
  const harvestRelatedIds = new Set<string>();
  harvestRecords.forEach(record => {
    if (record.productionPlanCode && relatedPlanCodes.has(record.productionPlanCode)) {
      harvestRelatedIds.add(record.id);
    }
  });

  const harvestsStats: ChainStats = {
    total: harvestRecords.length,
    related: harvestRecords.filter(h => harvestRelatedIds.has(h.id) || (h.productionPlanCode && relatedPlanCodes.has(h.productionPlanCode))).length,
  };

  // 计算库存统计（关联到生产计划）
  const inventoryStats: ChainStats = {
    total: inventoryRecords.length,
    related: inventoryRecords.filter(inv => inv.batch_code && relatedPlanCodes.has(inv.batch_code)).length,
  };

  return {
    stats: {
      productionPlans: productionPlansStats,
      seedlings: seedlingsStats,
      plantings: plantingsStats,
      harvests: harvestsStats,
      inventory: inventoryStats,
    },
    // 返回原始数据供表格使用
    data: {
      productionPlans,
      seedlings,
      plantings,
      harvestRecords,
      inventoryRecords,
    },
    isLoading: isLoadingPlans || isLoadingSeedlings || isLoadingPlantings || isLoadingHarvest || isLoadingInventory,
  };
}

// 导出数据类型供组件使用
export type ProductionChainData = {
  productionPlans: CropBatch[];
  seedlings: Seedling[];
  plantings: Planting[];
  harvestRecords: HarvestRecord[];
  inventoryRecords: InventoryRecord[];
};
