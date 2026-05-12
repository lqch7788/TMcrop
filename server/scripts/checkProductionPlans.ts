/**
 * 检查 production_plans 表中的数据
 */

import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../data/yuanxingtu.db');

async function check() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // 查看 production_plans 表中的所有数据
  console.log('=== production_plans 表中的所有数据 ===');
  const stmt = db.prepare(`
    SELECT id, plan_code, plan_type, batch_status, crop_name, crop_variety
    FROM production_plans
  `);

  const records: any[] = [];
  while (stmt.step()) {
    records.push(stmt.getAsObject());
  }
  stmt.free();

  if (records.length === 0) {
    console.log('表中没有任何数据');
  } else {
    console.log(`共有 ${records.length} 条记录:`);
    records.forEach(r => {
      console.log(`  ID: ${r.id}, plan_code: ${r.plan_code}, plan_type: ${r.plan_type}, batch_status: ${r.batch_status}, crop_name: ${r.crop_name}`);
    });
  }

  db.close();
}

check().catch(console.error);
