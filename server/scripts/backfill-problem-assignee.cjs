/**
 * 回填 problems.assignee_id / assignee_name（2026-10-23）
 *
 * 背景：前端分派只写 handler 列，而库里有 handler 与 assignee_id/assignee_name
 *   两套「处理人」字段。结果 45 条问题里 21 条 assignee_name 为空，
 *   任何按 assignee 的查询/统计/通知都拿不到人。
 *
 * 本脚本把有 handler 却缺 assignee_name 的行补上；assignee_id 无法从姓名反查的
 * 保持为空（前端已改为同时写两列，新数据不会再缺）。
 *
 * 用法：
 *   node scripts/backfill-problem-assignee.cjs --dry-run   # 只统计
 *   node scripts/backfill-problem-assignee.cjs --apply     # 实际写入
 *
 * 注意：必须先停后端再执行（sql.js 全量落盘会覆盖外部修改）。
 */
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'yuanxingtu.db');
const APPLY = process.argv.includes('--apply');

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`数据库不存在: ${DB_PATH}`);
    process.exit(1);
  }

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // 需要回填的行：有 handler 但 assignee_name 为空
  const res = db.exec(
    `SELECT id, problem_code, handler, assignee_name FROM problems
     WHERE COALESCE(handler, '') <> '' AND COALESCE(assignee_name, '') = ''`
  );
  const rows = res.length > 0
    ? res[0].values.map((v) => ({ id: v[0], code: v[1], handler: v[2], assigneeName: v[3] }))
    : [];

  console.log(`待回填 ${rows.length} 条（有 handler、缺 assignee_name）`);
  rows.slice(0, 10).forEach((r) => console.log(`  ${r.code}  handler=${r.handler}`));

  if (!APPLY) {
    console.log('\n[DRY-RUN] 未写入。加 --apply 实际执行。');
    return;
  }
  if (rows.length === 0) return;

  for (const r of rows) {
    db.run('UPDATE problems SET assignee_name = ?, update_time = ? WHERE id = ?', [
      String(r.handler),
      new Date().toISOString(),
      String(r.id),
    ]);
  }
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log(`\n已回填 ${rows.length} 条并写入 ${DB_PATH}`);
}

main().catch((e) => {
  console.error('回填失败:', e);
  process.exit(1);
});
