/**
 * 巡查计划频率算法单测（2026-10-21 P2b）
 *
 * 覆盖方案 §13.4 的 V2b-6：4 种频率 + 边界。
 *
 * 重点盯三类历史高发错误：
 *   1. weekly 相位用 Math.round/round 而不是 floor → 整体错位一天
 *   2. end_date 为空时被 Math.min 折叠成 0 → 区间塌缩
 *   3. 'YYYY-MM-DD' 用 new Date() 解析（UTC）→ 本地早上退一天
 * 本文件所有日期都锚定在**本地**语义上，跨时区执行结果必须一致。
 */
import { describe, it, expect } from 'vitest';
import {
  computeOccurrences,
  matchesFrequency,
  validateFrequencyInput,
  normalizeWeekdays,
  daysBetween,
  weekdayCode,
  parseLocalDate,
  formatLocalDate,
} from '../lib/inspectionPlanFrequency';

// 2026-11-01 是周日（weekdayCode = 7）
const BASE = { start_date: '2026-11-01', end_date: null as string | null, interval_value: 1 };

describe('日期工具', () => {
  it('parseLocalDate 拒绝非法日期（构造进位）', () => {
    expect(parseLocalDate('2026-02-30')).toBeNull();
    expect(parseLocalDate('2026-13-01')).toBeNull();
    expect(parseLocalDate('2026-1-1')).toBeNull();
    expect(parseLocalDate('')).toBeNull();
    expect(parseLocalDate(null as unknown as string)).toBeNull();
    expect(parseLocalDate('2026-11-03')).toBeInstanceOf(Date);
  });

  it('formatLocalDate / parseLocalDate 往返一致', () => {
    for (const d of ['2026-01-01', '2026-02-28', '2026-12-31', '2024-02-29']) {
      const parsed = parseLocalDate(d);
      expect(formatLocalDate(parsed!)).toBe(d);
    }
  });

  it('weekdayCode：周日=7、周一=1', () => {
    expect(weekdayCode(parseLocalDate('2026-11-01')!)).toBe(7);
    expect(weekdayCode(parseLocalDate('2026-11-02')!)).toBe(1);
    expect(weekdayCode(parseLocalDate('2026-11-07')!)).toBe(6);
  });

  it('daysBetween 跨月/跨年正确，且为负时方向正确', () => {
    expect(daysBetween(parseLocalDate('2026-11-01')!, parseLocalDate('2026-11-08')!)).toBe(7);
    expect(daysBetween(parseLocalDate('2026-11-30')!, parseLocalDate('2026-12-01')!)).toBe(1);
    expect(daysBetween(parseLocalDate('2027-01-01')!, parseLocalDate('2026-12-31')!)).toBe(-1);
  });

  it('normalizeWeekdays 兼容数组 / JSON 字符串 / 逗号串，并过滤越界值', () => {
    expect(normalizeWeekdays([1, 3, 5])).toEqual([1, 3, 5]);
    expect(normalizeWeekdays('[1,2]')).toEqual([1, 2]);
    expect(normalizeWeekdays('1,7')).toEqual([1, 7]);
    expect(normalizeWeekdays([0, 8, 1])).toEqual([1]);
    expect(normalizeWeekdays(null)).toEqual([]);
    expect(normalizeWeekdays('[]')).toEqual([]);
  });
});

describe('once 频率', () => {
  it('只生成起始日当天，且不依赖区间起点', () => {
    const plan = { ...BASE, frequency: 'once' };
    // 从 11-05 起算（晚于起始日）也要生成 11-01 吗？—— 不生成（区间外），但区间含 11-01 时必生成
    expect(computeOccurrences(plan, '2026-11-01', '2026-11-30')).toEqual(['2026-11-01']);
    expect(computeOccurrences(plan, '2026-11-02', '2026-11-30')).toEqual([]);
  });
});

describe('daily 频率', () => {
  it('interval=1 每天生成', () => {
    const plan = { ...BASE, frequency: 'daily' };
    expect(computeOccurrences(plan, '2026-11-01', '2026-11-05')).toEqual([
      '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05',
    ]);
  });

  it('interval=3 从起始日按 3 天步进', () => {
    const plan = { ...BASE, frequency: 'daily', interval_value: 3 };
    expect(computeOccurrences(plan, '2026-11-01', '2026-11-10')).toEqual([
      '2026-11-01', '2026-11-04', '2026-11-07', '2026-11-10',
    ]);
  });
});

describe('weekly 频率', () => {
  it('起始日 2026-11-01 是周日，选周一/周三 → 首周出 11-02 与 11-04', () => {
    const plan = { ...BASE, frequency: 'weekly', weekdays: [1, 3] };
    const got = computeOccurrences(plan, '2026-11-01', '2026-11-15');
    // 相位锚点 = 起始日所在的周（11-01 周日 → 11-02 周一 即 weeksBetween=0 那一周）
    // 11-02 = 周一(1)、11-04 = 周三(3)、11-09 = 周一、11-11 = 周三
    expect(got).toEqual(['2026-11-02', '2026-11-04', '2026-11-09', '2026-11-11']);
  });

  it('interval=2：隔周执行', () => {
    const plan = { ...BASE, frequency: 'weekly', weekdays: [2], interval_value: 2 };
    // 11-01(周日) → 11-03 周二 weeks=0；再隔 2 周 → weeks=2 → 11-17
    expect(computeOccurrences(plan, '2026-11-01', '2026-11-30')).toEqual([
      '2026-11-03', '2026-11-17',
    ]);
  });

  it('7 个周几全覆盖都能命中', () => {
    const all = [1, 2, 3, 4, 5, 6, 7];
    const plan = { ...BASE, frequency: 'weekly', weekdays: all };
    // 一周 7 天全中
    const got = computeOccurrences(plan, '2026-11-01', '2026-11-07');
    expect(got.length).toBe(7);
  });

  it('weekdays 为空数组 → 不生成（而非静默全生成）', () => {
    const plan = { ...BASE, frequency: 'weekly', weekdays: [] };
    expect(computeOccurrences(plan, '2026-11-01', '2026-11-30')).toEqual([]);
  });

  it('weekdays 为 JSON 字符串时同样生效', () => {
    const plan = { ...BASE, frequency: 'weekly', weekdays: '[2]' };
    expect(computeOccurrences(plan, '2026-11-01', '2026-11-30')).toContain('2026-11-03');
  });
});

describe('monthly 频率', () => {
  it('每月固定几号，首月按起始日对齐', () => {
    const plan = { ...BASE, start_date: '2026-11-01', frequency: 'monthly', day_of_month: 15 };
    const got = computeOccurrences(plan, '2026-11-01', '2027-02-28');
    expect(got).toEqual(['2026-11-15', '2026-12-15', '2027-01-15', '2027-02-15']);
  });

  it('end_date 截断到 2026-12-31', () => {
    const plan = { ...BASE, end_date: '2026-12-31', frequency: 'monthly', day_of_month: 15 };
    expect(computeOccurrences(plan, '2026-11-01', '2027-02-28')).toEqual([
      '2026-11-15', '2026-12-15',
    ]);
  });

  it('day_of_month 越界（29..31）→ 不生成', () => {
    const plan = { ...BASE, frequency: 'monthly', day_of_month: 31 };
    expect(computeOccurrences(plan, '2026-11-01', '2026-12-31')).toEqual([]);
  });

  it('interval=2：隔月', () => {
    const plan = { ...BASE, frequency: 'monthly', day_of_month: 10, interval_value: 2 };
    // 起始日 11-01 → monthDiff: 11月=0(命中), 12月=1(跳过), 1月=2(命中), 2月=3(跳过), 3月=4(命中)
    expect(computeOccurrences(plan, '2026-11-01', '2027-03-31')).toEqual([
      '2026-11-10', '2027-01-10', '2027-03-10',
    ]);
  });
});

describe('区间边界（V2b-1 重点）', () => {
  it('end_date 为空（无限期）→ 正常生成到 to，不会被折叠成一天', () => {
    const plan = { ...BASE, end_date: null, frequency: 'daily' };
    const got = computeOccurrences(plan, '2026-11-01', '2026-11-10');
    expect(got.length).toBe(10);
    expect(got[0]).toBe('2026-11-01');
    expect(got[9]).toBe('2026-11-10');
  });

  it('end_date 为空字符串同样按无限期处理', () => {
    const plan = { ...BASE, end_date: '', frequency: 'daily' };
    expect(computeOccurrences(plan, '2026-11-01', '2026-11-03').length).toBe(3);
  });

  it('end_date 早于 from → 返回空（不抛错）', () => {
    const plan = { ...BASE, end_date: '2026-10-01', frequency: 'daily' };
    expect(computeOccurrences(plan, '2026-11-01', '2026-11-05')).toEqual([]);
  });

  it('from 晚于 to → 返回空', () => {
    const plan = { ...BASE, frequency: 'daily' };
    expect(computeOccurrences(plan, '2026-11-10', '2026-11-01')).toEqual([]);
  });

  it('非法日期字符串 → 返回空，不抛异常', () => {
    const plan = { ...BASE, frequency: 'daily' };
    expect(computeOccurrences(plan, 'bad-date', '2026-11-05')).toEqual([]);
    expect(computeOccurrences(plan, '2026-11-01', 'bad-date')).toEqual([]);
  });

  it('起止日为同一天 → 至多 1 条', () => {
    const plan = { ...BASE, frequency: 'daily' };
    expect(computeOccurrences(plan, '2026-11-01', '2026-11-01')).toEqual(['2026-11-01']);
  });

  it('超过 MAX_SCAN_DAYS 的超长区间被截断而非跑死', () => {
    const plan = { ...BASE, frequency: 'daily' };
    const got = computeOccurrences(plan, '2020-01-01', '2030-01-01');
    expect(got.length).toBeLessThanOrEqual(366);
  });

  it('未知 frequency → 不生成（Fail Loud 由 validate 拦截，这里兜底不炸）', () => {
    const plan = { ...BASE, frequency: 'hourly' as never };
    expect(computeOccurrences(plan, '2026-11-01', '2026-11-05')).toEqual([]);
    expect(matchesFrequency(plan, parseLocalDate('2026-11-01')!)).toBe(false);
  });
});

describe('validateFrequencyInput（保存时拦截非法组合）', () => {
  const ok = { start_date: '2026-11-01', end_date: null, frequency: 'daily', interval_value: 1 };

  it('合法组合无错误', () => {
    expect(validateFrequencyInput(ok)).toEqual([]);
  });

  it('weekly 缺 weekdays 被拒绝', () => {
    const errs = validateFrequencyInput({ ...ok, frequency: 'weekly', weekdays: [] });
    expect(errs.some((e) => e.includes('周几'))).toBe(true);
  });

  it('monthly 的 day_of_month 越界被拒绝', () => {
    const errs = validateFrequencyInput({ ...ok, frequency: 'monthly', day_of_month: 31 });
    expect(errs.some((e) => e.includes('1..28'))).toBe(true);
  });

  it('monthly 缺 day_of_month 被拒绝', () => {
    const errs = validateFrequencyInput({ ...ok, frequency: 'monthly' });
    expect(errs.length).toBeGreaterThan(0);
  });

  it('interval < 1 被拒绝', () => {
    expect(validateFrequencyInput({ ...ok, interval_value: 0 }).length).toBeGreaterThan(0);
    expect(validateFrequencyInput({ ...ok, interval_value: -2 }).length).toBeGreaterThan(0);
  });

  it('未知频率被拒绝', () => {
    expect(validateFrequencyInput({ ...ok, frequency: 'hourly' }).length).toBeGreaterThan(0);
  });

  it('非法 startDate / endDate / endDate<startDate 被拒绝', () => {
    expect(validateFrequencyInput({ ...ok, start_date: '2026-02-30' }).length).toBeGreaterThan(0);
    expect(validateFrequencyInput({ ...ok, end_date: 'bad' }).length).toBeGreaterThan(0);
    expect(
      validateFrequencyInput({ ...ok, start_date: '2026-11-10', end_date: '2026-11-01' }).length
    ).toBeGreaterThan(0);
  });
});