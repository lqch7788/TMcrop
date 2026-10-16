/**
 * 种源库存状态 / 预警判定测试（2026-10-17）
 *
 * 背景：种源列表新增「库存预警」徽章（对标作物库存），口径复用 stockStatus 单一真理源：
 *   可用 = 0 → 耗尽；可用 < 入库 × 20% → 不足；其余充足。
 * 本测试锁定阈值边界语义（20% 为严格小于）与预警判定，防止未来改阈值时破坏口径。
 */
import { describe, it, expect } from 'vitest';
import {
  computeStockStatus,
  isAlertStatus,
  getCompletionRate,
  LOW_THRESHOLD_RATIO,
} from '../lib/stockStatus';
import { StockStatus } from '../types/crop';

describe('computeStockStatus 阈值边界', () => {
  it('可用为 0 → 耗尽（真实数据 ZY20260716-001：可用 0 / 入库 100）', () => {
    expect(computeStockStatus(0, 100)).toBe(StockStatus.DEPLETED);
  });

  it('可用 19 / 入库 100（低于 20%）→ 不足', () => {
    expect(computeStockStatus(19, 100)).toBe(StockStatus.LOW);
  });

  it('可用 20 / 入库 100（恰等于 20%）→ 充足（阈值语义：严格小于才告警）', () => {
    expect(computeStockStatus(20, 100)).toBe(StockStatus.SUFFICIENT);
  });

  it('全额库存（真实数据 SRC-SS-20261016-001：22/22）→ 充足', () => {
    expect(computeStockStatus(22, 22)).toBe(StockStatus.SUFFICIENT);
  });

  it('入库量 <= 0 → 走兜底（默认充足，不误报）', () => {
    expect(computeStockStatus(0, 0)).toBe(StockStatus.SUFFICIENT);
    expect(computeStockStatus(5, -1)).toBe(StockStatus.SUFFICIENT);
  });

  it('阈值常量锁定为 0.2（预警文案与判定共同派生自此值）', () => {
    expect(LOW_THRESHOLD_RATIO).toBe(0.2);
  });
});

describe('isAlertStatus 预警判定', () => {
  it('耗尽、不足 → 告警；充足 → 不告警', () => {
    expect(isAlertStatus(StockStatus.DEPLETED)).toBe(true);
    expect(isAlertStatus(StockStatus.LOW)).toBe(true);
    expect(isAlertStatus(StockStatus.SUFFICIENT)).toBe(false);
  });
});

describe('getCompletionRate 剩余率', () => {
  it('22/22 → 100；0/100 → 0；入库量为 0 → 0（不除零）', () => {
    expect(getCompletionRate(22, 22)).toBe(100);
    expect(getCompletionRate(0, 100)).toBe(0);
    expect(getCompletionRate(5, 0)).toBe(0);
  });
});
