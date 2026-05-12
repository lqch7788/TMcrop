/**
 * 验证种源表中的 production_plan_code 数据
 */

import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../data/yuanxingtu.db');

async function verify() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // 查看所有种源记录的生产计划编码
  console.log('=== 种源表中的 production_plan_code ===');
  const stmt = db.prepare(`
    SELECT id, source_code, crop_name, production_plan_code
    FROM seed_sources
    WHERE production_plan_code IS NOT NULL AND production_plan_code != ''
    LIMIT 30
  `);

  const records: any[] = [];
  while (stmt.step()) {
    records.push(stmt.getAsObject());
  }
  stmt.free();

  if (records.length === 0) {
    console.log('没有任何种源记录关联了生产计划');
  } else {
    console.log(`共有 ${records.length} 条记录关联了生产计划:`);
    records.forEach(r => {
      console.log(`  ${r.source_code} (${r.crop_name}): ${r.production_plan_code}`);
    });
  }

  db.close();
}

verify().catch(console.error);
