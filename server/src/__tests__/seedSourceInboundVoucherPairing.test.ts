/**
 * 入库凭证 ↔ 回流记录 配对去重测试（2026-10-16）
 *
 * 背景（用户报告）：SRC-SS-20261016-001 一次 22kg 种植留种回流，出入库记录入库区
 * 同时显示入库凭证（INB-20261016-0006）与回流记录（CIRC-89790c2e）两行，
 * 累计数量翻倍成 44kg。修复：凭证按「同数量 + 同日期」1:1 消费回流记录，
 * 被覆盖的回流记录行不再单独显示（撤销语义合并到凭证的冲销）。
 */
import { describe, it, expect } from 'vitest';
import { matchCirculationIdsCoveredByVouchers } from '../repositories/seedSource.repository';

describe('入库凭证 ↔ 回流记录 配对去重', () => {
  it('用户报告场景：1 张凭证 ↔ 1 条回流（22kg）→ 回流行被覆盖', () => {
    const vouchers = [{ id: 'INB-20261016-0006', quantity: 22, recordDate: '2026-10-16' }];
    const circs = [{ id: 'CIRC-89790c2e', quantity: 22, recordDate: '2026-10-16' }];

    const covered = matchCirculationIdsCoveredByVouchers(vouchers, circs);

    expect(Array.from(covered)).toEqual(['CIRC-89790c2e']);
  });

  it('同源 3 张同量同日凭证 ↔ 3 条同量同日回流 → 全部覆盖且凭证不重复消费', () => {
    const vouchers = [
      { id: 'INB-20260721-0002', quantity: 100, recordDate: '2026-07-21' },
      { id: 'INB-20260721-0003', quantity: 100, recordDate: '2026-07-21' },
      { id: 'INB-20260721-0004', quantity: 100, recordDate: '2026-07-21' },
    ];
    const circs = [
      { id: 'CIRC-fc493eae', quantity: 100, recordDate: '2026-07-21' },
      { id: 'CIRC-71335801', quantity: 100, recordDate: '2026-07-21' },
      { id: 'CIRC-ee6e1e2c', quantity: 100, recordDate: '2026-07-21' },
    ];

    const covered = matchCirculationIdsCoveredByVouchers(vouchers, circs);

    expect(covered.size).toBe(3);
    expect(covered.has('CIRC-fc493eae')).toBe(true);
    expect(covered.has('CIRC-71335801')).toBe(true);
    expect(covered.has('CIRC-ee6e1e2c')).toBe(true);
  });

  it('2 张凭证 ↔ 3 条回流 → 只覆盖 2 条（多余的保持显示，撤销入口不丢）', () => {
    const vouchers = [
      { id: 'INB-A', quantity: 100, recordDate: '2026-07-21' },
      { id: 'INB-B', quantity: 100, recordDate: '2026-07-21' },
    ];
    const circs = [
      { id: 'CIRC-1', quantity: 100, recordDate: '2026-07-21' },
      { id: 'CIRC-2', quantity: 100, recordDate: '2026-07-21' },
      { id: 'CIRC-3', quantity: 100, recordDate: '2026-07-21' },
    ];

    const covered = matchCirculationIdsCoveredByVouchers(vouchers, circs);

    expect(covered.size).toBe(2);
  });

  it('数量或日期不一致 → 不配对（fail-open，两行保持显示）', () => {
    const vouchers = [{ id: 'INB-A', quantity: 1001, recordDate: '2026-08-16' }];

    // 数量不同（已撤销的 2 株回流 vs 1001 株凭证）
    expect(matchCirculationIdsCoveredByVouchers(vouchers, [{ id: 'CIRC-X', quantity: 2, recordDate: '2026-08-16' }]).size).toBe(0);
    // 日期不同
    expect(matchCirculationIdsCoveredByVouchers(vouchers, [{ id: 'CIRC-Y', quantity: 1001, recordDate: '2026-08-17' }]).size).toBe(0);
  });

  it('无凭证（历史数据）→ 回流全部保持显示', () => {
    const covered = matchCirculationIdsCoveredByVouchers([], [{ id: 'CIRC-Z', quantity: 5, recordDate: '2026-06-01' }]);
    expect(covered.size).toBe(0);
  });
});
