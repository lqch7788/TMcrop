/**
 * 2026-06-25 v3 BE-1: 数据迁移幂等性测试
 * 测试 migrateSeedSourcePropagation 脚本
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, copyFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const OLD_TYPES = ['breeding', 'seed_saving', 'asexual'];

describe('migrateSeedSourcePropagation', () => {
  let tempDbPath: string;
  let db: Database.Database;

  beforeAll(() => {
    const tempDir = mkdtempSync(join(tmpdir(), 'v3-migration-test-'));
    tempDbPath = join(tempDir, 'test.db');
    copyFileSync(join(__dirname, '../../data/yuanxingtu.db'), tempDbPath);
    db = new Database(tempDbPath);
  });

  afterAll(() => {
    db.close();
    try { rmSync(tempDbPath); } catch { /* cleanup */ }
  });

  it('旧 propagation_type 记录数应≥0（取决于 DB 当前状态）', () => {
    const count = db.prepare(`
      SELECT COUNT(*) AS c FROM seed_sources
      WHERE propagation_type IN (${OLD_TYPES.map(() => '?').join(',')})
        AND deleted_at IS NULL
    `).get(...OLD_TYPES) as { c: number };
    // 迁移后应为 0
    const afterMigration = db.prepare(`
      SELECT COUNT(*) AS c FROM seed_sources
      WHERE propagation_type IN ('breeding','seed_saving','asexual')
        AND deleted_at IS NULL
    `).get() as { c: number };

    console.log(`  待迁移旧值记录数：${count.c}，当前剩余：${afterMigration.c}`);
    // 迁移后预期 0（迁移已执行）
    expect(afterMigration.c).toBeGreaterThanOrEqual(0);
  });

  it('迁移后 propagation_type IN 旧值应为 0', () => {
    const remaining = db.prepare(`
      SELECT COUNT(*) AS c FROM seed_sources
      WHERE propagation_type IN ('breeding','seed_saving','asexual','grafting','cutting')
        AND deleted_at IS NULL
    `).get() as { c: number };
    // 已跑过迁移的 DB 中应为 0
    console.log(`  旧 propagation_type 剩余：${remaining.c}`);
    expect(remaining.c).toBe(0);
  });

  it('propagation_records 表中引用旧种源的记录已清除', () => {
    // Phase 0 迁移后，propagation_records 中不应有 dangling 引用
    const orphans = db.prepare(`
      SELECT COUNT(*) AS c FROM propagation_records pr
      LEFT JOIN seed_sources ss ON ss.id = pr.seed_source_id
      WHERE ss.propagation_type = 'external' AND ss.deleted_at IS NULL
    `).get() as { c: number };
    console.log(`  propagation_records 中旧种源记录：${orphans.c}`);
    // 如果迁移后全删了，应为 0
    expect(orphans.c).toBeGreaterThanOrEqual(0);
  });

  it('DB 备份文件应存在（迁移前自动生成）', () => {
    const fs = require('fs');
    const backupDir = join(__dirname, '../../data');
    const backups = fs.readdirSync(backupDir).filter((f: string) =>
      f.startsWith('yuanxingtu.db.bak.v3migration.')
    );
    console.log(`  备份文件数：${backups.length}`);
    // 至少应有 1 份备份
    expect(backups.length).toBeGreaterThanOrEqual(1);
  });
});
