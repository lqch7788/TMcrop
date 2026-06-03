/**
 * V3.0 统一库存服务集成测试
 *
 * ⚠️ 重要变更：此服务已从 localStorage 模式重构为「前端 → enhancedApiClient → 后端 → SQLite」直连架构。
 * 所有测试需要后端 API（http://localhost:3001）运行才能通过。
 * 启动后端：cd server && npm run dev
 *
 * 测试覆盖：入库、出库、冻结、追溯等核心功能
 */

import {
  StockType,
  SourceType,
  BusinessType,
  InventoryStatus,
  TransactionType,
  FrozenType,
  FreezeStatus,
} from '../types/inventory';
import * as inventoryService from '../services/inventoryService';

// 检测后端是否可用
async function checkBackendAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3001/api/inventory/stats', {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

const BACKEND_AVAILABLE = await checkBackendAvailable();
const describeIfBackend = BACKEND_AVAILABLE ? describe : describe.skip;

describeIfBackend('V3.0 统一库存服务', () => {

  describe('入库功能 (inbound)', () => {
    it('应该能够创建种源源入库记录', async () => {
      const result = await inventoryService.inbound(
        {
          stockType: StockType.SEED,
          businessId: 'SS001',
          businessType: BusinessType.SEED_SOURCE,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          varietyName: '红果番茄',
          quantity: 1000,
          unit: '粒',
          sourceType: SourceType.EXTERNAL_PURCHASED,
          supplierId: 'SUP001',
          supplierName: '金色稻种有限公司',
          productionPlanId: 'PP001',
          productionPlanCode: 'SC20260401-001',
        },
        'U001',
        '测试用户'
      );

      expect(result.success).toBe(true);
      expect(result.instanceId).toBeDefined();
      expect(result.instanceId).toMatch(/^INS-\d{8}-\d{3}$/);
      expect(result.newQuantity).toBe(1000);
    });

    it('应该能够创建育苗入库记录', async () => {
      const result = await inventoryService.inbound(
        {
          stockType: StockType.SEEDLING,
          businessId: 'SD001',
          businessType: BusinessType.SEEDLING,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          varietyName: '红果番茄',
          quantity: 500,
          unit: '株',
          sourceType: SourceType.SELF_PRODUCED,
          baseId: 'BASE001',
          baseName: '基地A',
          productionPlanId: 'PP001',
          productionPlanCode: 'SC20260401-001',
          sourceInstanceId: 'INS-20260401-001',
          sourceBusinessId: 'SS001',
          sourceBusinessType: BusinessType.SEED_SOURCE,
        },
        'U001',
        '测试用户'
      );

      expect(result.success).toBe(true);
      expect(result.instanceId).toMatch(/^ISE-\d{8}-\d{3}$/);
    });

    it('应该能够创建成品入库记录', async () => {
      const result = await inventoryService.inbound(
        {
          stockType: StockType.PRODUCT,
          businessId: 'HR001',
          businessType: BusinessType.HARVEST,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          varietyName: '红果番茄',
          quantity: 100,
          unit: '公斤',
          sourceType: SourceType.SELF_PRODUCED,
          baseId: 'BASE001',
          baseName: '基地A',
          productionPlanId: 'PP001',
          productionPlanCode: 'SC20260401-001',
          extensions: {
            harvestCode: 'HS20260401-001',
            quality: 'excellent',
            grade: 'A',
          },
        },
        'U001',
        '测试用户'
      );

      expect(result.success).toBe(true);
      expect(result.instanceId).toMatch(/^IPR-\d{8}-\d{3}$/);
    });
  });

  describe('出库功能 (outbound)', () => {
    it('应该能够执行出库操作并扣减库存', async () => {
      // 先入库
      const inboundResult = await inventoryService.inbound(
        {
          stockType: StockType.SEED,
          businessId: 'SS001',
          businessType: BusinessType.SEED_SOURCE,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 1000,
          unit: '粒',
          sourceType: SourceType.EXTERNAL_PURCHASED,
          supplierId: 'SUP001',
          supplierName: '金色稻种有限公司',
        },
        'U001',
        '测试用户'
      );

      // 再出库
      const outboundResult = await inventoryService.outbound({
        instanceId: inboundResult.instanceId!,
        businessId: 'SD001',
        businessType: BusinessType.SEEDLING,
        businessCode: 'YM20260401-001',
        quantity: 300,
        operatorId: 'U001',
        operatorName: '测试用户',
      });

      expect(outboundResult.success).toBe(true);
      expect(outboundResult.newQuantity).toBe(700);
    });

    it('应该拒绝超过可用数量的出库', async () => {
      // 先入库
      const inboundResult = await inventoryService.inbound(
        {
          stockType: StockType.SEED,
          businessId: 'SS001',
          businessType: BusinessType.SEED_SOURCE,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 100,
          unit: '粒',
          sourceType: SourceType.EXTERNAL_PURCHASED,
          supplierId: 'SUP001',
          supplierName: '金色稻种有限公司',
        },
        'U001',
        '测试用户'
      );

      // 尝试出库超过可用数量
      const outboundResult = await inventoryService.outbound({
        instanceId: inboundResult.instanceId!,
        businessId: 'SD001',
        businessType: BusinessType.SEEDLING,
        quantity: 150,
        operatorId: 'U001',
        operatorName: '测试用户',
      });

      expect(outboundResult.success).toBe(false);
      expect(outboundResult.error).toContain('可用数量不足');
    });
  });

  describe('冻结功能 (freezeInventory)', () => {
    it('应该能够冻结库存', async () => {
      // 先入库
      const inboundResult = await inventoryService.inbound(
        {
          stockType: StockType.SEED,
          businessId: 'SS001',
          businessType: BusinessType.SEED_SOURCE,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 1000,
          unit: '粒',
          sourceType: SourceType.EXTERNAL_PURCHASED,
          supplierId: 'SUP001',
          supplierName: '金色稻种有限公司',
        },
        'U001',
        '测试用户'
      );

      // 冻结一部分
      const freezeResult = await inventoryService.freezeInventory({
        instanceId: inboundResult.instanceId!,
        frozenType: FrozenType.TASK,
        frozenQuantity: 200,
        businessId: 'T001',
        businessType: BusinessType.SEEDLING,
        operatorId: 'U001',
        operatorName: '测试用户',
        remarks: '任务占用',
      });

      expect(freezeResult.success).toBe(true);

      // 检查可用数量
      const available = await inventoryService.getAvailableQuantity(inboundResult.instanceId!);
      expect(available?.availableQuantity).toBe(800);
      expect(available?.frozenQuantity).toBe(200);
    });

    it('应该拒绝超过可用数量的冻结', async () => {
      // 先入库
      const inboundResult = await inventoryService.inbound(
        {
          stockType: StockType.SEED,
          businessId: 'SS001',
          businessType: BusinessType.SEED_SOURCE,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 100,
          unit: '粒',
          sourceType: SourceType.EXTERNAL_PURCHASED,
          supplierId: 'SUP001',
          supplierName: '金色稻种有限公司',
        },
        'U001',
        '测试用户'
      );

      // 尝试冻结超过可用数量
      const freezeResult = await inventoryService.freezeInventory({
        instanceId: inboundResult.instanceId!,
        frozenType: FrozenType.TASK,
        frozenQuantity: 150,
        operatorId: 'U001',
        operatorName: '测试用户',
      });

      expect(freezeResult.success).toBe(false);
      expect(freezeResult.error).toContain('冻结数量超过可用数量');
    });
  });

  describe('查询功能', () => {
    it('应该能够根据条件查询库存列表', async () => {
      // 创建多条记录
      await inventoryService.inbound(
        {
          stockType: StockType.SEED,
          businessId: 'SS001',
          businessType: BusinessType.SEED_SOURCE,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 1000,
          unit: '粒',
          sourceType: SourceType.EXTERNAL_PURCHASED,
          supplierId: 'SUP001',
          supplierName: '金色稻种有限公司',
        },
        'U001',
        '测试用户'
      );

      await inventoryService.inbound(
        {
          stockType: StockType.SEEDLING,
          businessId: 'SD001',
          businessType: BusinessType.SEEDLING,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 500,
          unit: '株',
          sourceType: SourceType.SELF_PRODUCED,
          baseId: 'BASE001',
          baseName: '基地A',
        },
        'U001',
        '测试用户'
      );

      // 查询种源库存
      const seedStocks = await inventoryService.getInventoryList({ stockType: StockType.SEED });
      expect(seedStocks.length).toBe(1);
      expect(seedStocks[0].stockType).toBe(StockType.SEED);

      // 查询育苗库存
      const seedlingStocks = await inventoryService.getInventoryList({ stockType: StockType.SEEDLING });
      expect(seedlingStocks.length).toBe(1);
      expect(seedlingStocks[0].stockType).toBe(StockType.SEEDLING);
    });

    it('应该能够查询库存统计', async () => {
      // 创建多条记录
      await inventoryService.inbound(
        {
          stockType: StockType.SEED,
          businessId: 'SS001',
          businessType: BusinessType.SEED_SOURCE,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 1000,
          unit: '粒',
          sourceType: SourceType.EXTERNAL_PURCHASED,
          supplierId: 'SUP001',
          supplierName: '金色稻种有限公司',
        },
        'U001',
        '测试用户'
      );

      const stats = await inventoryService.getInventoryStats();
      expect(stats.totalInstances).toBe(1);
      expect(stats.totalQuantity).toBe(1000);
      expect(stats.byStockType[StockType.SEED].count).toBe(1);
      expect(stats.byStockType[StockType.SEED].quantity).toBe(1000);
    });
  });

  describe('追溯功能', () => {
    it('应该能够执行上游追溯', async () => {
      // 创建上游记录
      const upstreamResult = await inventoryService.inbound(
        {
          stockType: StockType.SEED,
          businessId: 'SS001',
          businessType: BusinessType.SEED_SOURCE,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 1000,
          unit: '粒',
          sourceType: SourceType.EXTERNAL_PURCHASED,
          supplierId: 'SUP001',
          supplierName: '金色稻种有限公司',
        },
        'U001',
        '测试用户'
      );

      // 创建下游记录（引用上游）
      await inventoryService.inbound(
        {
          stockType: StockType.SEEDLING,
          businessId: 'SD001',
          businessType: BusinessType.SEEDLING,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 500,
          unit: '株',
          sourceType: SourceType.SELF_PRODUCED,
          sourceInstanceId: upstreamResult.instanceId,
          sourceBusinessId: 'SS001',
          sourceBusinessType: BusinessType.SEED_SOURCE,
        },
        'U001',
        '测试用户'
      );

      // 追溯下游记录的上游
      const downstreamResult = await inventoryService.getInventoryByBusinessId('SD001');
      const upstreamTrace = await inventoryService.traceUpstream(downstreamResult!.instanceId);

      // traceUpstream 返回：[当前实例, 上游实例, ...]
      // 第一个是下游育苗记录本身，第二个应该是上游种源记录
      expect(upstreamTrace.length).toBeGreaterThanOrEqual(2);
      // 验证第一个是育苗本身
      expect(upstreamTrace[0].stockType).toBe(StockType.SEEDLING);
      expect(upstreamTrace[0].businessId).toBe('SD001');
      // 验证第二个是上游种源
      expect(upstreamTrace[1].stockType).toBe(StockType.SEED);
      expect(upstreamTrace[1].instanceId).toBe(upstreamResult.instanceId);
    });
  });

  describe('循环闭环功能', () => {
    it('应该支持种子采收入库后回流到种源库存', async () => {
      // 1. 创建种源入库
      const seedInbound = await inventoryService.inbound(
        {
          stockType: StockType.SEED,
          businessId: 'SS001',
          businessType: BusinessType.SEED_SOURCE,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 1000,
          unit: '粒',
          sourceType: SourceType.EXTERNAL_PURCHASED,
          supplierId: 'SUP001',
          supplierName: '金色稻种有限公司',
        },
        'U001',
        '测试用户'
      );
      expect(seedInbound.success).toBe(true);

      // 2. 出库到种植
      await inventoryService.outbound({
        instanceId: seedInbound.instanceId!,
        businessId: 'PL001',
        businessType: BusinessType.PLANTING,
        quantity: 800,
        operatorId: 'U001',
        operatorName: '测试用户',
      });

      // 3. 种植采收（种子）
      const harvestInbound = await inventoryService.inbound(
        {
          stockType: StockType.SEED, // 采收的是种子
          businessId: 'HR001',
          businessType: BusinessType.HARVEST,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 500, // 采收得到500粒种子
          unit: '粒',
          sourceType: SourceType.SELF_PRODUCED,
          sourceInstanceId: seedInbound.instanceId,
          extensions: {
            harvestType: 'seed',
          },
        },
        'U001',
        '测试用户'
      );
      expect(harvestInbound.success).toBe(true);

      // 4. 验证新创建的种子库存与原始种源有关联
      const newSeedStock = await inventoryService.getInventoryByBusinessId('HR001');
      expect(newSeedStock?.sourceInstanceId).toBe(seedInbound.instanceId);

      // 5. 追溯验证
      const trace = await inventoryService.traceUpstream(newSeedStock!.instanceId);
      expect(trace.length).toBeGreaterThanOrEqual(2); // 至少有采收记录和原始种源
    });
  });
});

describeIfBackend('V3.0 库存集成服务', () => {
  // 清理工作由后端 API 负责（无需本地清理）

  // 这些测试需要导入 inventoryIntegration，这里只做基本验证
  describe('种源库存集成', () => {
    it('种源入库应正确设置 sourceType', async () => {
      // 外购
      const externalResult = await inventoryService.inbound(
        {
          stockType: StockType.SEED,
          businessId: 'SS001',
          businessType: BusinessType.SEED_SOURCE,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 1000,
          unit: '粒',
          sourceType: SourceType.EXTERNAL_PURCHASED,
          supplierId: 'SUP001',
          supplierName: '金色稻种有限公司',
        },
        'U001',
        '测试用户'
      );

      expect(externalResult.success).toBe(true);

      // 自产
      const selfResult = await inventoryService.inbound(
        {
          stockType: StockType.SEED,
          businessId: 'SS002',
          businessType: BusinessType.SEED_SOURCE,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 500,
          unit: '粒',
          sourceType: SourceType.SELF_PRODUCED,
          baseId: 'BASE001',
          baseName: '基地A',
        },
        'U001',
        '测试用户'
      );

      expect(selfResult.success).toBe(true);
    });
  });

  describe('采收库存集成（循环闭环）', () => {
    it('成品采收入库应进入产品库存', async () => {
      const result = await inventoryService.inbound(
        {
          stockType: StockType.PRODUCT,
          businessId: 'HR001',
          businessType: BusinessType.HARVEST,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 100,
          unit: '公斤',
          sourceType: SourceType.SELF_PRODUCED,
          productionPlanId: 'PP001',
          productionPlanCode: 'SC20260401-001',
        },
        'U001',
        '测试用户'
      );

      expect(result.success).toBe(true);
      expect(result.instanceId).toMatch(/^IPR-/);
    });

    it('种子采收入库应进入种源库存', async () => {
      const result = await inventoryService.inbound(
        {
          stockType: StockType.SEED,
          businessId: 'HR002',
          businessType: BusinessType.HARVEST,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 500,
          unit: '粒',
          sourceType: SourceType.SELF_PRODUCED,
          productionPlanId: 'PP001',
          productionPlanCode: 'SC20260401-001',
        },
        'U001',
        '测试用户'
      );

      expect(result.success).toBe(true);
      expect(result.instanceId).toMatch(/^INS-/);
    });

    it('种苗采收入库应进入育苗库存', async () => {
      const result = await inventoryService.inbound(
        {
          stockType: StockType.SEEDLING,
          businessId: 'HR003',
          businessType: BusinessType.HARVEST,
          cropId: 'PD030100400',
          cropName: '红果番茄',
          quantity: 200,
          unit: '株',
          sourceType: SourceType.SELF_PRODUCED,
          productionPlanId: 'PP001',
          productionPlanCode: 'SC20260401-001',
        },
        'U001',
        '测试用户'
      );

      expect(result.success).toBe(true);
      expect(result.instanceId).toMatch(/^ISE-/);
    });
  });
});
