/**
 * v3 数据迁移 — 种源 propagation 字段清理（2026-06-25）
 *
 * 背景：
 *   v2 规划把种源新增弹窗的入库方式从 5 个减为 2 个（外购 + 调拨），
 *   但保留了 propagation_records / propagation_stages 关联表。
 *   v3 用户决策：种源是纯仓库，移除「过程记录 / 阶段推进」功能，
 *   关联表数据全部清空，旧种源 propagation_type 统一改为 'external'。
 *
 * 不可逆警告：
 *   - 旧种源会丢失「育种 / 留种 / 无性繁殖」业务语义标记
 *   - 旧种源的 propagation_records / propagation_stages 全部删除
 *   - 迁移前必须备份 DB
 *
 * 用法：
 *   # 1. 备份
 *   cp server/data/yuanxingtu.db server/data/yuanxingtu.db.bak.v3migration.$(date +%Y%m%d_%H%M%S)
 *
 *   # 2. 干跑（只打印统计，不写库）
 *   cd server && npx tsx scripts/db-migrations/migrateSeedSourcePropagation.ts --dry-run
 *
 *   # 3. 实际执行
 *   npx tsx scripts/db-migrations/migrateSeedSourcePropagation.ts
 *
 *   # 4. 幂等 — 重复执行不会重复修改（已迁移的种源会被跳过）
 */
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, statSync, copyFileSync } from 'fs';

const DB_PATH = join(__dirname, '../../data/yuanxingtu.db');
const BACKUP_DIR = join(__dirname, '../../data');

// 旧 propagation_type 值（v3 之前可能有 5-7 个值，统一到 'external'）
const OLD_PROPAGATION_TYPES: ReadonlyArray<string> = [
  'breeding',
  'seed_saving',
  'asexual',
  'grafting',
  'cutting',
  'tissue_culture',
  'split',
  'bulb',
  'self_produced',
];

// 已迁移完成的 propagation_status
const COMPLETED_STATUS = 'completed';

interface MigrationStats {
  seedSourcesToMigrate: Array<{ id: number; source_code: string; old_propagation_type: string; crop_name: string }>;
  propagationRecordsToDelete: number;
  propagationStagesToDelete: number;
  seedSourcesAlreadyMigrated: number;
  totalSeedSources: number;
}

function detectCliFlag(): { isDryRun: boolean; shouldBackup: boolean } {
  const args = process.argv.slice(2);
  return {
    isDryRun: args.includes('--dry-run') || args.includes('-n'),
    shouldBackup: !args.includes('--no-backup'),
  };
}

function autoBackupDb(): string | null {
  if (!existsSync(DB_PATH)) {
    console.error(`❌ DB 文件不存在：${DB_PATH}`);
    return null;
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '_')
    .slice(0, 15); // YYYYMMDD_HHMMSS
  const backupPath = join(BACKUP_DIR, `yuanxingtu.db.bak.v3migration.${timestamp}`);

  try {
    copyFileSync(DB_PATH, backupPath);
    const sizeKb = (statSync(backupPath).size / 1024).toFixed(1);
    console.log(`✅ DB 备份完成：${backupPath} (${sizeKb} KB)`);
    return backupPath;
  } catch (err) {
    console.error(`❌ DB 备份失败：${(err as Error).message}`);
    return null;
  }
}

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(tableName) as { name: string } | undefined;
  return !!result;
}

function collectStats(db: Database.Database): MigrationStats {
  // 1. 待迁移种源（propagation_type 是旧值）
  const toMigrate = db.prepare(`
    SELECT id, source_code, propagation_type, crop_name
    FROM seed_sources
    WHERE propagation_type IN (${OLD_PROPAGATION_TYPES.map(() => '?').join(',')})
      AND deleted_at IS NULL
    ORDER BY id
  `).all(...OLD_PROPAGATION_TYPES) as Array<{
    id: number;
    source_code: string;
    propagation_type: string;
    crop_name: string;
  }>;

  // 2. 待删除的 propagation_records（表存在才查）
  let propRecCount = 0;
  if (tableExists(db, 'propagation_records')) {
    const r = db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM propagation_records pr
      JOIN seed_sources ss ON ss.id = pr.seed_source_id
      WHERE ss.propagation_type IN (${OLD_PROPAGATION_TYPES.map(() => '?').join(',')})
        AND ss.deleted_at IS NULL
    `).get(...OLD_PROPAGATION_TYPES) as { cnt: number };
    propRecCount = r.cnt;
  }

  // 3. 待删除的 propagation_stages（表存在才查 — 当前 DB 无此表，0 条）
  let propStageCount = 0;
  if (tableExists(db, 'propagation_stages')) {
    const r = db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM propagation_stages ps
      JOIN seed_sources ss ON ss.id = ps.seed_source_id
      WHERE ss.propagation_type IN (${OLD_PROPAGATION_TYPES.map(() => '?').join(',')})
        AND ss.deleted_at IS NULL
    `).get(...OLD_PROPAGATION_TYPES) as { cnt: number };
    propStageCount = r.cnt;
  }

  // 4. 已迁移（propagation_type='external' 且 status='completed'）
  const alreadyMigrated = db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM seed_sources
    WHERE propagation_type = 'external'
      AND propagation_status = ?
      AND deleted_at IS NULL
  `).get(COMPLETED_STATUS) as { cnt: number };

  // 5. 总种源数
  const total = db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM seed_sources
    WHERE deleted_at IS NULL
  `).get() as { cnt: number };

  return {
    seedSourcesToMigrate: toMigrate,
    propagationRecordsToDelete: propRecCount,
    propagationStagesToDelete: propStageCount,
    seedSourcesAlreadyMigrated: alreadyMigrated.cnt,
    totalSeedSources: total.cnt,
  };
}

function printStats(stats: MigrationStats): void {
  console.log('\n========== V3 迁移统计 ==========');
  console.log(`总种源数：${stats.totalSeedSources}`);
  console.log(`已迁移（external+completed）：${stats.seedSourcesAlreadyMigrated}`);
  console.log(`待迁移（旧 propagation_type）：${stats.seedSourcesToMigrate.length}`);
  console.log(`待删除 propagation_records：${stats.propagationRecordsToDelete}`);
  console.log(`待删除 propagation_stages：${stats.propagationStagesToDelete}`);

  if (stats.seedSourcesToMigrate.length > 0) {
    console.log('\n--- 待迁移种源明细（最多展示 20 条）---');
    stats.seedSourcesToMigrate.slice(0, 20).forEach((r) => {
      console.log(`  id=${r.id}  ${r.source_code}  [${r.propagation_type}]  ${r.crop_name}`);
    });
    if (stats.seedSourcesToMigrate.length > 20) {
      console.log(`  …及其他 ${stats.seedSourcesToMigrate.length - 20} 条`);
    }
  }
  console.log('================================\n');
}

function executeMigration(db: Database.Database, stats: MigrationStats): {
  updatedSS: number;
  deletedRecords: number;
  deletedStages: number;
} {
  if (stats.seedSourcesToMigrate.length === 0) {
    console.log('✅ 无需迁移（所有种源已是 external）');
    return { updatedSS: 0, deletedRecords: 0, deletedStages: 0 };
  }

  // 表存在性检查 — 当前 DB 可能无 propagation_stages
  const hasRecords = tableExists(db, 'propagation_records');
  const hasStages = tableExists(db, 'propagation_stages');

  const deleteRecords = hasRecords
    ? db.prepare(`
        DELETE FROM propagation_records
        WHERE seed_source_id IN (
          SELECT id FROM seed_sources
          WHERE propagation_type IN (${OLD_PROPAGATION_TYPES.map(() => '?').join(',')})
            AND deleted_at IS NULL
        )
      `)
    : null;

  const deleteStages = hasStages
    ? db.prepare(`
        DELETE FROM propagation_stages
        WHERE seed_source_id IN (
          SELECT id FROM seed_sources
          WHERE propagation_type IN (${OLD_PROPAGATION_TYPES.map(() => '?').join(',')})
            AND deleted_at IS NULL
        )
      `)
    : null;

  const updateSS = db.prepare(`
    UPDATE seed_sources
    SET propagation_type = 'external',
        propagation_status = ?,
        update_time = datetime('now', 'localtime')
    WHERE propagation_type IN (${OLD_PROPAGATION_TYPES.map(() => '?').join(',')})
      AND deleted_at IS NULL
  `);

  let deletedRecords = 0;
  let deletedStages = 0;
  let updatedSS = 0;

  const tx = db.transaction(() => {
    // 顺序：先删关联表（避免外键约束），再改主表
    if (deleteRecords) {
      const r1 = deleteRecords.run(...OLD_PROPAGATION_TYPES);
      deletedRecords = r1.changes;
    }
    if (deleteStages) {
      const r2 = deleteStages.run(...OLD_PROPAGATION_TYPES);
      deletedStages = r2.changes;
    }
    const r3 = updateSS.run(COMPLETED_STATUS, ...OLD_PROPAGATION_TYPES);
    updatedSS = r3.changes;
  });

  tx();

  return { updatedSS, deletedRecords, deletedStages };
}

function verifyMigration(db: Database.Database): void {
  console.log('\n========== 验证结果 ==========');

  // 1. 确认无遗留旧 propagation_type
  const remaining = db.prepare(`
    SELECT propagation_type, COUNT(*) AS cnt
    FROM seed_sources
    WHERE propagation_type IN (${OLD_PROPAGATION_TYPES.map(() => '?').join(',')})
      AND deleted_at IS NULL
    GROUP BY propagation_type
  `).all(...OLD_PROPAGATION_TYPES) as Array<{ propagation_type: string; cnt: number }>;

  if (remaining.length === 0) {
    console.log('✅ 无遗留旧 propagation_type');
  } else {
    console.log('⚠️ 仍有遗留：', remaining);
  }

  // 2. 确认 propagation_records / propagation_stages 已无悬挂引用
  if (tableExists(db, 'propagation_records')) {
    const orphanRecords = db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM propagation_records pr
      LEFT JOIN seed_sources ss ON ss.id = pr.seed_source_id
      WHERE ss.id IS NULL
    `).get() as { cnt: number };
    console.log(`propagation_records 悬挂引用：${orphanRecords.cnt}`);
  } else {
    console.log('propagation_records 悬挂引用：表不存在（跳过）');
  }

  if (tableExists(db, 'propagation_stages')) {
    const orphanStages = db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM propagation_stages ps
      LEFT JOIN seed_sources ss ON ss.id = ps.seed_source_id
      WHERE ss.id IS NULL
    `).get() as { cnt: number };
    console.log(`propagation_stages 悬挂引用：${orphanStages.cnt}`);
  } else {
    console.log('propagation_stages 悬挂引用：表不存在（跳过）');
  }

  // 3. 种源类型分布
  const distribution = db.prepare(`
    SELECT propagation_type, COUNT(*) AS cnt
    FROM seed_sources
    WHERE deleted_at IS NULL
    GROUP BY propagation_type
  `).all() as Array<{ propagation_type: string; cnt: number }>;

  console.log('\n种源 propagation_type 分布：');
  distribution.forEach((r) => {
    console.log(`  ${r.propagation_type}: ${r.cnt}`);
  });
  console.log('============================\n');
}

function main(): void {
  const { isDryRun, shouldBackup } = detectCliFlag();

  console.log('========== v3 数据迁移：种源 propagation 字段清理 ==========');
  console.log(`DB 路径：${DB_PATH}`);
  console.log(`模式：${isDryRun ? '🔍 干跑（不写库）' : '🚀 实际执行'}`);
  console.log(`备份：${shouldBackup && !isDryRun ? '自动备份' : isDryRun ? '干跑不备份' : '跳过'}`);
  console.log('');

  if (!existsSync(DB_PATH)) {
    console.error(`❌ DB 文件不存在：${DB_PATH}`);
    process.exit(1);
  }

  // 实际执行模式下先备份
  if (!isDryRun && shouldBackup) {
    const backupPath = autoBackupDb();
    if (!backupPath) {
      console.error('❌ 备份失败，终止迁移（不写库）');
      process.exit(1);
    }
  }

  const db = new Database(DB_PATH);

  try {
    // 1. 收集统计
    const stats = collectStats(db);
    printStats(stats);

    if (isDryRun) {
      console.log('💡 干跑完成。如确认无误，移除 --dry-run 重新执行以实际修改 DB。');
      db.close();
      return;
    }

    if (stats.seedSourcesToMigrate.length === 0) {
      console.log('✅ DB 已经是 v3 状态（无旧 propagation_type），无需迁移。');
      db.close();
      return;
    }

    // 2. 实际执行
    console.log('🚀 开始执行迁移...');
    const result = executeMigration(db, stats);

    console.log(`✅ 种源 propagation_type 已更新：${result.updatedSS} 条`);
    console.log(`✅ propagation_records 已删除：${result.deletedRecords} 条`);
    console.log(`✅ propagation_stages 已删除：${result.deletedStages} 条`);

    // 3. 验证
    verifyMigration(db);

    console.log('🎉 迁移完成！');
  } catch (err) {
    console.error('❌ 迁移失败：', (err as Error).message);
    console.error((err as Error).stack);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
