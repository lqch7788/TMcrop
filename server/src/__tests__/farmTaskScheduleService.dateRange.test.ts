/**
 * farmTaskScheduleService.getSchedules 日期区间过滤测试（2026-10-23）
 *
 * 背景：「已排班任务」表格按时间段检索，后端 getSchedules 新增 startDate/endDate
 * （闭区间 plan_date >= ? AND plan_date <= ?），路由层透传 query 参数。
 *
 * 用 mock DB 捕获实际执行的 SQL 与绑定参数，验证区间条件拼接正确、
 * 与旧的 date 精确匹配并存时两个条件都在（取交集）。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockStmt = {
  step: vi.fn(() => false),
  free: vi.fn(),
  bind: vi.fn(),
};
const mockDb = {
  prepare: vi.fn(() => mockStmt),
  exec: vi.fn(),
};

vi.mock('../db', () => ({
  getDatabase: () => mockDb,
  saveDatabase: () => {},
}));

import { getSchedules } from '../services/farmTaskScheduleService';

/** 取本次执行拼出的 SQL 与绑定参数（mock 无参签名，需经 unknown 转换后取调用实参） */
function capture() {
  const sql = (mockDb.prepare.mock.calls[0] as unknown as [string])[0];
  const params = ((mockStmt.bind.mock.calls[0] as unknown as [string[]] | undefined)?.[0] ?? []);
  return { sql, params };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStmt.step.mockReturnValue(false);
  mockStmt.bind.mockImplementation(() => {});
});

describe('getSchedules 日期区间过滤', () => {
  it('传 startDate/endDate → SQL 带 plan_date >= ? 与 plan_date <= ?，参数为闭区间两端', async () => {
    await getSchedules({ startDate: '2026-10-20', endDate: '2026-10-26' });
    const { sql, params } = capture();
    expect(sql).toContain('fts.plan_date >= ?');
    expect(sql).toContain('fts.plan_date <= ?');
    expect(params).toEqual(['2026-10-20', '2026-10-26']);
  });

  it('只传 startDate → 只有下界', async () => {
    await getSchedules({ startDate: '2026-10-20' });
    const { sql, params } = capture();
    expect(sql).toContain('fts.plan_date >= ?');
    expect(sql).not.toContain('fts.plan_date <= ?');
    expect(params).toEqual(['2026-10-20']);
  });

  it('只传 endDate → 只有上界', async () => {
    await getSchedules({ endDate: '2026-10-26' });
    const { sql, params } = capture();
    expect(sql).toContain('fts.plan_date <= ?');
    expect(sql).not.toContain('fts.plan_date >= ?');
    expect(params).toEqual(['2026-10-26']);
  });

  it('都不传 → 不加任何日期条件（不限日期）', async () => {
    await getSchedules({});
    const { sql, params } = capture();
    expect(sql).not.toContain('fts.plan_date >=');
    expect(sql).not.toContain('fts.plan_date <=');
    expect(sql).not.toContain('fts.plan_date = ?');
    expect(params).toEqual([]);
  });

  it('date 精确匹配与区间并存 → 两个条件都在，参数顺序为 date → start → end（取交集）', async () => {
    await getSchedules({ date: '2026-10-23', startDate: '2026-10-20', endDate: '2026-10-26' });
    const { sql, params } = capture();
    expect(sql).toContain('fts.plan_date = ?');
    expect(sql).toContain('fts.plan_date >= ?');
    expect(sql).toContain('fts.plan_date <= ?');
    expect(params).toEqual(['2026-10-23', '2026-10-20', '2026-10-26']);
  });

  it('workerId / teamId / status 与日期区间并存 → 各自条件都在', async () => {
    await getSchedules({
      startDate: '2026-10-20',
      endDate: '2026-10-26',
      workerId: 'W1',
      teamId: 'T1',
      status: 'scheduled',
    });
    const { sql, params } = capture();
    expect(sql).toContain('fts.worker_id = ?');
    expect(sql).toContain('fts.team_id = ?');
    expect(sql).toContain('fts.status = ?');
    expect(params).toEqual(['2026-10-20', '2026-10-26', 'W1', 'T1', 'scheduled']);
  });
});
