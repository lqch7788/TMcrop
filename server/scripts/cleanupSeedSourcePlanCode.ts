/**
 * 清理种源表中 DD 开头的错误生产计划编码，并尝试用正确的育种计划填充
 * 运行: cd server && npx tsx scripts/cleanupSeedSourcePlanCode.ts
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
    SELECT id, source_code, production_plan_code, crop_name, variety_name
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
      console.log(`  ID: ${r.id}, 种源批号: ${r.source_code}, 作物: ${r.crop_name}, 品种: ${r.variety_name}, 错误编码: ${r.production_plan_code}`);
    });

    // 获取所有育种计划（包括已完成状态）
    console.log('\n=== 可用的育种计划 ===');
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
      console.log(`  ID: ${p.id}, 批次号: ${p.plan_code}, 作物: ${p.crop_name}, 品种: ${p.crop_variety}`);
    });

    // 尝试匹配并更新
    console.log('\n=== 开始匹配并更新 ===');
    let updatedCount = 0;
    let clearedCount = 0;

    for (const record of records) {
      // 根据 crop_name 匹配育种计划（品种可能有差异，宽松匹配）
      const matchedPlan = plans.find(p =>
        p.crop_name === record.crop_name
      );

      if (matchedPlan) {
        console.log(`  ${record.source_code}: ${record.production_plan_code} -> ${matchedPlan.plan_code} (匹配成功)`);
        db.run(`UPDATE seed_sources SET production_plan_code = ? WHERE id = ?`, [matchedPlan.plan_code, record.id]);
        updatedCount++;
      } else {
        // 无法匹配，清空
        console.log(`  ${record.source_code}: ${record.production_plan_code} -> (无法匹配，清空)`);
        db.run(`UPDATE seed_sources SET production_plan_code = '' WHERE id = ?`, [record.id]);
        clearedCount++;
      }
    }

    console.log(`\n更新完成: ${updatedCount} 条匹配更新, ${clearedCount} 条无法匹配已清空`);
  }

  // 保存数据库
  const data = db.export();
  const bufferOut = Buffer.from(data);
  fs.writeFileSync(DB_PATH, bufferOut);
  console.log(`\n数据库已保存到: ${DB_PATH}`);

  db.close();
}

cleanup().catch(console.error);
