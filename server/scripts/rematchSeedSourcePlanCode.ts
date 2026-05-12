/**
 * 重新匹配种源记录的生产计划编码
 * 根据作物名称匹配育种计划
 */

import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../data/yuanxingtu.db');

// DD编码到作物名称的映射（根据之前的记录）
const DD_CROP_MAP: Record<string, string> = {
  'DD20260510368': '红果番茄',
  'DD20260510431': '水果黄瓜',
  'DD20260510774': '散叶生菜',
  'DD20260510496': '红颜草莓',
  'DD20260510175': '紫长茄子',
  'DD20260510196': '红尖椒',
};

async function rematch() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // 获取所有育种计划（包括已完成状态）
  console.log('=== 可用的育种计划 ===');
  const planStmt = db.prepare(`
    SELECT id, plan_code, crop_name, crop_variety
    FROM production_plans
    WHERE plan_type = 'seed_breeding'
  `);

  const plans: any[] = [];
  while (planStmt.step()) {
    plans.push(planStmt.getAsObject());
  }
  planStmt.free();

  plans.forEach(p => {
    console.log(`  批次号: ${p.plan_code}, 作物: ${p.crop_name}`);
  });

  // 获取所有 production_plan_code 为空的种源记录
  console.log('\n=== 准备匹配的种源记录 ===');
  const seedStmt = db.prepare(`
    SELECT id, source_code, production_plan_code, crop_name
    FROM seed_sources
    WHERE production_plan_code IS NULL OR production_plan_code = ''
  `);

  const seedRecords: any[] = [];
  while (seedStmt.step()) {
    seedRecords.push(seedStmt.getAsObject());
  }
  seedStmt.free();

  console.log(`共有 ${seedRecords.length} 条种源记录需要匹配`);

  // 匹配并更新
  console.log('\n=== 开始匹配 ===');
  let matchedCount = 0;

  for (const record of seedRecords) {
    // 根据 crop_name 匹配育种计划
    const matchedPlan = plans.find(p => p.crop_name === record.crop_name);

    if (matchedPlan) {
      console.log(`  ${record.source_code} (${record.crop_name}) -> ${matchedPlan.plan_code}`);
      db.run(`UPDATE seed_sources SET production_plan_code = ? WHERE id = ?`, [matchedPlan.plan_code, record.id]);
      matchedCount++;
    } else {
      console.log(`  ${record.source_code} (${record.crop_name}) -> 无法匹配`);
    }
  }

  console.log(`\n匹配完成: ${matchedCount} 条成功匹配`);

  // 保存数据库
  const data = db.export();
  const bufferOut = Buffer.from(data);
  fs.writeFileSync(DB_PATH, bufferOut);
  console.log(`数据库已保存到: ${DB_PATH}`);

  db.close();
}

rematch().catch(console.error);
