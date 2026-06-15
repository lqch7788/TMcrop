/**
 * 2026-06-15: 育苗数量体系重构 - 单元测试 scaffold
 * 测试 1:1 / 1:多 模式的基础数据结构和字段映射
 *
 * 策略：用真实 sql.js 内存数据库，不依赖项目 getDatabase（避免 DB init 依赖）
 */

import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

describe('seedling 数量体系 - 基础数据测试', () => {
  let db: Database;

  beforeEach(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();

    // 建表（含 5 个新业务字段 + 2 系统自动字段）
    db.run(`
      CREATE TABLE seedlings (
        id TEXT PRIMARY KEY,
        seedling_code TEXT NOT NULL,
        seedling_quantity INTEGER DEFAULT 0,
        propagation_mode TEXT DEFAULT 'one_to_one',
        mother_plant_count INTEGER DEFAULT 0,
        mother_loss_count INTEGER DEFAULT 0,
        expanded_plant_count INTEGER DEFAULT 0,
        seedling_loss_count INTEGER DEFAULT 0,
        transplanted_count INTEGER DEFAULT 0,
        auto_planted_count INTEGER DEFAULT 0,
        harvest_stocked_count INTEGER DEFAULT 0
      )
    `);
  });

  describe('1:1 模式（one_to_one）', () => {
    it('1:1 模式：5 业务字段应能正常存储', () => {
      db.run(
        `INSERT INTO seedlings (id, seedling_code, seedling_quantity, propagation_mode,
         mother_plant_count, mother_loss_count, expanded_plant_count, seedling_loss_count, transplanted_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['t-1', 'C-1', 100, 'one_to_one', 80, 20, 80, 5, 0]
      );
      const row = db.exec('SELECT * FROM seedlings WHERE id = ?', ['t-1']);
      expect(row[0]?.values?.length).toBe(1);
    });

    it('1:1 模式：expanded_plant_count 默认 = mother_plant_count（语义一致）', () => {
      db.run(
        `INSERT INTO seedlings (id, seedling_code, seedling_quantity, propagation_mode, mother_plant_count, expanded_plant_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['t-2', 'C-2', 100, 'one_to_one', 80, 80]
      );
      const row = db.exec('SELECT mother_plant_count, expanded_plant_count FROM seedlings WHERE id = ?', ['t-2']);
      const [mother, expanded] = row[0]?.values?.[0] || [];
      expect(mother).toBe(expanded);
    });
  });

  describe('1:多 模式（one_to_many）', () => {
    it('1:多 模式：扩繁产出可以远超初始投入（关键差异）', () => {
      // 5 株母株，扩繁出 500 株小苗（100 倍扩繁）
      db.run(
        `INSERT INTO seedlings (id, seedling_code, seedling_quantity, propagation_mode, mother_plant_count, expanded_plant_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['t-3', 'C-3', 5, 'one_to_many', 5, 500]
      );
      const row = db.exec('SELECT seedling_quantity, expanded_plant_count FROM seedlings WHERE id = ?', ['t-3']);
      const [initial, expanded] = row[0]?.values?.[0] || [];
      expect(initial).toBe(5);
      expect(expanded).toBe(500);
      expect(Number(expanded)).toBeGreaterThan(Number(initial));
    });
  });

  describe('新 5 业务字段 + 2 系统自动字段存在性', () => {
    it('所有 7 字段应可读写', () => {
      db.run(
        `INSERT INTO seedlings (id, seedling_code, seedling_quantity, propagation_mode,
         mother_plant_count, mother_loss_count, expanded_plant_count, seedling_loss_count, transplanted_count,
         auto_planted_count, harvest_stocked_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['t-4', 'C-4', 100, 'one_to_many', 50, 5, 200, 30, 20, 10, 5]
      );
      const row = db.exec(
        `SELECT mother_plant_count, mother_loss_count, expanded_plant_count, seedling_loss_count,
         transplanted_count, auto_planted_count, harvest_stocked_count
         FROM seedlings WHERE id = ?`,
        ['t-4']
      );
      const v = row[0]?.values?.[0] || [];
      expect(Number(v[0])).toBe(50);  // mother_plant_count
      expect(Number(v[1])).toBe(5);   // mother_loss_count
      expect(Number(v[2])).toBe(200); // expanded_plant_count
      expect(Number(v[3])).toBe(30);  // seedling_loss_count
      expect(Number(v[4])).toBe(20);  // transplanted_count
      expect(Number(v[5])).toBe(10);  // auto_planted_count
      expect(Number(v[6])).toBe(5);   // harvest_stocked_count
    });
  });
});
