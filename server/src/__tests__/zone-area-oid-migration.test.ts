/**
 * 2026-07-25 zone-area-oid 迁移测试
 *
 * 验证 migrate20260725ZoneAreaOid 函数：
 *   1. plantings.area_oid / seedlings.area_oid 列被添加（幂等）
 *   2. 通过 areas 区名反查 zones.zone_name 填充 area_oid
 *   3. 反查失败的记录保留为 orphan（area_oid = NULL）
 *   4. 多次运行结果一致（幂等）
 *   5. idx_plantings_area_oid / idx_seedlings_area_oid 索引被创建
 *
 * 策略：使用真实 sql.js 创建隔离内存数据库，直接执行迁移函数
 *       并断言数据状态。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import { migrate20260725ZoneAreaOid } from '../db/migrations/2026-07-25-zone-area-oid';

let db: Database;

beforeEach(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();

  // 模拟 schema.ts 中的 zones 表（最小字段集）
  db.run(`CREATE TABLE zones (
    oid TEXT UNIQUE NOT NULL,
    zone_name TEXT NOT NULL
  )`);

  // 模拟 plantings 和 seedlings 表（最小字段集，area_oid 必须存在以测试 ALTER 的幂等）
  db.run(`CREATE TABLE plantings (
    id INTEGER PRIMARY KEY,
    area_name TEXT,
    area_oid TEXT
  )`);
  db.run(`CREATE TABLE seedlings (
    id INTEGER PRIMARY KEY,
    area_name TEXT,
    area_oid TEXT
  )`);

  // 准备测试数据
  db.run(`INSERT INTO zones VALUES ('zone-1', '葡萄A区'), ('zone-2', '番茄B区')`);
  db.run(`INSERT INTO plantings (area_name) VALUES ('葡萄A区'), ('番茄B区'), ('已删除区')`);
  db.run(`INSERT INTO seedlings (area_name) VALUES ('葡萄A区'), ('番茄B区'), ('已删除区')`);
});

describe('migrate20260725ZoneAreaOid', () => {
  it('反查填充 plantings.area_oid', () => {
    migrate20260725ZoneAreaOid(db);

    const result = db.exec('SELECT area_name, area_oid FROM plantings ORDER BY id');
    expect(result[0]?.values).toEqual([
      ['葡萄A区', 'zone-1'],
      ['番茄B区', 'zone-2'],
      ['已删除区', null],
    ]);
  });

  it('反查填充 seedlings.area_oid', () => {
    migrate20260725ZoneAreaOid(db);

    const result = db.exec('SELECT area_name, area_oid FROM seedlings ORDER BY id');
    expect(result[0]?.values).toEqual([
      ['葡萄A区', 'zone-1'],
      ['番茄B区', 'zone-2'],
      ['已删除区', null],
    ]);
  });

  it('幂等执行（多次运行结果一致）', () => {
    migrate20260725ZoneAreaOid(db);
    migrate20260725ZoneAreaOid(db);
    migrate20260725ZoneAreaOid(db);

    // 同一 area_name 不应被意外覆盖为重复值
    const result = db.exec(`SELECT COUNT(*) FROM plantings WHERE area_oid = 'zone-1'`);
    expect(result[0]?.values[0]?.[0]).toBe(1);

    const resultSeedling = db.exec(`SELECT COUNT(*) FROM seedlings WHERE area_oid = 'zone-1'`);
    expect(resultSeedling[0]?.values[0]?.[0]).toBe(1);
  });

  it('创建索引', () => {
    migrate20260725ZoneAreaOid(db);

    const result = db.exec(`SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%_area_oid'`);
    const indexNames = (result[0]?.values || []).map((r: any[]) => r[0]);
    expect(indexNames).toContain('idx_plantings_area_oid');
    expect(indexNames).toContain('idx_seedlings_area_oid');
  });
});
