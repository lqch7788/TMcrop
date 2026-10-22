/**
 * 巡查计划「跨天滚动补齐」单测（2026-10-22 遗留项 6）
 *
 * 背景：scheduler 每日 00:10 调 backfillAllPlans，让每个 active 计划
 * 始终保有「今天 ~ 今天+window_days」的实例。此前没有任何自动化验证 ——
 * 只能等真实时间推移，或用「手动扩大窗口」这条**不等价**的路径盖住。
 *
 * 做法：generateOccurrences / backfillAllPlans 支持注入参考「今天」，
 * 连续跑两次模拟跨天，断言：
 *   · 第 1 天只生成窗口内日期；
 *   · 第 2 天已存在的跳过、只补新进入窗口的那一天；
 *   · 不重复、不丢历史（唯一索引 + 预查双防线仍然成立）。
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

// 服务层通过 '../db' 取 saveDatabase；测试用内存库，写盘必须是 no-op
vi.mock('../db', () => ({
  getDatabase: () => {
    throw new Error('滚动补齐测试必须使用内存 db，不应调用 getDatabase');
  },
  saveDatabase: () => {},
}));

import { backfillAllPlans } from '../services/inspectionPlanService';

let db: Database;

/** 计划表：只建 generateOccurrences / listActivePlans 实际读写的列 */
const CREATE_PLANS = `
  CREATE TABLE inspection_plans (
    id TEXT PRIMARY KEY,
    plan_code TEXT,
    title TEXT,
    inspection_type TEXT,
    greenhouse_id TEXT,
    greenhouse_name TEXT,
    crop_name TEXT,
    equipment_id TEXT,
    equipment_name TEXT,
    infrastructure_id TEXT,
    infrastructure_name TEXT,
    area TEXT,
    checklist TEXT,
    frequency TEXT,
    interval_value INTEGER,
    weekdays TEXT,
    day_of_month INTEGER,
    start_date TEXT,
    end_date TEXT,
    window_days INTEGER,
    default_time TEXT,
    duration_hours REAL,
    assignee_id TEXT,
    assignee_name TEXT,
    team_id TEXT,
    team_name TEXT,
    auto_schedule INTEGER,
    shift_code TEXT,
    pause_ranges TEXT,
    status TEXT,
    created_by TEXT,
    created_by_name TEXT,
    create_time TEXT,
    update_time TEXT,
    tenant_id TEXT,
    version INTEGER
  )
`;

/** 任务表：列集合与 generateOccurrences 的 INSERT 逐字对应 */
const CREATE_TASKS = `
  CREATE TABLE farm_tasks (
    id TEXT PRIMARY KEY,
    task_code TEXT,
    task_title TEXT,
    task_type TEXT,
    type_name TEXT,
    task_content TEXT,
    description TEXT,
    assignee_id TEXT,
    assignee_name TEXT,
    assigner_id TEXT,
    assigner_name TEXT,
    greenhouse_id TEXT,
    greenhouse_name TEXT,
    area_name TEXT,
    crop TEXT,
    plan_date TEXT,
    plan_time TEXT,
    plan_end TEXT,
    due_date TEXT,
    priority TEXT,
    status TEXT,
    progress INTEGER,
    estimated_hours REAL,
    estimated_days INTEGER,
    type_config TEXT,
    source_type TEXT,
    dispatch_mode TEXT,
    source_id TEXT,
    source_code TEXT,
    inspection_plan_id TEXT,
    plan_occurrence_date TEXT,
    version INTEGER,
    create_time TEXT,
    update_time TEXT
  )
`;

/** 与 fixSchemaColumns.ts 中的定义一致（WHERE 排除 cancelled） */
const CREATE_UNIQUE_INDEX = `
  CREATE UNIQUE INDEX uk_farm_tasks_plan_occurrence
  ON farm_tasks(inspection_plan_id, plan_occurrence_date)
  WHERE inspection_plan_id IS NOT NULL AND inspection_plan_id <> ''
    AND plan_occurrence_date IS NOT NULL AND plan_occurrence_date <> ''
    AND status <> 'cancelled'
`;

/** 取全部实例执行日（升序），用于断言生成结果 */
function selectOccurrenceDates(): string[] {
  const stmt = db.prepare(
    'SELECT plan_occurrence_date AS d FROM farm_tasks ORDER BY plan_occurrence_date ASC'
  );
  const out: string[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as { d: string };
    out.push(String(row.d));
  }
  stmt.free();
  return out;
}

describe('巡查计划跨天滚动补齐', () => {
  beforeAll(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();
  });

  beforeEach(() => {
    db.run('DROP TABLE IF EXISTS farm_tasks');
    db.run('DROP TABLE IF EXISTS inspection_plans');
    db.run(CREATE_PLANS);
    db.run(CREATE_TASKS);
    db.run(CREATE_UNIQUE_INDEX);

    // daily 计划：窗口 3 天 → 生成 today .. today+3 共 4 条
    db.run(
      `INSERT INTO inspection_plans (
         id, plan_code, title, inspection_type, greenhouse_name, crop_name,
         checklist, frequency, interval_value, weekdays, day_of_month,
         start_date, end_date, window_days, default_time, duration_hours,
         assignee_id, assignee_name, auto_schedule, pause_ranges, status,
         created_by, created_by_name, create_time, update_time, version
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'PLN_ROLLING', 'XHJH20261022-001', '滚动补齐测试计划', 'farm', 'A区', '番茄',
        '[]', 'daily', 1, '[]', null,
        '2026-10-01', null, 3, '09:00', 1,
        'EMP_001', '张三', 0, '[]', 'active',
        'U1', '管理员', '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z', 1,
      ]
    );
  });

  it('第 2 天补齐只新增进入窗口的日期，已存在日期跳过且不重复', async () => {
    // 第 1 天（2026-10-22）：窗口 22~25
    const first = await backfillAllPlans(db, '2026-10-22');
    expect(first).toEqual({ plans: 1, created: 4, failed: 0 });
    expect(selectOccurrenceDates()).toEqual([
      '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
    ]);

    // 第 2 天（2026-10-23）：窗口 23~26，23~25 已存在 → 只补 26
    const second = await backfillAllPlans(db, '2026-10-23');
    expect(second).toEqual({ plans: 1, created: 1, failed: 0 });
    expect(selectOccurrenceDates()).toEqual([
      '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26',
    ]);

    // 同一天重复跑（cron 重试 / 启动补齐）必须完全幂等
    const third = await backfillAllPlans(db, '2026-10-23');
    expect(third).toEqual({ plans: 1, created: 0, failed: 0 });
    expect(selectOccurrenceDates()).toHaveLength(5);
  });
});
