/**
 * 验证服务器数据库内容
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/yuanxingtu.db');
console.log('DB_PATH:', DB_PATH);
console.log('exists:', fs.existsSync(DB_PATH));

async function main() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // 检查 JZB 开头的记录
  const stmt = db.prepare('SELECT source_code, production_plan_code FROM seed_sources WHERE production_plan_code LIKE "JZB%" LIMIT 5');
  const records: any[] = [];
  while (stmt.step()) records.push(stmt.getAsObject());
  stmt.free();

  console.log('JZB records:', records.length);
  records.forEach(r => console.log(' ', r.source_code, '->', r.production_plan_code));

  // 检查 DD 开头的记录
  const stmt2 = db.prepare('SELECT source_code, production_plan_code FROM seed_sources WHERE production_plan_code LIKE "DD%" LIMIT 5');
  const records2: any[] = [];
  while (stmt2.step()) records2.push(stmt2.getAsObject());
  stmt2.free();

  console.log('DD records:', records2.length);
  records2.forEach(r => console.log(' ', r.source_code, '->', r.production_plan_code));

  db.close();
}

main().catch(console.error);
