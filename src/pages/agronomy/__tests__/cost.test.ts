/**
 * v0.3 批次成本计算逻辑测试
 */
import { describe, it, expect } from 'vitest';

// 从页面抽出的成本计算逻辑
function calcCostSummary(costs: Array<{ totalCost?: number }>) {
  const totalCost = costs.reduce((sum, c) => sum + (Number(c.totalCost) || 0), 0);
  const totalBatches = costs.length;
  return {
    totalCost,
    avgCost: totalBatches > 0 ? totalCost / totalBatches : 0,
  };
}

describe('批次成本计算', () => {
  it('空列表应返回 0', () => {
    const r = calcCostSummary([]);
    expect(r.totalCost).toBe(0);
    expect(r.avgCost).toBe(0);
  });

  it('应正确累加成本', () => {
    const r = calcCostSummary([
      { totalCost: 100 },
      { totalCost: 200 },
      { totalCost: 300 },
    ]);
    expect(r.totalCost).toBe(600);
    expect(r.avgCost).toBe(200);
  });

  it('undefined totalCost 应视为 0', () => {
    const r = calcCostSummary([{ totalCost: undefined }, { totalCost: 50 }]);
    expect(r.totalCost).toBe(50);
  });
});
