/**
 * T9 修复测试：路由 Zod schema 补 3 字段
 *
 * 2026-07-08 T9：作物库存入库弹窗重设计 — 入库审计补 production_plan 关联
 *
 * 背景：
 * service 层（inventoryInboundFromSource.service.ts:24, 73-75, 370, 372, 376, 382-385）
 * 已扩展 InboundProduct.cropId / InboundFromSourceInput.productionPlanId+productionPlanCode
 * 并已写入 INSERT INTO inventory_inbound_records。
 *
 * 但路由层 Zod schema（inventoryInboundFromSource.ts:35-49, 51-83）未声明这 3 个字段，
 * Zod 默认会 strip 未声明字段 → service 收到 undefined → 落库为 NULL。
 *
 * 本测试用真实 schema.safeParse 验证（不是源码审计），
 * 修复后这 3 字段能透传到 service。
 */
import { describe, it, expect } from 'vitest';
import { ProductSchema, InboundFromSourceSchema } from '../routes/inventoryInboundFromSource';

/**
 * 构造一个最小的合法 InboundFromSource 请求体（只缺 3 个新字段）
 */
function buildValidBasePayload() {
  return {
    stockType: 'product',
    sourceModule: 'planting',
    sourceRecordId: 'pi_001',
    sourceRecordCode: 'PI20260708001',
    harvestDate: '2026-07-08',
    unit: 'kg',
    warehouseId: 'wh_001',
    products: [
      {
        cropName: '葡萄',
        harvestQuantity: 10,
        unit: 'kg',
      },
    ],
  };
}

describe('T9 修复：路由 Zod schema 补 3 字段', () => {
  it('ProductSchema 接受 cropId（向后兼容：cropId 可选）', () => {
    const result = ProductSchema.safeParse({
      cropName: '葡萄',
      harvestQuantity: 10,
      unit: 'kg',
      cropId: 'cv_001',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cropId).toBe('cv_001');
    }
  });

  it('ProductSchema 不传 cropId 仍合法（向后兼容）', () => {
    const result = ProductSchema.safeParse({
      cropName: '葡萄',
      harvestQuantity: 10,
      unit: 'kg',
    });
    expect(result.success).toBe(true);
  });

  it('InboundFromSourceSchema 接受 productionPlanId + productionPlanCode（顶级 schema）', () => {
    const payload = {
      ...buildValidBasePayload(),
      productionPlanId: 'pp_001',
      productionPlanCode: 'PP20260708001',
    };
    const result = InboundFromSourceSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.productionPlanId).toBe('pp_001');
      expect(result.data.productionPlanCode).toBe('PP20260708001');
    }
  });

  it('InboundFromSourceSchema 不传 productionPlanId/productionPlanCode 仍合法（向后兼容）', () => {
    const payload = buildValidBasePayload();
    const result = InboundFromSourceSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('组合：products[].cropId + 顶级 productionPlanId/productionPlanCode 同时透传', () => {
    const payload = {
      ...buildValidBasePayload(),
      products: [
        {
          cropName: '葡萄',
          harvestQuantity: 10,
          unit: 'kg',
          cropId: 'cv_grape_001',
        },
      ],
      productionPlanId: 'pp_grape_001',
      productionPlanCode: 'PP20260708001',
    };
    const result = InboundFromSourceSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.products[0].cropId).toBe('cv_grape_001');
      expect(result.data.productionPlanId).toBe('pp_grape_001');
      expect(result.data.productionPlanCode).toBe('PP20260708001');
    }
  });

  it('反例：cropId 缺字段时 Zod 仍把它 strip 掉（旧 bug 行为快照）', () => {
    // 修复前：result.data.products[0].cropId 应该是 undefined
    // 修复后：Zod 保留字段，cropId 在 data 里可访问
    // 这个用例同时是回归测试和防退化测试
    const result = InboundFromSourceSchema.safeParse({
      ...buildValidBasePayload(),
      products: [
        {
          cropName: '葡萄',
          harvestQuantity: 10,
          unit: 'kg',
          cropId: 'cv_x',
        },
      ],
      productionPlanId: 'pp_x',
      productionPlanCode: 'PP_X',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // 这 3 个字段必须在 data 里能取到（不被 strip）
      const data = result.data;
      expect(data.products[0]?.cropId).toBe('cv_x');
      expect(data.productionPlanId).toBe('pp_x');
      expect(data.productionPlanCode).toBe('PP_X');
    }
  });
});
