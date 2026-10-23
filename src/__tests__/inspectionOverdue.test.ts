/**
 * 巡查实例「逾期未执行」判定测试（2026-10-23）
 *
 * 口径与后端一致（server/src/routes/inspectionPlan.ts:624-625）：
 *   执行日已过 + 无巡查记录 + 状态不是 cancelled / completed
 *
 * 关键点：「有没有执行」看的是 inspections 表有没有记录，不是任务状态 ——
 *   任务提交记录后会自动 pending→accepted→waiting_acceptance，
 *   但状态变了不代表有记录，所以判定只认 inspectionRecordId。
 */
import { describe, it, expect } from 'vitest';
import { isOverdueInspection } from '../utils/inspectionOverdue';

const TODAY = '2026-10-23';

describe('isOverdueInspection 巡查实例逾期判定', () => {
  it('执行日已过 + 无记录 + 未终结 → 逾期', () => {
    expect(
      isOverdueInspection(
        { occurrenceDate: '2026-10-20', inspectionRecordId: null, status: 'pending' },
        TODAY,
      ),
    ).toBe(true);
  });

  it('执行日还没到 → 不逾期', () => {
    expect(
      isOverdueInspection(
        { occurrenceDate: '2026-10-25', inspectionRecordId: null, status: 'pending' },
        TODAY,
      ),
    ).toBe(false);
  });

  it('执行日就是今天 → 不逾期（当天不算过期）', () => {
    expect(
      isOverdueInspection(
        { occurrenceDate: TODAY, inspectionRecordId: null, status: 'pending' },
        TODAY,
      ),
    ).toBe(false);
  });

  it('已提交巡查记录 → 已执行，不算逾期（哪怕任务还在待验收）', () => {
    expect(
      isOverdueInspection(
        { occurrenceDate: '2026-10-20', inspectionRecordId: 'INS-1', status: 'waiting_acceptance' },
        TODAY,
      ),
    ).toBe(false);
  });

  it('已取消 / 已完成 → 不算逾期', () => {
    expect(
      isOverdueInspection(
        { occurrenceDate: '2026-10-20', inspectionRecordId: null, status: 'cancelled' },
        TODAY,
      ),
    ).toBe(false);
    expect(
      isOverdueInspection(
        { occurrenceDate: '2026-10-20', inspectionRecordId: null, status: 'completed' },
        TODAY,
      ),
    ).toBe(false);
  });

  it('缺执行日 → 不判逾期（脏数据不误报）', () => {
    expect(
      isOverdueInspection(
        { occurrenceDate: '', planDate: '', inspectionRecordId: null, status: 'pending' },
        TODAY,
      ),
    ).toBe(false);
  });

  it('缺执行日时用排班日兜底', () => {
    expect(
      isOverdueInspection(
        { occurrenceDate: null, planDate: '2026-10-20', inspectionRecordId: null, status: 'pending' },
        TODAY,
      ),
    ).toBe(true);
  });

  it('已执行但排班日也早于今天 → 仍不逾期（记录优先）', () => {
    expect(
      isOverdueInspection(
        { occurrenceDate: '2026-10-20', planDate: '2026-10-01', inspectionRecordId: 'INS-2', status: 'in_progress' },
        TODAY,
      ),
    ).toBe(false);
  });
});
