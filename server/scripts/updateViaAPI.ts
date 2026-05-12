/**
 * 直接通过 API 更新数据库中的生产计划编码
 * 使用后端服务器的 API 来更新数据
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/yuanxingtu.db');

async function updateViaDirectDb() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // DD编码到JZB编码的映射
  const mapping: Record<string, string> = {
    'DD20260510368': 'JZB2026-001', // 红果番茄
    'DD20260510431': 'JZB2026-003', // 水果黄瓜
    'DD20260510774': '', // 散叶生菜 - 无匹配
    'DD20260510496': '', // 红颜草莓 - 无匹配
    'DD20260510175': 'JZB2026-004', // 紫长茄子
    'DD20260510196': '', // 红尖椒 - 无匹配
  };

  // 获取所有 DD 开头的记录
  console.log('=== 查找 DD 开头的记录 ===');
  const stmt = db.prepare(`
    SELECT id, source_code, production_plan_code
    FROM seed_sources
    WHERE production_plan_code LIKE 'DD%'
  `);

  const records: any[] = [];
  while (stmt.step()) {
    records.push(stmt.getAsObject());
  }
  stmt.free();

  console.log(`找到 ${records.length} 条 DD 开头的记录`);

  // 更新每条记录
  let updated = 0;
  for (const record of records) {
    const oldCode = record.production_plan_code;
    const newCode = mapping[oldCode] || '';

    if (newCode) {
      console.log(`  ${record.source_code}: ${oldCode} -> ${newCode}`);
      db.run(`UPDATE seed_sources SET production_plan_code = ? WHERE id = ?`, [newCode, record.id]);
      updated++;
    } else {
      console.log(`  ${record.source_code}: ${oldCode} -> (清空)`);
      db.run(`UPDATE seed_sources SET production_plan_code = '' WHERE id = ?`, [record.id]);
    }
  }

  // 保存数据库
  const data = db.export();
  const bufferOut = Buffer.from(data);
  fs.writeFileSync(DB_PATH, bufferOut);
  console.log(`\n更新完成，已保存到: ${DB_PATH}`);
  console.log(`共更新 ${updated} 条记录为正确的生产计划编码`);

  // 验证
  console.log('\n=== 验证更新结果 ===');
  const verifyStmt = db.prepare(`
    SELECT source_code, production_plan_code
    FROM seed_sources
    WHERE production_plan_code LIKE 'JZB%' OR production_plan_code = ''
    LIMIT 10
  `);

  while (verifyStmt.step()) {
    const r = verifyStmt.getAsObject();
    console.log(`  ${r.source_code}: ${r.production_plan_code || '(空)'}`);
  }
  verifyStmt.free();

  db.close();
}

updateViaDirectDb().catch(console.error);
