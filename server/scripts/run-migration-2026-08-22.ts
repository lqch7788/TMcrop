/**
 * 迁移执行脚本：2026-08-22 farm_tasks 加 actual_hours
 * 2026-08-22：AI-06 工时预测需要 actual_hours 字段
 *
 * 用法：cd server && npx tsx scripts/run-migration-2026-08-22.ts
 */

import { initDatabase, getDatabase, saveDatabase } from '../src/db';

const MIGRATIONS = [
  'ALTER TABLE farm_tasks ADD COLUMN actual_hours REAL',
  'ALTER TABLE farm_tasks ADD COLUMN actual_hours_recorded_at TEXT',
  'ALTER TABLE farm_tasks ADD COLUMN actual_hours_recorded_by TEXT',
  'ALTER TABLE farm_tasks ADD COLUMN estimated_vs_actual_ratio REAL',
  'CREATE INDEX IF NOT EXISTS idx_ft_actual_hours ON farm_tasks(actual_hours)',
  'CREATE INDEX IF NOT EXISTS idx_ft_actual_recorded_at ON farm_tasks(actual_hours_recorded_at)',
];

async function main() {
  await initDatabase();
  const db = getDatabase();
  console.log('═'.repeat(60));
  console.log('  Migration 2026-08-22: farm_tasks 加 actual_hours 字段');
  console.log('═'.repeat(60));
  console.log();

  let successCount = 0;
  let skipCount = 0;

  for (const sql of MIGRATIONS) {
    try {
      db.run(sql);
      const action = sql.includes('CREATE INDEX') ? 'INDEX' : sql.includes('ALTER TABLE') ? 'COLUMN' : 'SQL';
      console.log(`✅ [${action}] ${sql.slice(0, 80)}...`);
      successCount++;
    } catch (e: any) {
      // "duplicate column" / "already exists" 视为幂等成功
      if (e.message.includes('duplicate') || e.message.includes('already exists')) {
        console.log(`⏭️ [SKIP] 已存在: ${sql.slice(0, 60)}...`);
        skipCount++;
      } else {
        console.error(`� [FAIL] ${sql.slice(0, 60)}...`);
        console.error(`   Error: ${e.message}`);
      }
    }
  }

  // 验证：查 farm_tasks 列结构
  console.log();
  console.log('[验证] farm_tasks 列结构:');
  const cols = db.exec(`PRAGMA table_info(farm_tasks)`)[0].values;
  cols.forEach((row: any[]) => {
    if (['actual_hours', 'actual_hours_recorded_at', 'actual_hours_recorded_by', 'estimated_vs_actual_ratio'].includes(row[1])) {
      console.log(`  ✅ ${row[1]} (${row[2]})`);
    }
  });

  // 验证：检查已有数据的 actual_hours 默认值
  const nullCount = db.exec(`SELECT COUNT(*) FROM farm_tasks WHERE actual_hours IS NULL`)[0].values[0][0];
  const totalCount = db.exec(`SELECT COUNT(*) FROM farm_tasks`)[0].values[0][0];
  console.log(`[验证] farm_tasks: 总 ${totalCount} 行, actual_hours 为 NULL: ${nullCount} 行`);
  console.log(`       （NULL 行需要员工填实际工时）`);

  saveDatabase();
  console.log();
  console.log(`[完成] 成功 ${successCount} 项, 跳过 ${skipCount} 项, 已写盘`);
  console.log();
  console.log('⏭️ 下一步：前端添加"实际工时"输入框，员工完成任务时填写');
}

main().catch(e => {
  console.error('[migration] 异常:', e);
  process.exit(1);
});
