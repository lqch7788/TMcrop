/**
 * 2026-07-25 zone-area-oid 迁移
 *
 * 业务背景：
 *   - 种植/育苗管理升为 plantings/seedlings 表的权威写源
 *   - area_name 文本字段冗余保留，新增 area_oid 外键字段关联 zones.oid
 *   - 反查失败的记录保留为 orphan（area_oid = NULL），后续可手工补关联
 *
 * 迁移内容：
 *   1. ALTER TABLE plantings ADD COLUMN area_oid TEXT（幂等）
 *   2. ALTER TABLE seedlings ADD COLUMN area_oid TEXT（幂等）
 *   3. UPDATE plantings / seedlings.area_oid = zones.oid（通过 zones.zone_name 反查）
 *   4. CREATE INDEX IF NOT EXISTS idx_plantings_area_oid / idx_seedlings_area_oid
 *
 * 关联 spec: 2026-07-25-zone-planting-info-ownership-design.md
 */

import type { Database } from 'sql.js';
import { seedLog } from '../../lib/seedLogger';

/**
 * 给 plantings / seedlings 表加 area_oid 列，反查 zones.zone_name 填充新列。
 * 失败的反查保留为 orphan（area_oid = NULL），可手工后处理。
 *
 * 幂等设计：
 *   - ADD COLUMN: 捕获 duplicate column 异常后忽略
 *   - UPDATE: 加 WHERE area_oid IS NULL 防止重复覆盖
 *   - CREATE INDEX: 用 IF NOT EXISTS
 */
export function migrate20260725ZoneAreaOid(db: Database): void {
  seedLog.info('[migrate 2026-07-25] 开始 plantings/seedlings.area_oid 迁移');

  try {
    db.run('ALTER TABLE plantings ADD COLUMN area_oid TEXT');
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) throw e;
  }
  try {
    db.run('ALTER TABLE seedlings ADD COLUMN area_oid TEXT');
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) throw e;
  }

  // 反查 zones.oid，按 zone_name 匹配；失败保留为 NULL（orphan）。
  // UPDATE 前后取 area_oid IS NULL 计数，用于日志观测孤儿数（plan Step 3）。
  const beforePlantings = Number(
    db.exec('SELECT COUNT(*) FROM plantings WHERE area_oid IS NULL')[0]?.values[0][0] ?? 0,
  );
  db.run(`
    UPDATE plantings
    SET area_oid = (SELECT oid FROM zones WHERE zone_name = plantings.area_name LIMIT 1)
    WHERE area_oid IS NULL
  `);
  const afterPlantings = Number(
    db.exec('SELECT COUNT(*) FROM plantings WHERE area_oid IS NULL')[0]?.values[0][0] ?? 0,
  );
  seedLog.info(
    `[migrate 2026-07-25] plantings: 回填 ${beforePlantings - afterPlantings} 条, orphan ${afterPlantings} 条`,
  );

  const beforeSeedlings = Number(
    db.exec('SELECT COUNT(*) FROM seedlings WHERE area_oid IS NULL')[0]?.values[0][0] ?? 0,
  );
  db.run(`
    UPDATE seedlings
    SET area_oid = (SELECT oid FROM zones WHERE zone_name = seedlings.area_name LIMIT 1)
    WHERE area_oid IS NULL
  `);
  const afterSeedlings = Number(
    db.exec('SELECT COUNT(*) FROM seedlings WHERE area_oid IS NULL')[0]?.values[0][0] ?? 0,
  );
  seedLog.info(
    `[migrate 2026-07-25] seedlings: 回填 ${beforeSeedlings - afterSeedlings} 条, orphan ${afterSeedlings} 条`,
  );

  db.run('CREATE INDEX IF NOT EXISTS idx_plantings_area_oid ON plantings(area_oid)');
  db.run('CREATE INDEX IF NOT EXISTS idx_seedlings_area_oid ON seedlings(area_oid)');

  seedLog.info('[migrate 2026-07-25] 完成');
}