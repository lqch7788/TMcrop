/**
 * 内部种源去重迁移脚本（2026-07-18）
 *
 * - 事务包裹 + 备份 + dry-run
 * - 按合并键分组保留最早一条
 * - 重关联 inventory_inbound_records + crop_circulation_records
 * - 重算 reflow_count（从 crop_circulation_records JOIN 算）
 *
 * v3 修正：
 * - GROUP_CONCAT 多列 ORDER BY SQLite 不支持，改用子查询
 * - source_module 重关联 IN ('seed_source', 'inventory')
 */

import { getDatabase, saveDatabase } from '../../src/db';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');
const BACKUP_DIR = path.join(__dirname, '../../data/backups');

interface DedupeOptions {
  dryRun?: boolean;
}

interface FullGroup {
  cropCode: string;
  seedForm: string;
  unit: string;
  generation: string;
  ids: string[];
}

export function deduplicate(options: DedupeOptions = {}): void {
  const { dryRun = false } = options;
  const db = getDatabase();
  let skipCount = 0;
  const skipReasons: string[] = [];

  console.log(`[dedupe] ${dryRun ? 'DRY RUN' : '正式执行'} 开始`);
  console.log(`[dedupe] 时间: ${new Date().toISOString()}`);

  if (!dryRun) {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const backupPath = path.join(BACKUP_DIR, `before-dedupe-${Date.now()}.db`);
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`[dedupe] 备份到 ${backupPath}`);
  }

  // Step 1: 按合并键分组找重复组
  const stmt = db.prepare(`
    SELECT crop_code, seed_form, unit, IFNULL(generation, '') AS gen, COUNT(*) AS cnt
    FROM seed_sources
    WHERE source_origin = 'planting_self_kept'
      AND status = 'active'
      AND crop_code IS NOT NULL
      AND seed_form IS NOT NULL
      AND unit IS NOT NULL
    GROUP BY crop_code, seed_form, unit, IFNULL(generation, '')
    HAVING cnt > 1
  `);

  const groups: any[] = [];
  while (stmt.step()) groups.push(stmt.getAsObject());
  stmt.free();

  console.log(`[dedupe] 发现 ${groups.length} 个重复组`);

  // Step 2: 对每组查 ids（子查询避免 GROUP_CONCAT 多列 ORDER BY 限制）
  const fullGroups: FullGroup[] = [];
  for (const g of groups) {
    const idsStmt = db.prepare(`
      SELECT id FROM seed_sources
      WHERE source_origin = 'planting_self_kept'
        AND status = 'active'
        AND crop_code = ?
        AND seed_form = ?
        AND unit = ?
        AND IFNULL(generation, '') = ?
      ORDER BY create_time ASC, id ASC
    `);
    idsStmt.bind([g.crop_code, g.seed_form, g.unit, g.gen]);
    const ids: string[] = [];
    while (idsStmt.step()) {
      const row: any = idsStmt.getAsObject();
      ids.push(row.id);
    }
    idsStmt.free();
    fullGroups.push({
      cropCode: g.crop_code,
      seedForm: g.seed_form,
      unit: g.unit,
      generation: g.gen,
      ids,
    });
  }

  if (dryRun) {
    for (const g of fullGroups) {
      console.log(`[dedupe DRY] 组 keep=${g.ids[0]}, merge ${g.ids.length - 1} 条`);
    }
    console.log(`[dedupe DRY] 总计合并 ${fullGroups.reduce((s, g) => s + g.ids.length - 1, 0)} 条`);
    return;
  }

  // Step 3: 正式执行 — 事务包裹
  db.run('BEGIN IMMEDIATE');
  try {
    for (const group of fullGroups) {
      const [keepId, ...mergeIds] = group.ids;

      // 单位一致性校验
      const unitSet = new Set<string>();
      for (const id of group.ids) {
        const uStmt = db.prepare(`SELECT unit FROM seed_sources WHERE id = ?`);
        uStmt.bind([id]);
        const row: any = uStmt.step() ? uStmt.getAsObject() : null;
        uStmt.free();
        if (row) unitSet.add(row.unit);
      }
      if (unitSet.size > 1) {
        skipCount++;
        const reason = `组 ${keepId} 单位不一致: ${[...unitSet].join(',')}`;
        skipReasons.push(reason);
        continue;
      }

      // 累加 quantity 到保留条
      let totalDelta = 0;
      for (const mergeId of mergeIds) {
        const sStmt = db.prepare(`SELECT quantity FROM seed_sources WHERE id = ?`);
        sStmt.bind([mergeId]);
        const row: any = sStmt.step() ? sStmt.getAsObject() : null;
        sStmt.free();
        totalDelta += row?.quantity || 0;

        // 重关联 inventory_inbound_records（限定 source_module）
        db.run(`
          UPDATE inventory_inbound_records SET business_id = ?
          WHERE business_id = ? AND source_module IN ('seed_source', 'inventory')
        `, [keepId, mergeId]);

        // 重关联 crop_circulation_records
        db.run(`
          UPDATE crop_circulation_records SET new_source_id = ?
          WHERE new_source_id = ? AND circulation_type = 'PROPAGATION'
        `, [keepId, mergeId]);

        // 标记 archived
        const nowLocal = new Date().toISOString();
        db.run(`
          UPDATE seed_sources SET status = 'archived',
            remarks = COALESCE(remarks || '; ', '') || ?, update_time = ?
          WHERE id = ?
        `, [`已合并到 ${keepId}（${nowLocal}）`, nowLocal, mergeId]);
      }

      // 累加到保留条 + 写 merged_from_ids
      const nowLocal = new Date().toISOString();
      db.run(`
        UPDATE seed_sources SET quantity = quantity + ?,
          remaining_quantity = remaining_quantity + ?,
          merged_from_ids = ?, update_time = ?
        WHERE id = ?
      `, [totalDelta, totalDelta, JSON.stringify(mergeIds), nowLocal, keepId]);

      // 重算 reflow_count（从 crop_circulation_records JOIN 算）
      const rStmt = db.prepare(`
        SELECT COUNT(*) AS cnt FROM crop_circulation_records
        WHERE new_source_id = ? AND circulation_type = 'PROPAGATION' AND is_revoked = 0
      `);
      rStmt.bind([keepId]);
      const rRow: any = rStmt.step() ? rStmt.getAsObject() : null;
      rStmt.free();
      db.run(`UPDATE seed_sources SET reflow_count = ?, last_reflow_at = ? WHERE id = ?`,
        [rRow?.cnt || 0, nowLocal, keepId]);
    }

    // Step 4: 初始化未参与合并的种源 reflow_count
    db.run(`
      UPDATE seed_sources
      SET reflow_count = (
        SELECT COUNT(*) FROM crop_circulation_records c
        WHERE c.new_source_id = seed_sources.id
          AND c.circulation_type = 'PROPAGATION'
          AND c.is_revoked = 0
      ),
      last_reflow_at = (
        SELECT MAX(c.circulation_date) FROM crop_circulation_records c
        WHERE c.new_source_id = seed_sources.id
          AND c.circulation_type = 'PROPAGATION'
          AND c.is_revoked = 0
      )
      WHERE source_origin = 'planting_self_kept' AND status = 'active'
    `);

    db.run('COMMIT');
    saveDatabase();
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }

  console.log(`[dedupe] 迁移完成, skip count: ${skipCount}`);
  if (skipReasons.length > 0) {
    console.log(`[dedupe] skip reasons:`);
    skipReasons.forEach(r => console.log(`  - ${r}`));
  }
}

// CLI 入口
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  // 先初始化数据库（initDatabase + initializeDatabase）
  const { initDatabase } = require('../../src/db');
  const { initializeDatabase } = require('../../src/db/schema');
  initDatabase().then(() => {
    initializeDatabase();
    deduplicate({ dryRun });
  }).catch((e) => {
    console.error('初始化失败:', e.message);
    process.exit(1);
  });
}