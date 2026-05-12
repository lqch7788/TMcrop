/**
 * 清理种源表中 DD 开头的错误生产计划编码
 * 运行: npx tsx scripts/cleanupSeedSourcePlanCode.ts
 */

import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../data/yuanxingtu.db');

async function cleanup() {
  const SQL = await initSqlJs();

  // 加载数据库
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // 先查看 DD 开头的记录
  console.log('=== 查看 DD 开头的生产计划编码 ===');
  const checkStmt = db.prepare(`
    SELECT id, source_code, production_plan_code
    FROM seed_sources
    WHERE production_plan_code LIKE 'DD%'
  `);

  const records: any[] = [];
  while (checkStmt.step()) {
    records.push(checkStmt.getAsObject());
  }
  checkStmt.free();

  if (records.length === 0) {
    console.log('没有发现 DD 开头的生产计划编码');
  } else {
    console.log(`发现 ${records.length} 条记录:`);
    records.forEach(r => {
      console.log(`  ID: ${r.id}, 种源批号: ${r.source_code}, 错误编码: ${r.production_plan_code}`);
    });

    // 清空这些记录的生产计划编码
    console.log('\n=== 开始清空 DD 开头的生产计划编码 ===');
    db.run(`
      UPDATE seed_sources
      SET production_plan_code = ''
      WHERE production_plan_code LIKE 'DD%'
    `);

    // 验证更新结果
    const verifyStmt = db.prepare(`
      SELECT id, source_code, production_plan_code
      FROM seed_sources
      WHERE production_plan_code LIKE 'DD%'
    `);
    let remaining = 0;
    while (verifyStmt.step()) {
      remaining++;
    }
    verifyStmt.free();

    console.log(`更新完成，剩余 DD 开头编码: ${remaining} 条`);
  }

  // 保存数据库
  const data = db.export();
  const bufferOut = Buffer.from(data);
  fs.writeFileSync(DB_PATH, bufferOut);
  console.log(`\n数据库已保存到: ${DB_PATH}`);

  db.close();
}

cleanup().catch(console.error);
