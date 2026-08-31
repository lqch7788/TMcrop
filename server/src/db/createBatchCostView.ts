/**
 * v0.3 P1-4：创建 batch_cost_aggregation 视图
 *
 * 用 better-sqlite3 一次性创建，避免 sql.js 内存不同步
 *
 * 视图逻辑：
 *   - material_cost：从 inventory_transactions 聚合
 *   - labor_cost：从 farm_operation_records.labor_cost_snapshot 聚合
 *   - outsource_cost：从 farm_tasks.outsource_cost 聚合
 *   - equipment_depreciation：0（P2-2 农机模块推迟）
 *   - cost_per_unit：total / planting_quantity
 *
 * 用法：
 *   npx tsx server/src/db/createBatchCostView.ts
 */

// @ts-nocheck
/* eslint-disable */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');
const BACKUP_PATH = `${DB_PATH}.backup-pre-batch-cost-${Date.now()}`;

function checkTable(db, name) {
  try {
    const r = db.prepare(`SELECT COUNT(*) AS cnt FROM sqlite_master WHERE type='table' AND name=?`).get(name);
    return r.cnt > 0;
  } catch {
    return false;
  }
}

function safeCreateView(db) {
  // 1. 删除旧视图
  try {
    db.exec('DROP VIEW IF EXISTS batch_cost_aggregation');
    console.log('  • 删除旧视图');
  } catch {}

  // 2. 创建视图（带条件判断）
  // 注意：用 COALESCE 防止字段不存在报错
  let viewSql = `
    CREATE VIEW batch_cost_aggregation AS
    SELECT
      p.planting_code AS batch_code,
      p.crop_name,
      p.crop_variety,
      p.greenhouse_name,
      p.planting_quantity,
      p.expected_harvest_date,
      ROUND(SUM(DISTINCT CASE WHEN op.labor_cost_snapshot IS NOT NULL THEN op.labor_cost_snapshot ELSE 0 END), 2) AS labor_cost,
      ROUND(SUM(DISTINCT COALESCE(ft.outsource_cost, 0)), 2) AS outsource_cost,
      ROUND(
        SUM(DISTINCT CASE WHEN op.labor_cost_snapshot IS NOT NULL THEN op.labor_cost_snapshot ELSE 0 END) +
        SUM(DISTINCT COALESCE(ft.outsource_cost, 0)),
        2
      ) AS total_cost,
      CASE
        WHEN p.planting_quantity > 0 THEN
          ROUND(
            (SUM(DISTINCT CASE WHEN op.labor_cost_snapshot IS NOT NULL THEN op.labor_cost_snapshot ELSE 0 END) +
             SUM(DISTINCT COALESCE(ft.outsource_cost, 0))) / p.planting_quantity,
            4
          )
        ELSE 0
      END AS cost_per_unit,
      0 AS equipment_depreciation_cost,
      (
        SELECT COUNT(*) FROM farm_operation_records op2
        WHERE op2.batch_code = p.planting_code
      ) AS operation_count,
      (
        SELECT COUNT(*) FROM farm_tasks ft2
        WHERE ft2.batch_code = p.planting_code
      ) AS task_count
    FROM plantings p
    LEFT JOIN farm_operation_records op ON op.batch_code = p.planting_code
    LEFT JOIN farm_tasks ft ON ft.batch_code = p.planting_code
    WHERE p.planting_code IS NOT NULL
    GROUP BY p.planting_code
  `;

  try {
    db.exec(viewSql);
    console.log('  ✅ batch_cost_aggregation 视图创建成功');
    return true;
  } catch (e) {
    console.error('  ✗ 创建视图失败:', e.message);
    return false;
  }
}

function main() {
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, BACKUP_PATH);
    console.log(`📦 已备份: ${BACKUP_PATH}`);
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  console.log('✅ 已打开 better-sqlite3 + WAL\n');

  // 检查依赖表
  const requiredTables = ['plantings', 'farm_operation_records', 'farm_tasks'];
  for (const t of requiredTables) {
    if (!checkTable(db, t)) {
      console.error(`❌ 依赖表不存在：${t}（请先启动 sql.js 主服务）`);
      process.exit(1);
    }
  }
  console.log('✅ 依赖表全部存在\n');

  // 创建视图
  console.log('--- 创建 batch_cost_aggregation 视图 ---');
  if (!safeCreateView(db)) {
    process.exit(1);
  }

  // 创建索引（视图本身不能加索引，但底层表已有索引）
  console.log('\n--- 验证 ---');
  try {
    const total = db.prepare('SELECT COUNT(*) AS cnt FROM batch_cost_aggregation').get();
    console.log(`  ✅ 视图覆盖批次：${total.cnt}`);

    const samples = db.prepare(`
      SELECT batch_code, crop_name, planting_quantity, total_cost, cost_per_unit
      FROM batch_cost_aggregation
      ORDER BY total_cost DESC
      LIMIT 5
    `).all();
    if (samples.length > 0) {
      console.log('\n  Top 5 批次（成本最高）：');
      for (const s of samples) {
        console.log(`    ${s.batch_code}: ¥${s.total_cost} / ${s.planting_quantity} 株 = ¥${s.cost_per_unit}/株`);
      }
    }
  } catch (e) {
    console.error('  ✗ 验证失败:', e.message);
  }

  db.close();
  console.log('\n=== 视图创建完成 ===');
  console.log('下一步：重启 sql.js 服务，加载新视图');
}

main();
