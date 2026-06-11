/**
 * plantings.origin_path 两步迁移函数
 * 任务 2: Phase 1a 数据 schema 改造
 *
 * 步骤 1: ALTER TABLE 加列 (无 DEFAULT, 避免污染历史)
 * 步骤 2: UPDATE 历史 source_type='育苗' → origin_path='via_seedling'
 *
 * 由 fixMissingSchema.ts 在启动时调用, 配合 try-catch 实现幂等
 */

import type { Database } from 'sql.js'
import { seedLog } from '../../lib/seedLogger'

export interface MigrationOptions {
  dryRun?: boolean
}

/**
 * plantings.origin_path 两步迁移
 * @param db sql.js Database 实例
 * @param options.dryRun true=跳过步骤 2, 仅做 schema 检查
 */
export function runAddOriginPathMigration(db: Database, options: MigrationOptions = {}): void {
  const { dryRun = false } = options

  // 步骤 1: ALTER TABLE 加列 (无 DEFAULT, 历史数据保留 NULL)
  // 由 fixMissingSchema.ts 包裹 try-catch 处理 duplicate column
  db.run(`
    ALTER TABLE plantings ADD COLUMN origin_path TEXT
      CHECK(origin_path IN ('direct_from_seed','via_seedling'))
  `)
  seedLog.info('✓ plantings.origin_path 列已添加')

  if (dryRun) {
    seedLog.skip('• [dry-run] 跳过 UPDATE 历史回填')
    return
  }

  // 步骤 2: UPDATE 历史 source_type='育苗' 的记录
  // 不修改 source_type IS NULL 的记录 (保留 NULL, 等前端写入时强制校验)
  db.run(`
    UPDATE plantings
    SET origin_path = 'via_seedling'
    WHERE source_type = '育苗' AND origin_path IS NULL
  `)
  seedLog.info('• 历史 plantings 回填: source_type=育苗 的记录修正为 via_seedling')
}
