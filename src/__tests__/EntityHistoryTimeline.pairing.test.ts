/**
 * 实体时间线「全部」视图 同事件合并测试（2026-10-16）
 *
 * 背景（用户报告）：种源 SRC-SS-20261016-001 一次种植留种回流，时间线「全部」视图显示
 * 两条 +22 千克 —— flow 行（material_flow_log「种植 → 种源」）+ circulation 行
 * （crop_circulation_records「繁殖回流」），用户误以为回流了两次 22 千克。
 * 修复：两条合并为一条并保留两边字段；分类视图（流转/回流）保持完整台账不受影响。
 */
import { describe, it, expect } from 'vitest';
import { mergeTimelineEventPairs, type HistoryItem } from '../services/entityHistoryService';

/** 造一条最小可用时间线记录 */
const row = (over: Partial<HistoryItem>): HistoryItem => ({
  id: 'row-1',
  occurredAt: '2026-10-16T12:57:11.457Z',
  source: 'entity',
  category: 'flow',
  action: '流转',
  ...over,
});

/** 用户报告场景的两条原始行（时间取自真实数据：UTC 12:57:11.457 / 20:57:11+08，差 457ms） */
const flowReflow = row({
  id: 'flow-uuid',
  category: 'flow',
  action: '种植 → 种源',
  quantityDelta: 22,
  unit: '千克',
  refCode: 'SRC-SS-20261016-001', // flow 行 refCode = targetCode（当前实体自身编码）
  operatorName: '陆启闯',
  remarks: '红颜',
  cropName: '红颜',
});

const circulationReflow = row({
  id: 'CIRC-89790c2e',
  occurredAt: '2026-10-16T20:57:11+08:00',
  category: 'circulation',
  action: '繁殖回流',
  quantityDelta: 22,
  unit: '',                       // 真实数据单位取自 flow 行兜底（此处留空验证 fallback）
  refCode: 'ZZ20261016-001',      // circulation 行关联单号 = 种植批号
  operatorName: '陆启闯',
  remarks: '测试',
});

describe('时间线「全部」视图 同事件合并', () => {
  it('留种回流：circulation + flow 合并为一条，保留两边字段', () => {
    const result = mergeTimelineEventPairs([circulationReflow, flowReflow]);

    expect(result).toHaveLength(1);
    const m = result[0];
    // 方向文案并入类型徽章，回流动作保留
    expect(m.action).toBe('繁殖回流（种植 → 种源）');
    // 两条备注拼接去重
    expect(m.remarks).toBe('红颜 ｜ 测试');
    // 关联单号取 circulation 的种植批号（flow 的自指编码不重复）
    expect(m.refCode).toBe('ZZ20261016-001');
    // 数量/单位/操作员/作物品种齐全（单位从 flow 行兜底）
    expect(m.quantityDelta).toBe(22);
    expect(m.unit).toBe('千克');
    expect(m.operatorName).toBe('陆启闯');
    expect(m.cropName).toBe('红颜');
  });

  it('flow 行与 transaction 行配对 → 隐藏 flow，保留账务行（既有行为回归）', () => {
    const tx = row({ id: 'TX-1', category: 'transaction', action: '种植使用', quantityDelta: -9, unit: '千克' });
    const flow = row({ id: 'flow-2', category: 'flow', action: '种源 → 种植', quantityDelta: 9, unit: '千克' });

    const result = mergeTimelineEventPairs([flow, tx]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('TX-1');
  });

  it('数量不同 或 时间差超过窗口 → 不合并', () => {
    const qtyMismatch = mergeTimelineEventPairs([circulationReflow, row({ id: 'flow-x', quantityDelta: 100 })]);
    expect(qtyMismatch).toHaveLength(2);

    const timeFar = mergeTimelineEventPairs([
      circulationReflow,
      row({ id: 'flow-y', occurredAt: '2026-10-16T12:57:20Z', quantityDelta: 22 }),
    ]);
    expect(timeFar).toHaveLength(2);
  });

  it('circulation 无 flow 配对 → 原文保留（不追加空括号）', () => {
    const result = mergeTimelineEventPairs([circulationReflow]);

    expect(result).toHaveLength(1);
    expect(result[0].action).toBe('繁殖回流');
    expect(result[0].remarks).toBe('测试');
  });
});
