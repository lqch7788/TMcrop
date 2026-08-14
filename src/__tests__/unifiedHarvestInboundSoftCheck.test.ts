/**
 * 育苗入库软校验纯函数单测（2026-08-14）
 * 覆盖：剩余可入库计算、超出判断、边界（0 值/负数保护/字段缺失）
 */

import { describe, it, expect } from 'vitest';
import { checkSeedlingInboundSoftLimit } from '../services/unifiedHarvestInboundService';

describe('checkSeedlingInboundSoftLimit（育苗入库软校验）', () => {
  it('入库量 ≤ 剩余可入库时不超出（不弹确认框）', () => {
    // Arrange：产出 100 − 损耗 13 − 已入库 10 = 剩余 77
    const result = checkSeedlingInboundSoftLimit({
      expandedPlantCount: 100,
      seedlingLossCount: 13,
      harvestStockedCount: 10,
      totalQty: 77,
    });
    // Assert
    expect(result.exceeded).toBe(false);
    expect(result.remaining).toBe(77);
    expect(result.exceededBy).toBe(0);
  });

  it('入库量 > 剩余可入库时超出并给出超出量', () => {
    // Arrange：剩余 77，入库 100
    const result = checkSeedlingInboundSoftLimit({
      expandedPlantCount: 100,
      seedlingLossCount: 13,
      harvestStockedCount: 10,
      totalQty: 100,
    });
    // Assert
    expect(result.exceeded).toBe(true);
    expect(result.remaining).toBe(77);
    expect(result.exceededBy).toBe(23);
  });

  it('未做每日记录（产出 0）时剩余为 0，任何正入库量都超出（软提示而非拦截）', () => {
    const result = checkSeedlingInboundSoftLimit({
      expandedPlantCount: 0,
      seedlingLossCount: 0,
      harvestStockedCount: 0,
      totalQty: 50,
    });
    expect(result.exceeded).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.exceededBy).toBe(50);
  });

  it('totalQty 为 0 时不超出（基础校验会先拦截数量>0，此处兜底）', () => {
    const result = checkSeedlingInboundSoftLimit({
      expandedPlantCount: 0,
      totalQty: 0,
    });
    expect(result.exceeded).toBe(false);
  });

  it('产出 − 损耗 − 已入库为负数时 remaining 收敛到 0（不出现负剩余）', () => {
    const result = checkSeedlingInboundSoftLimit({
      expandedPlantCount: 50,
      seedlingLossCount: 30,
      harvestStockedCount: 40,
      totalQty: 1,
    });
    expect(result.remaining).toBe(0);
    expect(result.exceeded).toBe(true);
    expect(result.exceededBy).toBe(1);
  });

  it('字段缺失（undefined）按 0 处理，不抛异常（种植/种源行调用场景）', () => {
    const result = checkSeedlingInboundSoftLimit({ totalQty: 10 });
    expect(result.remaining).toBe(0);
    expect(result.exceeded).toBe(true);
  });
});
