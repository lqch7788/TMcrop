/**
 * 给未归属基地的农事任务补上基地（2026-10-26）
 *
 * 背景：
 *   farm_tasks 有 5 个写入点，此前只有 routes/farmTask.ts 一处补了 base_oid，
 *   另外 4 处（sync.controller / routes/problem.ts / services/farmTask.service /
 *   services/inspectionPlanService）不补 → 产出 base_oid 为空的记录。
 *
 *   读过滤收紧为严格匹配后，这类记录从所有基地都看不到（幽灵数据）。
 *   4 处写入点已在 2026-10-26 补齐，本脚本清理存量。
 *
 * ⚠️ 必须先停后端（sql.js 内存快照会覆盖外部改盘）
 *
 * 用法：
 *   停服 → node server/scripts/db-migrations/assignUnscopedFarmTasks.cjs [--apply] [--base=<base_oid>]
 *   默认干跑；不传 --base 时自动选「宁波北仑基地」（base_1780023508412）
 *
 * 影响表：farm_tasks（只改 base_oid / base_name 为空的记录）
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const APPLY = process.argv.includes('--apply');
const baseArg = process.argv.find((a) => a.startsWith('--base='));
const DB = path.join(__dirname, '..', '..', 'data', 'yuanxingtu.db');
const DEFAULT_BASE = 'base_1780023508412'; // 宁波北仑基地

(async () => {
  console.log('='.repeat(72));
  console.log(`补全未归属农事任务的基地${APPLY ? '（执行）' : '（干跑）'}`);
  console.log('='.repeat(72));

  if (!fs.existsSync(DB)) {
    console.error('❌ 数据库不存在:', DB);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB));
  const q = (s) => { const r = db.exec(s); return r[0] ? r[0].values : []; };

  // ── 1. 确定目标基地 ──
  let targetOid = baseArg ? baseArg.split('=')[1] : DEFAULT_BASE;
  let target = q(
    `SELECT oid, name FROM bases WHERE oid = '${targetOid.replace(/'/g, "''")}'` +
    ` AND (status IS NULL OR status = 'active')`
  );
  if (target.length === 0) {
    const fallback = q(
      `SELECT oid, name FROM bases WHERE (deleted_at IS NULL OR deleted_at = '')` +
      ` AND (status IS NULL OR status = 'active') ORDER BY oid LIMIT 1`
    );
    if (fallback.length === 0) {
      console.error('❌ 库中没有可用基地');
      process.exit(1);
    }
    targetOid = fallback[0][0];
    target = fallback;
  }
  const baseName = target[0][1];
  console.log(`\n目标基地: ${baseName}（${targetOid}）`);

  // ── 2. 待补全记录 ──
  const rows = q(
    `SELECT id, task_code, task_title, status, create_time FROM farm_tasks` +
    ` WHERE base_oid IS NULL OR base_oid = '' ORDER BY create_time`
  );
  console.log(`\n待补全 ${rows.length} 条：`);
  for (const [id, code, title, status, ct] of rows) {
    console.log(`  ${code || id}  [${status}]  ${title || '(无标题)'}  ${ct}`);
  }

  if (rows.length === 0) {
    console.log('\n✅ 无需补全');
    db.close();
    return;
  }

  if (!APPLY) {
    console.log('\n（干跑结束，加 --apply 执行）');
    db.close();
    return;
  }

  // ── 3. 执行 ──
  db.run(
    `UPDATE farm_tasks SET base_oid = ?, base_name = ? WHERE base_oid IS NULL OR base_oid = ''`,
    [targetOid, baseName]
  );
  const remaining = q(
    `SELECT COUNT(*) FROM farm_tasks WHERE base_oid IS NULL OR base_oid = ''`
  )[0][0];

  fs.writeFileSync(DB, Buffer.from(db.export()));
  console.log(`\n✅ 补全 ${rows.length} 条，剩余未归属：${remaining}，已落盘`);
  db.close();
})();
