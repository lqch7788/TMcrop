/**
 * 直接修改数据库并强制更新
 * 使用 sql.js 的 Database 实例
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/yuanxingtu.db');

async function forceUpdate() {
  console.log('=== 强制更新数据库 ===');
  console.log('DB_PATH:', path.resolve(DB_PATH));

  // 1. 先读取数据库文件
  const fileBuffer = fs.readFileSync(DB_PATH);
  console.log('文件大小:', fileBuffer.length, '字节');

  // 2. 用 sql.js 打开
  const SQL = await initSqlJs();
  const db = new SQL.Database(fileBuffer);

  // 3. 查看当前数据
  const beforeStmt = db.prepare('SELECT source_code, production_plan_code FROM seed_sources WHERE production_plan_code LIKE "DD%" OR production_plan_code LIKE "JZB%" LIMIT 10');
  console.log('\n更新前:');
  while (beforeStmt.step()) {
    const r = beforeStmt.getAsObject();
    console.log('  ', r.source_code, '->', r.production_plan_code);
  }
  beforeStmt.free();

  // 4. 执行更新 - 将所有 DD 开头替换为对应的 JZB
  const mapping: Record<string, string> = {
    'DD20260510368': 'JZB2026-001',
    'DD20260510431': 'JZB2026-003',
    'DD20260510774': '',  // 无匹配
    'DD20260510496': '',  // 无匹配
    'DD20260510175': 'JZB2026-004',
    'DD20260510196': '',  // 无匹配
  };

  let updateCount = 0;
  for (const [ddCode, jzbCode] of Object.entries(mapping)) {
    if (jzbCode) {
      db.run(`UPDATE seed_sources SET production_plan_code = ? WHERE production_plan_code = ?`, [jzbCode, ddCode]);
      updateCount++;
    } else {
      db.run(`UPDATE seed_sources SET production_plan_code = '' WHERE production_plan_code = ?`, [ddCode]);
      updateCount++;
    }
  }
  console.log(`\n执行了 ${updateCount} 条更新`);

  // 5. 查看更新后数据
  const afterStmt = db.prepare('SELECT source_code, production_plan_code FROM seed_sources WHERE production_plan_code LIKE "DD%" OR production_plan_code LIKE "JZB%" OR production_plan_code = "" LIMIT 10');
  console.log('\n更新后:');
  while (afterStmt.step()) {
    const r = afterStmt.getAsObject();
    console.log('  ', r.source_code, '->', r.production_plan_code || '(空)');
  }
  afterStmt.free();

  // 6. 保存回文件
  const outputBuffer = db.export();
  fs.writeFileSync(DB_PATH, outputBuffer);
  console.log('\n已保存到:', path.resolve(DB_PATH));

  db.close();
}

forceUpdate().catch(console.error);
