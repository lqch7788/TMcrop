/**
 * P0-5：farm_tasks 批次字段语义修正
 *
 * 背景：
 * - 旧代码在建任务时默认写 batch_id = 任务自身 id、batch_code = "PC-{任务号}"，
 *   导致 22 条任务的批次字段是无意义自引用。
 * - 另有 7 条任务的 batch_id 是生产计划 id（PP...）、batch_code 是计划编码（YM/JZ...），
 *   但字段名是"批次"，与种植批次（ZZ...）混在同一个字段里。
 *
 * 处理规则（按顺序）：
 * 1. batch_id LIKE 'PP%' → 迁移到 production_plan_id / production_plan_code，随后清空 batch_id/batch_code
 * 2. batch_code LIKE 'PC-%' → 清空 batch_id / batch_code
 * 3. 其余不动
 *
 * 安全：
 * - 运行前自动备份为 <db>.bak.<timestamp>
 * - 支持 --dry-run（只报告不写盘）
 * - 逐条写报告到 server/data/task-batch-migration-report.<timestamp>.json
 *
 * 用法：
 *   node server/scripts/db-migrations/migrateTaskBatchSemantics.cjs --dry-run
 *   node server/scripts/db-migrations/migrateTaskBatchSemantics.cjs --apply
 *
 * ⚠️ 必须先停止后端服务再执行（运行中的服务会用内存快照覆盖磁盘）
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require('../../node_modules/sql.js');

const DB_PATH = path.resolve(__dirname, '../../data/yuanxingtu.db');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const APPLY = args.includes('--apply');

if (!DRY_RUN && !APPLY) {
  console.error('必须显式指定 --dry-run 或 --apply');
  process.exit(1);
}

function pad(n) { return String(n).padStart(2, '0'); }
function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function hasColumn(db, table, column) {
  const stmt = db.prepare(`PRAGMA table_info(${table})`);
  let found = false;
  while (stmt.step()) {
    if (stmt.getAsObject().name === column) { found = true; break; }
  }
  stmt.free();
  return found;
}

function rows(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const out = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('数据库不存在:', DB_PATH);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const beforeTotal = rows(db, 'SELECT COUNT(*) AS n FROM farm_tasks')[0].n;

  console.log(`=== farm_tasks 批次语义迁移 ${DRY_RUN ? '(DRY RUN)' : '(APPLY)'} ===`);
  console.log('任务总数:', beforeTotal);

  // 1) 补齐列（独立运行时不依赖启动钩子）
  for (const col of ['planting_id', 'production_plan_id', 'production_plan_code']) {
    if (!hasColumn(db, 'farm_tasks', col)) {
      if (!DRY_RUN) db.run(`ALTER TABLE farm_tasks ADD COLUMN ${col} TEXT`);
      console.log(`+ 新增列 farm_tasks.${col}`);
    }
  }

  const planRows = rows(
    db,
    `SELECT id, task_code, batch_id, batch_code FROM farm_tasks
     WHERE batch_id LIKE 'PP%'`
  );
  const pcRows = rows(
    db,
    `SELECT id, task_code, batch_id, batch_code FROM farm_tasks
     WHERE batch_code LIKE 'PC-%' AND (batch_id IS NULL OR batch_id NOT LIKE 'PP%')`
  );

  const report = { generatedAt: new Date().toISOString(), dryRun: DRY_RUN, beforeTotal, planLinked: [], pcFabricated: [], warnings: [] };

  console.log(`\n[规则1] 生产计划关联迁移：${planRows.length} 条`);
  for (const r of planRows) {
    console.log(`  ${r.task_code}: plan_id=${r.batch_id} plan_code=${r.batch_code}`);
    report.planLinked.push({ id: r.id, taskCode: r.task_code, productionPlanId: r.batch_id, productionPlanCode: r.batch_code });
    if (!DRY_RUN) {
      db.run(
        `UPDATE farm_tasks
         SET production_plan_id = ?, production_plan_code = ?, batch_id = NULL, batch_code = NULL, update_time = ?
         WHERE id = ?`,
        [r.batch_id || null, r.batch_code || null, new Date().toISOString(), r.id]
      );
    }
  }

  console.log(`\n[规则2] PC- 自造批次清理：${pcRows.length} 条`);
  for (const r of pcRows) {
    console.log(`  ${r.task_code}: batch_id=${r.batch_id || '-'} batch_code=${r.batch_code}`);
    report.pcFabricated.push({ id: r.id, taskCode: r.task_code, batchId: r.batch_id, batchCode: r.batch_code });
    if (!DRY_RUN) {
      db.run(
        `UPDATE farm_tasks SET batch_id = NULL, batch_code = NULL, update_time = ? WHERE id = ?`,
        [new Date().toISOString(), r.id]
      );
    }
  }

  // 校验：不应存在 PP 前缀的 batch_id 或 PC- 前缀的 batch_code
  const leftovers = rows(
    db,
    `SELECT id, task_code, batch_id, batch_code FROM farm_tasks
     WHERE batch_id LIKE 'PP%' OR batch_code LIKE 'PC-%'`
  );
  if (leftovers.length > 0) {
    report.warnings.push(`迁移后仍有 ${leftovers.length} 条异常记录`);
    console.warn('⚠️ 迁移后仍有异常记录:', leftovers.length);
  }

  const afterTotal = rows(db, 'SELECT COUNT(*) AS n FROM farm_tasks')[0].n;
  if (afterTotal !== beforeTotal) {
    console.error(`行数变化异常：${beforeTotal} → ${afterTotal}`);
    process.exit(1);
  }

  const reportPath = path.resolve(__dirname, `../../data/task-batch-migration-report.${stamp()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('\n报告:', reportPath);

  if (!DRY_RUN) {
    const backupPath = `${DB_PATH}.bak.${stamp()}`;
    fs.copyFileSync(DB_PATH, backupPath);
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
    console.log('备份:', backupPath);
    console.log('已写盘:', DB_PATH);
  } else {
    console.log('DRY RUN：未写盘');
  }

  console.log(`\n完成：计划迁移 ${planRows.length} 条，PC 清理 ${pcRows.length} 条，行数 ${afterTotal}`);
}

main().catch((e) => {
  console.error('迁移失败:', e);
  process.exit(1);
});
