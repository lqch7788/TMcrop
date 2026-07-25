/**
 * 一次性脚本：给 production DB 应用 2026-07-25 zone-area-oid 迁移
 *
 * 背景：fixMissingSchema 启动时白名单禁用（YELLOW 级含 UPDATE 迁移，c55 事故）。
 *       导致 production DB（yuanxingtu.db）没有 plantings.area_oid / seedlings.area_oid 列，
 *       后端 SQL 用 area_oid JOIN 时报 "no such column" 500 错误。
 *
 * 用法（手动）：
 *   cd server
 *   npx tsx scripts/apply-area-oid-migration.ts
 *
 * 幂等：多次运行结果一致（try/catch duplicate column）
 */
import { initDatabase, getDatabase, closeDatabase } from '../src/db';
import { initializeDatabase } from '../src/db/schema';
import { migrate20260725ZoneAreaOid } from '../src/db/migrations/2026-07-25-zone-area-oid';

async function main() {
  console.log('[apply-area-oid-migration] 启动...');
  await initDatabase();
  initializeDatabase();
  const db = getDatabase();

  // 1. 加列
  try {
    db.run('ALTER TABLE plantings ADD COLUMN area_oid TEXT');
    console.log('✓ plantings.area_oid 添加成功');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      console.log('• plantings.area_oid 已存在，跳过');
    } else {
      throw e;
    }
  }
  try {
    db.run('ALTER TABLE seedlings ADD COLUMN area_oid TEXT');
    console.log('✓ seedlings.area_oid 添加成功');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      console.log('• seedlings.area_oid 已存在，跳过');
    } else {
      throw e;
    }
  }

  // 2. 回填
  db.run(`
    UPDATE plantings
    SET area_oid = (SELECT oid FROM zones WHERE zone_name = plantings.area_name LIMIT 1)
    WHERE area_oid IS NULL
  `);
  db.run(`
    UPDATE seedlings
    SET area_oid = (SELECT oid FROM zones WHERE zone_name = seedlings.area_name LIMIT 1)
    WHERE area_oid IS NULL
  `);

  // 3. 索引
  db.run('CREATE INDEX IF NOT EXISTS idx_plantings_area_oid ON plantings(area_oid)');
  db.run('CREATE INDEX IF NOT EXISTS idx_seedlings_area_oid ON seedlings(area_oid)');

  // 4. 统计
  const pCount = db.exec('SELECT COUNT(*) FROM plantings WHERE area_oid IS NOT NULL')[0]?.values[0][0] || 0;
  const sCount = db.exec('SELECT COUNT(*) FROM seedlings WHERE area_oid IS NOT NULL')[0]?.values[0][0] || 0;
  console.log(`[apply-area-oid-migration] 完成:`);
  console.log(`  plantings: ${pCount} 条已反查`);
  console.log(`  seedlings: ${sCount} 条已反查`);

  closeDatabase();
}

main().catch((e) => {
  console.error('[apply-area-oid-migration] 失败:', e);
  process.exit(1);
});