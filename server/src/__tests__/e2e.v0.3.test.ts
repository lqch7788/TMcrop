/**
 * v0.3 数据库端到端回归测试（正式测试文件）
 *
 * 用法：npx vitest run server/src/db/e2e.v0.3.test.ts
 * 或：cd server && npm run test:run
 *
 * 前置：需要真实 DB 文件（server/data/yuanxingtu.db）
 * 覆盖：v0.3 32 字段 / tenant_id / 视图 / SOP / offline_queue / reminder_rules
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// @ts-expect-error - better-sqlite3 无类型定义
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');
let db: any;

beforeAll(() => {
  db = new Database(DB_PATH, { readonly: true });
  db.pragma('journal_mode = WAL');
});

afterAll(() => {
  db?.close();
});

function colNames(table: string): string[] {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c: any) => c.name);
}

describe('v0.3 数据库 schema 回归', () => {
  it('farm_tasks 含 9 个 v0.3 新字段', () => {
    const cols = colNames('farm_tasks');
    for (const f of ['progress_pct', 'current_pause_reason', 'paused_at', 'resumed_at', 'actual_start_at', 'actual_end_at', 'total_pause_seconds', 'outsource_cost', 'tenant_id']) {
      expect(cols).toContain(f);
    }
  });

  it('farm_operation_records 含 v0.3 新字段', () => {
    const cols = colNames('farm_operation_records');
    for (const f of ['quality_score', 'evaluator_id', 'worker_hourly_rate_snapshot', 'labor_cost_snapshot', 'tenant_id']) {
      expect(cols).toContain(f);
    }
  });

  it('pesticide_library 含 6 个安全字段', () => {
    const cols = colNames('pesticide_library');
    for (const f of ['safety_interval_days', 'max_use_per_season', 'retry_interval_days', 'gb2763_code', 'data_source']) {
      expect(cols).toContain(f);
    }
  });

  it('problems 含整改字段', () => {
    const cols = colNames('problems');
    for (const f of ['rectification_progress', 'recheck_result', 'recurrence_count', 'tenant_id']) {
      expect(cols).toContain(f);
    }
  });
});

describe('v0.3 新表/视图', () => {
  it('sop_library 存在且 ≥60 条多作物数据', () => {
    const r = db.prepare(`SELECT COUNT(*) AS n FROM sop_library`).get();
    expect(r.n).toBeGreaterThanOrEqual(60);
    const grape = db.prepare(`SELECT COUNT(*) AS n FROM sop_library WHERE crop_code = 'GRAPE'`).get();
    const leaf = db.prepare(`SELECT COUNT(*) AS n FROM sop_library WHERE crop_code = 'LEAF'`).get();
    const solan = db.prepare(`SELECT COUNT(*) AS n FROM sop_library WHERE crop_code = 'SOLANACEOUS'`).get();
    expect(grape.n).toBe(20);
    expect(leaf.n).toBe(20);
    expect(solan.n).toBe(20);
  });

  it('operation_record_offline_queue 表存在', () => {
    const r = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='operation_record_offline_queue'`).get();
    expect(r).toBeTruthy();
  });

  it('batch_timeline_view + batch_cost_aggregation 视图存在', () => {
    for (const v of ['batch_timeline_view', 'batch_cost_aggregation']) {
      const r = db.prepare(`SELECT name FROM sqlite_master WHERE type='view' AND name=?`).get(v);
      expect(r, `视图 ${v}`).toBeTruthy();
    }
  });

  it('reminder_rules 含内置 RULE_TASK_OVERDUE', () => {
    const r = db.prepare(`SELECT * FROM reminder_rules WHERE rule_code = 'RULE_TASK_OVERDUE'`).get();
    expect(r).toBeTruthy();
    expect(r.is_active).toBe(1);
  });
});

describe('数据完整性', () => {
  it('关键表行数不缩水', () => {
    const counts: Record<string, number> = {};
    for (const t of ['farm_tasks', 'harvest_records', 'plantings', 'sop_library']) {
      counts[t] = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
    }
    expect(counts.farm_tasks).toBeGreaterThanOrEqual(10);
    expect(counts.plantings).toBeGreaterThanOrEqual(10);
    expect(counts.sop_library).toBeGreaterThanOrEqual(60);
  });
});
