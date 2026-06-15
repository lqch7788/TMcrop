/**
 * 2026-06-15: seedling 数据迁移测试
 *
 * 验证 fixMissingSchema.ts 中的两个迁移逻辑：
 *   1. propagation_mode 6 种旧值 → 2 种新值合并
 *   2. 1:1 模式 mother_plant_count 回填为 seedling_quantity
 *
 * 策略：使用真实 sql.js 创建隔离内存数据库，直接执行迁移 SQL 片段
 *       并断言数据状态。同步校验 fixMissingSchema.ts 源码包含这些 SQL 片段，
 *       防止代码和测试脱钩。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

describe('seedling 数据迁移（任务 2）', () => {
  let db: Database;

  beforeEach(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();

    // 建表（模拟 schema.ts 中的完整 seedlings 表结构，含 5 个新字段）
    db.run(`
      CREATE TABLE seedlings (
        id TEXT PRIMARY KEY,
        seedling_code TEXT NOT NULL,
        seedling_quantity INTEGER DEFAULT 0,
        planted_count INTEGER DEFAULT 0,
        loss_count INTEGER DEFAULT 0,
        survival_quantity INTEGER DEFAULT 0,
        propagation_mode TEXT DEFAULT 'seed',
        mother_plant_count INTEGER DEFAULT 0,
        mother_loss_count INTEGER DEFAULT 0,
        seedling_loss_count INTEGER DEFAULT 0,
        transplanted_count INTEGER DEFAULT 0,
        auto_planted_count INTEGER DEFAULT 0,
        harvest_stocked_count INTEGER DEFAULT 0
      )
    `);
  });

  /**
   * 工具函数：执行 fixMissingSchema.ts 中"propagation_mode 6→2 合并"逻辑
   * （必须与 fixMissingSchema.ts 中的 SQL 保持一致）
   */
  function runPropagationModeMerge(database: Database): void {
    database.run(
      "UPDATE seedlings SET propagation_mode = 'one_to_one' WHERE propagation_mode IN ('seed', 'grafting')"
    );
    database.run(
      "UPDATE seedlings SET propagation_mode = 'one_to_many' WHERE propagation_mode IN ('layering', 'tissue_culture', 'cutting', 'division')"
    );
  }

  /**
   * 工具函数：执行 fixMissingSchema.ts 中"1:1 模式 mother_plant_count 回填"逻辑
   */
  function runMotherPlantCountBackfill(database: Database): void {
    database.run(
      "UPDATE seedlings SET mother_plant_count = seedling_quantity WHERE propagation_mode = 'one_to_one' AND (mother_plant_count IS NULL OR mother_plant_count = 0)"
    );
  }

  /**
   * 工具函数：执行 fixMissingSchema.ts 中"旧字段值迁移到新字段"逻辑
   */
  function runOldFieldMigration(database: Database): void {
    database.run(
      "UPDATE seedlings SET transplanted_count = planted_count WHERE transplanted_count = 0 AND planted_count > 0"
    );
    database.run(
      "UPDATE seedlings SET seedling_loss_count = loss_count WHERE seedling_loss_count = 0 AND loss_count > 0"
    );
  }

  describe('propagation_mode 6→2 合并', () => {
    it('应将旧 6 种合并为 2 种（one_to_one / one_to_many）', () => {
      // 插入 6 种旧模式数据
      const oldModes = [
        'seed',
        'layering',
        'tissue_culture',
        'cutting',
        'division',
        'grafting',
      ];
      for (const mode of oldModes) {
        db.run(
          'INSERT INTO seedlings (id, seedling_code, seedling_quantity, propagation_mode) VALUES (?, ?, ?, ?)',
          [`test-${mode}`, `CODE-${mode}`, 100, mode]
        );
      }

      runPropagationModeMerge(db);

      // 验证只有 2 种模式
      const result = db.exec('SELECT DISTINCT propagation_mode FROM seedlings ORDER BY propagation_mode');
      const modes = result[0]?.values?.map((v) => v[0] as string) || [];
      expect(modes).toEqual(['one_to_many', 'one_to_one']);
    });

    it('合并后数据条数不变（不应删除行）', () => {
      const oldModes = ['seed', 'layering', 'tissue_culture', 'cutting', 'division', 'grafting'];
      for (const mode of oldModes) {
        db.run(
          'INSERT INTO seedlings (id, seedling_code, seedling_quantity, propagation_mode) VALUES (?, ?, ?, ?)',
          [`test-${mode}`, `CODE-${mode}`, 100, mode]
        );
      }

      runPropagationModeMerge(db);

      const countResult = db.exec('SELECT COUNT(*) FROM seedlings');
      expect(countResult[0].values[0][0]).toBe(6);
    });

    it('已经是新值（one_to_one / one_to_many）的行不应被改', () => {
      db.run(
        'INSERT INTO seedlings (id, seedling_code, seedling_quantity, propagation_mode) VALUES (?, ?, ?, ?)',
        ['test-existing-1', 'CODE-1', 100, 'one_to_one']
      );
      db.run(
        'INSERT INTO seedlings (id, seedling_code, seedling_quantity, propagation_mode) VALUES (?, ?, ?, ?)',
        ['test-existing-2', 'CODE-2', 200, 'one_to_many']
      );

      runPropagationModeMerge(db);

      const result = db.exec('SELECT id, propagation_mode FROM seedlings ORDER BY id');
      const rows = result[0]?.values || [];
      expect(rows).toEqual([
        ['test-existing-1', 'one_to_one'],
        ['test-existing-2', 'one_to_many'],
      ]);
    });

    it('混合新旧数据时，旧数据被合并、新数据保持不变', () => {
      // 旧数据
      db.run(
        'INSERT INTO seedlings (id, seedling_code, seedling_quantity, propagation_mode) VALUES (?, ?, ?, ?)',
        ['old-seed', 'CODE-S', 100, 'seed']
      );
      db.run(
        'INSERT INTO seedlings (id, seedling_code, seedling_quantity, propagation_mode) VALUES (?, ?, ?, ?)',
        ['old-cutting', 'CODE-C', 200, 'cutting']
      );
      // 新数据
      db.run(
        'INSERT INTO seedlings (id, seedling_code, seedling_quantity, propagation_mode) VALUES (?, ?, ?, ?)',
        ['new-1-1', 'CODE-N1', 50, 'one_to_one']
      );
      db.run(
        'INSERT INTO seedlings (id, seedling_code, seedling_quantity, propagation_mode) VALUES (?, ?, ?, ?)',
        ['new-1-N', 'CODE-N2', 80, 'one_to_many']
      );

      runPropagationModeMerge(db);

      const result = db.exec(
        'SELECT id, propagation_mode FROM seedlings ORDER BY propagation_mode, id'
      );
      const rows = result[0]?.values || [];
      // 旧: seed → one_to_one, cutting → one_to_many
      // 新: 1-1 / 1-N 保持
      // 排序: propagation_mode ASC, id ASC (字典序: new-1-N < old-cutting, new-1-1 < old-seed)
      expect(rows).toEqual([
        ['new-1-N', 'one_to_many'],
        ['old-cutting', 'one_to_many'],
        ['new-1-1', 'one_to_one'],
        ['old-seed', 'one_to_one'],
      ]);
    });
  });

  describe('1:1 模式 mother_plant_count 回填', () => {
    it('1:1 模式 mother_plant_count 应回填为 seedling_quantity', () => {
      db.run(
        'INSERT INTO seedlings (id, seedling_code, seedling_quantity, mother_plant_count, propagation_mode) VALUES (?, ?, ?, ?, ?)',
        ['test-1', 'CODE-1', 100, 0, 'one_to_one']
      );

      runMotherPlantCountBackfill(db);

      const row = db.exec(
        'SELECT mother_plant_count FROM seedlings WHERE id = ?',
        ['test-1']
      );
      expect(row[0]?.values?.[0]?.[0]).toBe(100);
    });

    it('1:N 模式不应触发回填（条件 propagation_mode = one_to_one）', () => {
      db.run(
        'INSERT INTO seedlings (id, seedling_code, seedling_quantity, mother_plant_count, propagation_mode) VALUES (?, ?, ?, ?, ?)',
        ['test-N', 'CODE-N', 200, 0, 'one_to_many']
      );

      runMotherPlantCountBackfill(db);

      const row = db.exec(
        'SELECT mother_plant_count FROM seedlings WHERE id = ?',
        ['test-N']
      );
      expect(row[0]?.values?.[0]?.[0]).toBe(0); // 保持 0
    });

    it('已存在 mother_plant_count 的行不应被覆盖', () => {
      db.run(
        'INSERT INTO seedlings (id, seedling_code, seedling_quantity, mother_plant_count, propagation_mode) VALUES (?, ?, ?, ?, ?)',
        ['test-existing', 'CODE-E', 100, 42, 'one_to_one']
      );

      runMotherPlantCountBackfill(db);

      const row = db.exec(
        'SELECT mother_plant_count FROM seedlings WHERE id = ?',
        ['test-existing']
      );
      expect(row[0]?.values?.[0]?.[0]).toBe(42); // 不被覆盖
    });
  });

  describe('旧字段值迁移到新字段', () => {
    it('planted_count > 0 时应迁移到 transplanted_count', () => {
      db.run(
        'INSERT INTO seedlings (id, seedling_code, seedling_quantity, planted_count, transplanted_count) VALUES (?, ?, ?, ?, ?)',
        ['test-planted', 'CODE-P', 100, 50, 0]
      );

      runOldFieldMigration(db);

      const row = db.exec(
        'SELECT transplanted_count FROM seedlings WHERE id = ?',
        ['test-planted']
      );
      expect(row[0]?.values?.[0]?.[0]).toBe(50);
    });

    it('loss_count > 0 时应迁移到 seedling_loss_count', () => {
      db.run(
        'INSERT INTO seedlings (id, seedling_code, seedling_quantity, loss_count, seedling_loss_count) VALUES (?, ?, ?, ?, ?)',
        ['test-loss', 'CODE-L', 100, 10, 0]
      );

      runOldFieldMigration(db);

      const row = db.exec(
        'SELECT seedling_loss_count FROM seedlings WHERE id = ?',
        ['test-loss']
      );
      expect(row[0]?.values?.[0]?.[0]).toBe(10);
    });

    it('planted_count = 0 时不应迁移到 transplanted_count', () => {
      db.run(
        'INSERT INTO seedlings (id, seedling_code, seedling_quantity, planted_count, transplanted_count) VALUES (?, ?, ?, ?, ?)',
        ['test-zero', 'CODE-Z', 100, 0, 0]
      );

      runOldFieldMigration(db);

      const row = db.exec(
        'SELECT transplanted_count FROM seedlings WHERE id = ?',
        ['test-zero']
      );
      expect(row[0]?.values?.[0]?.[0]).toBe(0);
    });
  });

  describe('源码一致性：fixMissingSchema.ts 必须包含迁移 SQL', () => {
    const fixSchemaPath = path.join(__dirname, '../db/fixMissingSchema.ts');
    const source = fs.readFileSync(fixSchemaPath, 'utf-8');

    it('应包含 propagation_mode 6→2 合并 SQL', () => {
      expect(source).toContain("propagation_mode = 'one_to_one' WHERE propagation_mode IN ('seed', 'grafting')");
      expect(source).toContain("propagation_mode = 'one_to_many' WHERE propagation_mode IN ('layering', 'tissue_culture', 'cutting', 'division')");
    });

    it('应包含 1:1 模式 mother_plant_count 回填 SQL', () => {
      expect(source).toContain(
        "mother_plant_count = seedling_quantity WHERE propagation_mode = 'one_to_one' AND (mother_plant_count IS NULL OR mother_plant_count = 0)"
      );
    });

    it('应包含旧字段迁移到新字段 SQL', () => {
      expect(source).toContain('transplanted_count = planted_count');
      expect(source).toContain('seedling_loss_count = loss_count');
    });

    it('应包含 5 个新字段 DDL（mother_loss_count / seedling_loss_count / transplanted_count / auto_planted_count / harvest_stocked_count）', () => {
      expect(source).toContain('ALTER TABLE seedlings ADD COLUMN mother_loss_count');
      expect(source).toContain('ALTER TABLE seedlings ADD COLUMN seedling_loss_count');
      expect(source).toContain('ALTER TABLE seedlings ADD COLUMN transplanted_count');
      expect(source).toContain('ALTER TABLE seedlings ADD COLUMN auto_planted_count');
      expect(source).toContain('ALTER TABLE seedlings ADD COLUMN harvest_stocked_count');
    });
  });
});
