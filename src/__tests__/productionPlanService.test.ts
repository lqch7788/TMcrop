/**
 * 生产计划关联服务测试用例
 * 测试生产计划与各模块的关联查询功能
 */

import * as productionPlanService from '../services/productionPlanService';
import * as inventoryService from '../services/inventoryService';
import * as seedSourceService from '../services/seedSourceService';
import * as seedlingService from '../services/seedlingService';
import * as plantingService from '../services/plantingService';
import * as harvestService from '../services/harvestService';

// 清理函数
const clearAllTestData = () => {
  localStorage.removeItem('inventory_stock_v3');
  localStorage.removeItem('inventory_transaction_v3');
  localStorage.removeItem('inventory_freeze_v3');
  localStorage.removeItem('crop_seed_sources');
  localStorage.removeItem('crop_seedlings');
  localStorage.removeItem('crop_plantings');
  localStorage.removeItem('harvest_records');
};

describe('生产计划关联服务', () => {
  beforeEach(() => {
    clearAllTestData();
    // 初始化各服务数据
    seedSourceService.initSeedSources();
    seedlingService.initSeedlings();
    plantingService.initPlantings();
    harvestService.initHarvestRecords();
  });

  afterAll(() => {
    clearAllTestData();
  });

  describe('数据初始化', () => {
    it('各服务应正确初始化', () => {
      expect(seedSourceService.getSeedSources().length).toBeGreaterThan(0);
      expect(seedlingService.getSeedlings().length).toBeGreaterThan(0);
      expect(plantingService.getPlantings().length).toBeGreaterThan(0);
      expect(harvestService.getHarvestRecords().length).toBeGreaterThan(0);
    });
  });

  describe('关联类型定义', () => {
    it('ProductionPlanRelation 类型应包含必要的字段', () => {
      const relation: productionPlanService.ProductionPlanRelation = {
        type: 'seed_source',
        businessId: 'SS001',
        businessCode: 'ZZ20260115-001',
        relatedDate: '2026-01-15',
        quantity: 100000,
        unit: '粒',
        status: 'available',
      };

      expect(relation.type).toBe('seed_source');
      expect(relation.businessId).toBeDefined();
      expect(relation.businessCode).toBeDefined();
      expect(relation.quantity).toBeGreaterThan(0);
    });

    it('ProductionPlanRelationSummary 应包含汇总信息', () => {
      const summary: productionPlanService.ProductionPlanRelationSummary = {
        productionPlanId: 'PP001',
        productionPlanCode: 'SC20260401-001',
        relations: [],
        summary: {
          seedSourceCount: 0,
          seedlingCount: 0,
          plantingCount: 0,
          harvestCount: 0,
          totalQuantity: 0,
        },
      };

      expect(summary.productionPlanId).toBeDefined();
      expect(summary.summary).toBeDefined();
      expect(summary.summary.totalQuantity).toBe(0);
    });
  });

  describe('getRelatedSeedSources', () => {
    it('应该能够查询关联的种源记录', async () => {
      // 注意：默认数据中的种源可能没有 productionPlanId
      // 这里主要测试函数能正常执行并返回数组
      const relations = await productionPlanService.getRelatedSeedSources('PP001');

      expect(Array.isArray(relations)).toBe(true);
    });
  });

  describe('getRelatedSeedlings', () => {
    it('应该能够查询关联的育苗记录', async () => {
      const relations = await productionPlanService.getRelatedSeedlings('PP001');

      expect(Array.isArray(relations)).toBe(true);
    });
  });

  describe('getRelatedPlantings', () => {
    it('应该能够查询关联的种植记录', async () => {
      const relations = await productionPlanService.getRelatedPlantings('PP001');

      expect(Array.isArray(relations)).toBe(true);
    });
  });

  describe('getRelatedHarvests', () => {
    it('应该能够查询关联的采收记录', async () => {
      const relations = await productionPlanService.getRelatedHarvests('PP001');

      expect(Array.isArray(relations)).toBe(true);
    });
  });

  describe('getProductionPlanRelations', () => {
    it('应该能够获取完整的生产计划关联汇总', async () => {
      const result = await productionPlanService.getProductionPlanRelations(
        'PP001',
        'SC20260401-001'
      );

      expect(result).toBeDefined();
      expect(result.productionPlanId).toBe('PP001');
      expect(result.productionPlanCode).toBe('SC20260401-001');
      expect(result.relations).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.seedSourceCount).toBeDefined();
      expect(result.summary.seedlingCount).toBeDefined();
      expect(result.summary.plantingCount).toBeDefined();
      expect(result.summary.harvestCount).toBeDefined();
      expect(result.summary.totalQuantity).toBeDefined();
    });
  });

  describe('getProductionPlanProgress', () => {
    it('应该能够获取生产计划进度', async () => {
      const progress = await productionPlanService.getProductionPlanProgress('PP001');

      expect(progress).toBeDefined();
      expect(typeof progress.planned).toBe('number');
      expect(typeof progress.inProgress).toBe('number');
      expect(typeof progress.completed).toBe('number');
      expect(typeof progress.cancelled).toBe('number');
    });

    it('进度数据应该非负', async () => {
      const progress = await productionPlanService.getProductionPlanProgress('PP001');

      expect(progress.planned).toBeGreaterThanOrEqual(0);
      expect(progress.inProgress).toBeGreaterThanOrEqual(0);
      expect(progress.completed).toBeGreaterThanOrEqual(0);
      expect(progress.cancelled).toBeGreaterThanOrEqual(0);
    });
  });

  describe('集成测试：完整流程关联', () => {
    it('应该能够追踪从种源到采收的完整链路', async () => {
      // 这个测试验证整体服务协同工作正常
      const seedSources = await productionPlanService.getRelatedSeedSources('PP001');
      const seedlings = await productionPlanService.getRelatedSeedlings('PP001');
      const plantings = await productionPlanService.getRelatedPlantings('PP001');
      const harvests = await productionPlanService.getRelatedHarvests('PP001');

      // 所有查询都应该返回数组
      expect(Array.isArray(seedSources)).toBe(true);
      expect(Array.isArray(seedlings)).toBe(true);
      expect(Array.isArray(plantings)).toBe(true);
      expect(Array.isArray(harvests)).toBe(true);

      // 获取完整汇总
      const summary = await productionPlanService.getProductionPlanRelations(
        'PP001',
        'SC20260401-001'
      );

      expect(summary.relations.length).toBe(
        seedSources.length + seedlings.length + plantings.length + harvests.length
      );
    });
  });
});
