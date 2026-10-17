/**
 * 育苗每日变更归一化测试（2026-10-17 修复）
 *
 * 背景缺陷：记录明细的"行内编辑"只写旧字段名（survivalCountChange/lossCountChange/…），
 *   而本函数只读新字段名（motherLossChange/…）→ PUT 撤销旧值成功、应用新值变成 0，
 *   该记录的数量贡献被静默清零（实测：母株损耗 2 改成 4，主表变 0）。
 * 本测试锁定"新旧字段名都能归一化"的契约，防止回退。
 */
import { describe, it, expect } from 'vitest';
import { normalizeSeedlingChange } from '../services/seedlingDailyChange';

describe('normalizeSeedlingChange 新旧字段名兼容', () => {
  it('新字段名（新增记录的 payload）→ 原值', () => {
    const r = normalizeSeedlingChange({
      motherLossChange: 2,
      seedlingLossChange: 3,
      expandedChange: 50,
      replantChange: 4,
    });
    expect(r).toEqual({
      motherLossChange: 2,
      seedlingLossChange: 3,
      expandedChange: 50,
      transplantedChange: 0,
      replantChange: 4,
    });
  });

  it('只有旧字段名（行内编辑旧数据）→ 同样能归一化（本次修复的核心）', () => {
    const r = normalizeSeedlingChange({
      survivalCountChange: 4,      // 旧名 = 母株损耗
      lossCountChange: 3,           // 旧名 = 小苗损耗
      runnerIncreaseCount: 50,      // 旧名 = 小苗产出
    });
    expect(r.motherLossChange).toBe(4);
    expect(r.seedlingLossChange).toBe(3);
    expect(r.expandedChange).toBe(50);
  });

  it('新旧字段名同时存在 → 新名优先（与新增记录双写的语义一致）', () => {
    const r = normalizeSeedlingChange({
      motherLossChange: 7, survivalCountChange: 4,
      seedlingLossChange: 9, lossCountChange: 3,
    });
    expect(r.motherLossChange).toBe(7);
    expect(r.seedlingLossChange).toBe(9);
  });

  it('补苗字段归一化（此前完全缺失，主表 replant_count 从不累加）', () => {
    expect(normalizeSeedlingChange({ replantChange: 5 }).replantChange).toBe(5);
    expect(normalizeSeedlingChange({ replantCount: 6 }).replantChange).toBe(6);
    expect(normalizeSeedlingChange({}).replantChange).toBe(0);
  });

  it('缺省 / 非法值 / 负数 → 0（不产生负变更）', () => {
    const r = normalizeSeedlingChange({ motherLossChange: -5, seedlingLossChange: 'abc' });
    expect(r.motherLossChange).toBe(0);
    expect(r.seedlingLossChange).toBe(0);
    expect(normalizeSeedlingChange(null).replantChange).toBe(0);
    expect(normalizeSeedlingChange(undefined).motherLossChange).toBe(0);
    expect(normalizeSeedlingChange('not-an-object').expandedChange).toBe(0);
  });
});
