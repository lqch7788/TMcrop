/**
 * 迁移 dry-run 验证脚本
 * 用法：npx tsx server/scripts/dryRunMigration.ts
 * 目的：与 production 快照比对，验证 2 步迁移不会破坏数据
 *
 * 注意：直接加载 DB 文件（不依赖 initDatabase()），
 * 因为 dry-run 不写库，无需经过 server 的全套 init 流程
 */
import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { runCreateCropCirculationRecordsMigration } from '../src/db/migrations/cropCirculationRecords';
import { runAddOriginPathMigration } from '../src/db/migrations/originPath';

const DB_PATH = path.join(__dirname, '../data/yuanxingtu.db');

async function dryRun() {
  console.log('=== 迁移 dry-run 开始 ===\n');

  // 加载生产快照 DB
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // 备份当前数据快照
  const plantingsBefore = db.exec("SELECT COUNT(*) as c FROM plantings");
  const seedSourcesBefore = db.exec("SELECT COUNT(*) as c FROM seed_sources");
  const pCount: number = plantingsBefore[0]?.values?.[0]?.[0] ?? 0;
  const sCount: number = seedSourcesBefore[0]?.values?.[0]?.[0] ?? 0;
  console.log(`plantings 现有: ${pCount} 条`);
  console.log(`seed_sources 现有: ${sCount} 条\n`);

  // 步骤 1: crop_circulation_records
  console.log('--- 步骤 1: crop_circulation_records ---');
  runCreateCropCirculationRecordsMigration(db);
  const tableCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='crop_circulation_records'");
  const tableExists = tableCheck.length > 0 && tableCheck[0].values.length > 0;
  console.log(`  ✓ 表已创建: ${tableExists}`);

  // 验证字段
  const cols = db.exec("PRAGMA table_info(crop_circulation_records)");
  const colNames = cols[0].values.map((r: any) => r[1]);
  console.log(`  ✓ 字段数: ${colNames.length}`);
  console.log(`  ✓ 字段: ${colNames.join(', ')}\n`);

  // 步骤 2: plantings.origin_path (dry-run 模式)
  console.log('--- 步骤 2: plantings.origin_path ---');
  runAddOriginPathMigration(db, { dryRun: true });

  // 验证数据未变
  const plantingsAfter = db.exec("SELECT COUNT(*) as c FROM plantings");
  const seedSourcesAfter = db.exec("SELECT COUNT(*) as c FROM seed_sources");
  const pCountAfter: number = plantingsAfter[0]?.values?.[0]?.[0] ?? 0;
  const sCountAfter: number = seedSourcesAfter[0]?.values?.[0]?.[0] ?? 0;
  console.log(`\nplantings 现有: ${pCountAfter} 条（dry-run 不变）`);
  console.log(`seed_sources 现有: ${sCountAfter} 条（dry-run 不变）`);

  if (pCountAfter !== pCount) {
    throw new Error(`plantings 数量变化: ${pCount} → ${pCountAfter}`);
  }
  if (sCountAfter !== sCount) {
    throw new Error(`seed_sources 数量变化: ${sCount} → ${sCountAfter}`);
  }
  console.log('  ✓ 数据条数未变\n');

  // 抽样验证 dry-run 不写入新数据
  // 注意: 若 DB 已被前次服务器启动时的迁移填充过, 列中已有非 NULL 值, 这是正常的
  // dry-run 验证的是: 本次执行不应新增/修改任何 origin_path 值
  console.log('--- 抽样验证: source_type=育苗 的 100 条历史记录 ---');
  // 先存快照
  const beforeSamples = db.exec("SELECT id, planting_code, source_type, origin_path FROM plantings WHERE source_type = '育苗' LIMIT 100");
  const beforeRows = beforeSamples[0]?.values ?? [];
  console.log(`  抽样 ${beforeRows.length} 条`);

  // 记录迁移前后 origin_path 值
  const beforeMap = new Map<string, any>();
  for (const row of beforeRows) {
    beforeMap.set(row[0] as string, row[3]);
  }

  // 再跑一次 originPath 迁移 (dry-run=true, 应跳过 UPDATE)
  runAddOriginPathMigration(db, { dryRun: true });

  // 对比前后值
  const afterSamples = db.exec("SELECT id, origin_path FROM plantings WHERE source_type = '育苗' LIMIT 100");
  const afterRows = afterSamples[0]?.values ?? [];
  let changedCount = 0;
  for (const row of afterRows) {
    const beforeVal = beforeMap.get(row[0] as string);
    if (beforeVal !== row[1]) {
      changedCount++;
    }
  }
  if (changedCount > 0) {
    throw new Error(`dry-run 模式下不应写入数据，但发现 ${changedCount} 条 origin_path 发生变化`);
  }
  console.log('  ✓ 所有记录 origin_path 未变化，dry-run 通过\n');

  console.log('=== 迁移 dry-run 成功 ===');
  db.close();
}

dryRun().catch((e) => {
  console.error('dry-run 失败:', e);
  process.exit(1);
});
