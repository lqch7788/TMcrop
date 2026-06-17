/**
 * crop_circulation_records 迁移函数
 * 任务 1: Phase 1a 数据 schema 改造
 *
 * 创建回流闭环数据表 (16 字段 + 3 索引)
 * - 3 种 circulationType: PROPAGATION/QUANTITY/DISPOSAL
 * - 3 种 sourceModule: planting/harvest/seedling
 * - 软删除支持 (is_revoked/revoked_at/revoked_by)
 * - 残株合并 2 列 (residue_type, disposition)
 *
 * P1 修复 (2026-06-17): parent_source_id 和 source_id 改为 nullable
 *   - DISPOSAL 类型销毁没有"父种源"概念，dispose 分支写 NULL 是业务正确语义
 *   - PROPAGATION/QUANTITY 在业务代码里仍强制填非空值（CirculationInputSchema 校验）
 *   - FK 约束保留 (允许 NULL 时 FK 不触发)
 *
 * 由 fixMissingSchema.ts 在启动时调用, 配合 try-catch 实现幂等
 */

import type { Database } from 'sql.js'
import { seedLog } from '../../lib/seedLogger'

/**
 * 创建 crop_circulation_records 表 + 3 索引
 * 幂等: 重复执行不报错
 */
export function runCreateCropCirculationRecordsMigration(db: Database): void {
  // 1. CREATE TABLE IF NOT EXISTS 幂等
  db.run(`
    CREATE TABLE IF NOT EXISTS crop_circulation_records (
      id TEXT PRIMARY KEY,
      circulation_type TEXT NOT NULL
        CHECK(circulation_type IN ('PROPAGATION','QUANTITY','DISPOSAL')),
      source_module TEXT NOT NULL
        CHECK(source_module IN ('planting','harvest','seedling')),
      source_id TEXT,
      parent_source_id TEXT,
      new_source_id TEXT,
      quantity REAL,
      unit TEXT,
      circulation_date TEXT NOT NULL,
      operator_id TEXT,
      notes TEXT,
      residue_type TEXT
        CHECK(residue_type IS NULL OR residue_type IN ('STEM','ROOT','BRANCH','OTHER')),
      disposition TEXT
        CHECK(disposition IS NULL OR disposition IN ('CIRCULATE','DISPOSAL','SALES')),
      is_revoked INTEGER DEFAULT 0,
      revoked_at TEXT,
      revoked_by TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (parent_source_id) REFERENCES seed_sources(id),
      FOREIGN KEY (new_source_id) REFERENCES seed_sources(id)
    )
  `)
  seedLog.info('✓ crop_circulation_records 表已就绪')

  // 2. 3 个索引 (CREATE INDEX IF NOT EXISTS 幂等)
  const indexStatements = [
    'CREATE INDEX IF NOT EXISTS idx_circ_parent ON crop_circulation_records(parent_source_id)',
    'CREATE INDEX IF NOT EXISTS idx_circ_source ON crop_circulation_records(source_module, source_id)',
    'CREATE INDEX IF NOT EXISTS idx_circ_revoked ON crop_circulation_records(is_revoked) WHERE is_revoked = 0',
  ]
  for (const sql of indexStatements) {
    db.run(sql)
  }
  seedLog.info('✓ crop_circulation_records 3 索引已创建')
}
