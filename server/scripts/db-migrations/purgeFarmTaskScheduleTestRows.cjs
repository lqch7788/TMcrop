/**
 * 清理：删除 farm_task_schedules 中经用户明确授权的测试/脏数据行。
 *
 * 背景（2026-10-20）：
 *   1) 6 行种子坏数据 —— worker_name 是 U+FFFD 替换字符（种子脚本写坏的中文名），
 *      涉及任务 NS20260316-001 的 2027-06-01~03 排班；
 *   2) 1 行本次改版验证残留 —— 任务 NS20261010-002 / 张三 / 生产A组 / 2026-10-20。
 *
 * ⚠️ 按 ID 精确删除（逐个列出），不使用 description/task_id LIKE 模式批量删，
 *    避免误伤真实业务排班（memory: audit-row-deletion-needs-explicit-auth）。
 *
 * 用法：
 *   node server/scripts/db-migrations/purgeFarmTaskScheduleTestRows.cjs --dry-run
 *   node server/scripts/db-migrations/purgeFarmTaskScheduleTestRows.cjs --apply
 *
 * ⚠️ 执行 --apply 前必须先停掉后端：sql.js 的 saveDatabase() 会用内存快照全量重写
 *    磁盘文件，运行中的服务会把外部改盘覆盖掉。
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '../../data/yuanxingtu.db');
const DATA_DIR = path.resolve(__dirname, '../../data');
const APPLY = process.argv.includes('--apply');

/** 经用户明确授权删除的行 ID（逐个列出，附删除原因） */
const TARGETS = [
  // —— 种子坏数据：worker_name 为 U+FFFD 乱码 ——
  { id: '1789513743001_akzugc7', reason: '种子坏数据：worker_name 为 U+FFFD 乱码（task=NS20260316-001, 2027-06-01, EMP_001/T001）' },
  { id: '1789513743047_k3okr16', reason: '种子坏数据：worker_name 为 U+FFFD 乱码（task=NS20260316-001, 2027-06-02, EMP_001/T001）' },
  { id: '1789513743091_86o8qct', reason: '种子坏数据：worker_name 为 U+FFFD 乱码（task=NS20260316-001, 2027-06-03, EMP_001/T001）' },
  { id: '1789513743130_jesqavg', reason: '种子坏数据：worker_name 为 U+FFFD 乱码（task=NS20260316-001, 2027-06-01, EMP_003/T002）' },
  { id: '1789513743175_g6kybun', reason: '种子坏数据：worker_name 为 U+FFFD 乱码（task=NS20260316-001, 2027-06-02, EMP_003/T002）' },
  { id: '1789513743217_c4woz7j', reason: '种子坏数据：worker_name 为 U+FFFD 乱码（task=NS20260316-001, 2027-06-03, EMP_003/T002）' },
  // —— 本次改版验证残留 ——
  { id: '1792482198606_cek4jhy', reason: '验证残留：任务排班并入排班调度时的浏览器实测数据（task=NS20261010-002, 2026-10-20）' },
];

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' +
    pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())
  );
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('数据库不存在：' + DB_PATH);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  const before = db.prepare('SELECT COUNT(*) AS c FROM farm_task_schedules').get().c;

  // 逐个按 ID 取出待删行；找不到的记为 missing（不静默跳过）
  const found = [];
  const missing = [];
  const sel = db.prepare(
    'SELECT id, task_id, worker_id, worker_name, team_id, plan_date, shift_type FROM farm_task_schedules WHERE id = ?',
  );
  for (const t of TARGETS) {
    const row = sel.get(t.id);
    if (row) found.push({ ...row, reason: t.reason });
    else missing.push({ id: t.id, reason: t.reason });
  }

  console.log('删除前总行数：' + before);
  console.log('命中待删行 ' + found.length + ' 条，未命中 ' + missing.length + ' 条');
  found.forEach((r) => {
    console.log('  - ' + r.id + '  ' + r.task_id + '  ' + r.plan_date + '  ' + r.reason);
  });
  if (missing.length > 0) {
    console.log('未命中（可能已被删除）：');
    missing.forEach((m) => console.log('  - ' + m.id + '  ' + m.reason));
  }

  if (!APPLY) {
    console.log('[dry-run] 未写盘。加 --apply 执行。');
    db.close();
    return;
  }

  // 自动备份
  const ts = stamp();
  const backup = path.join(DATA_DIR, 'yuanxingtu.db.bak.' + ts);
  fs.copyFileSync(DB_PATH, backup);
  console.log('已备份 → ' + backup);

  const del = db.prepare('DELETE FROM farm_task_schedules WHERE id = ?');
  const run = db.transaction((rows) => {
    let n = 0;
    for (const r of rows) n += del.run(r.id).changes;
    return n;
  });
  const deleted = run(found);
  db.close();

  // 重新打开校验
  const db2 = new Database(DB_PATH, { readonly: true });
  const after = db2.prepare('SELECT COUNT(*) AS c FROM farm_task_schedules').get().c;
  const leftovers = db2
    .prepare("SELECT COUNT(*) AS c FROM farm_task_schedules WHERE worker_name LIKE '%' || char(65533) || '%'")
    .get().c;
  const remaining = db2.prepare('SELECT id, task_id, plan_date FROM farm_task_schedules ORDER BY plan_date').all();
  db2.close();

  const report = {
    appliedAt: new Date().toISOString(),
    rowsBefore: before,
    rowsAfter: after,
    deleted,
    missing: missing.map((m) => m.id),
    leftoverMojibake: leftovers,
    deletedRows: found,
    remaining,
  };
  const reportPath = path.join(DATA_DIR, 'farm-task-schedule-purge-report.' + ts + '.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('清理完成：');
  console.log('  行数 ' + before + ' → ' + after + '（删除 ' + deleted + ' 行）');
  console.log('  残留 U+FFFD 乱码行：' + leftovers);
  console.log('  剩余排班：' + JSON.stringify(remaining));
  console.log('  报告 → ' + reportPath);

  if (after !== before - deleted || deleted !== found.length) {
    console.error('❌ 校验不通过：删除行数与预期不符');
    process.exit(2);
  }
}

main();
