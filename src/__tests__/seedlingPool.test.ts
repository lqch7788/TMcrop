/**
 * 育苗数量池口径测试（2026-10-17 单池化）
 *
 * 背景：1:1 模式下苗床上的苗既是母株也是小苗，产出池（expanded）恒为 0，
 *   旧口径把"小苗损耗"扣在产出池上 → 任何损耗都被拒（用户报障：
 *   "添加记录失败：小苗损耗 2 超过当前小苗剩余 0（产出 0 - 损耗 0 - 已入库 0）"）。
 * 本测试锁定单池化后的口径，防止回退。
 */
import { describe, it, expect } from 'vitest';
import {
  isOneToOneMode,
  getMotherAliveCount,
  getMotherLossCapacity,
  getSeedlingRemainingCount,
  getMotherLossDisplayCount,
  getMotherAliveFormula,
  getMotherLossFormula,
} from '../lib/seedlingPool';

/** 1:1 真实场景（YM20260821-001：母株 5，产出 0，无损耗无入库） */
const oneToOne = {
  propagationMode: 'one_to_one' as const,
  motherPlantCount: 5,
  replantCount: 0,
  motherLossCount: 0,
  seedlingLossCount: 0,
  expandedPlantCount: 0,
  harvestStockedCount: 0,
};

describe('1:1 单池口径', () => {
  it('可损耗上限取自母株池（5），不再被恒 0 的产出池卡死', () => {
    expect(getMotherLossCapacity(oneToOne)).toBe(5);
  });

  it('记 2 株损耗后：母株存活 3、剩余 3（损耗真的扣在母株池上）', () => {
    const after = { ...oneToOne, motherLossCount: 2 };
    expect(getMotherAliveCount(after)).toBe(3);
    expect(getSeedlingRemainingCount(after)).toBe(3);
  });

  it('补苗（补种子）扩充母株池：母株 5 + 补苗 2 = 7', () => {
    expect(getMotherAliveCount({ ...oneToOne, replantCount: 2 })).toBe(7);
  });

  it('历史 1:1 数据（损耗记在小苗损耗列）同样扣母株池', () => {
    // 真实数据 YM20260616-001：母株 1100 / 补苗 1000 / 小苗损耗 100 / 已入库 333
    const legacy = {
      propagationMode: 'one_to_one' as const,
      motherPlantCount: 1100,
      replantCount: 1000,
      motherLossCount: 0,
      seedlingLossCount: 100,
      expandedPlantCount: 1100,   // 老数据产出=母株（不再参与计算）
      harvestStockedCount: 333,
    };
    expect(getMotherAliveCount(legacy)).toBe(2000);       // 1100 + 1000 − 100
    expect(getMotherLossCapacity(legacy)).toBe(1667);     // − 已入库 333
  });

  it('已入库的苗不能再记损耗（可损耗上限扣除已入库）', () => {
    expect(getMotherLossCapacity({ ...oneToOne, harvestStockedCount: 3 })).toBe(2);
  });

  it('不会出现负数（各项相减后下限 0）', () => {
    expect(getMotherAliveCount({ ...oneToOne, motherLossCount: 99 })).toBe(0);
    expect(getSeedlingRemainingCount({ ...oneToOne, harvestStockedCount: 99 })).toBe(0);
  });
});

describe('1:多 双池口径（保持不变）', () => {
  const oneToMany = {
    propagationMode: 'one_to_many' as const,
    motherPlantCount: 400,
    replantCount: 200,
    motherLossCount: 122,
    seedlingLossCount: 900,
    expandedPlantCount: 5000,
    harvestStockedCount: 811,
  };

  it('母株存活 = 母株 + 补苗 − 母株损耗', () => {
    expect(getMotherAliveCount(oneToMany)).toBe(478);      // 400 + 200 − 122
  });

  it('母株池不受小苗损耗/已入库影响（两池严格分离）', () => {
    expect(getMotherLossCapacity(oneToMany)).toBe(478);
  });

  it('小苗剩余 = 产出 − 小苗损耗 − 已入库', () => {
    expect(getSeedlingRemainingCount(oneToMany)).toBe(3289); // 5000 − 900 − 811
  });
});

describe('表头折口径：损耗累计 + 悬浮算式（2026-10-17）', () => {
  it('1:1：损耗累计 = 母株损耗 + 历史小苗损耗（单池合并显示）', () => {
    expect(getMotherLossDisplayCount({
      propagationMode: 'one_to_one' as const, motherLossCount: 3, seedlingLossCount: 15,
    })).toBe(18);
  });

  it('1:多：损耗累计只取母株损耗（小苗损耗单列）', () => {
    expect(getMotherLossDisplayCount({
      propagationMode: 'one_to_many' as const, motherLossCount: 3, seedlingLossCount: 15,
    })).toBe(3);
  });

  it('存活算式（1:1）：带真实数字，用户可当场对账', () => {
    expect(getMotherAliveFormula({
      propagationMode: 'one_to_one' as const, motherPlantCount: 5, replantCount: 2500,
      motherLossCount: 3, seedlingLossCount: 0,
    })).toBe('1:1（苗即母株）：5 + 2,500 − 3 = 2,502');
  });

  it('存活算式（1:多）', () => {
    expect(getMotherAliveFormula({
      propagationMode: 'one_to_many' as const, motherPlantCount: 400, replantCount: 200,
      motherLossCount: 122, seedlingLossCount: 0,
    })).toBe('1:多：400 + 200 − 122 = 478');
  });

  it('损耗累计说明（1:1 拆分历史小苗损耗；1:多 只有母株损耗）', () => {
    expect(getMotherLossFormula({
      propagationMode: 'one_to_one' as const, motherLossCount: 3, seedlingLossCount: 15,
    })).toBe('1:1（苗即母株）：母株损耗 3 + 历史小苗损耗 15 = 18');
    expect(getMotherLossFormula({
      propagationMode: 'one_to_many' as const, motherLossCount: 122, seedlingLossCount: 0,
    })).toBe('1:多：母株死亡/减少累计 122');
  });
});

describe('isOneToOneMode', () => {
  it('仅 one_to_one 判为单池；缺省/未知按 1:多 处理（与后端默认一致）', () => {
    expect(isOneToOneMode({ propagationMode: 'one_to_one' })).toBe(true);
    expect(isOneToOneMode({ propagationMode: 'one_to_many' })).toBe(false);
    expect(isOneToOneMode({ propagationMode: undefined })).toBe(false);
  });
});
