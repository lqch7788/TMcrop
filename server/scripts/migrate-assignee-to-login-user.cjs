/**
 * 业务执行人统一迁移脚本（2026-10-24）
 *
 * 背景
 *   系统里并存两套人员：users（5 个登录账号）与 employees（6 个员工档案）。
 *   任务派工 / 巡查计划 / 问题分派原本混用两套数据源，导致：
 *   · 同一条任务流里两个下拉框给出两份名单；
 *   · 派工后「我的工作日志」按登录用户过滤不到记录。
 *   前端已统一改读 users（人事/考勤/薪资继续用 employees），本脚本把存量业务数据
 *   的执行人一并归到登录账号。
 *
 * 迁移范围（业务执行人 —— 有待办语义、影响"这活归谁"）
 *   farm_tasks.assignee_id / assignee_name
 *   inspection_plans.assignee_id / assignee_name
 *   problems.assignee_id / assignee_name
 *   problems.handler（姓名列，与 assignee_name 双写）
 *   farm_task_schedules.worker_id / worker_name（农事任务排班，非考勤排班）
 *
 * 明确不动（历史事实 / 人事档案）
 *   attendance_records、schedules（考勤排班）、overtime_records、leave_records、
 *   performance_records、contracts、resignation_records —— 属人事考勤
 *   inspections.inspector_name、各表 operator_*、audit_logs —— 属操作事实记录
 *
 * 用法
 *   node server/scripts/migrate-assignee-to-login-user.cjs --dry-run   # 只统计，不写盘
 *   node server/scripts/migrate-assignee-to-login-user.cjs --apply     # 执行（必须先停后端）
 *
 * ⚠️ 必须先停后端服务
 *   后端用 sql.js（内存快照），运行中会周期性把内存整库写回磁盘，
 *   直接改盘会被覆盖。脚本检测到 3001 端口在监听时拒绝执行。
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const net = require('net');

const DB_PATH = path.join(__dirname, '../data/yuanxingtu.db');
const BACKUP_DIR = path.join(__dirname, '../data/backups');

/** 目标登录账号 */
const TARGET_ID = 'user-admin';
const TARGET_NAME = '陆启闯';

/** 迁移清单：table + 执行人 id 列 + 执行人姓名列 */
const MIGRATIONS = [
  { table: 'farm_tasks', idCol: 'assignee_id', nameCol: 'assignee_name' },
  { table: 'inspection_plans', idCol: 'assignee_id', nameCol: 'assignee_name' },
  { table: 'problems', idCol: 'assignee_id', nameCol: 'assignee_name' },
  // 2026-10-24（E4）：**移除 farm_task_schedules**
  //   该表的人员列口径是 employees.id（排班表声明的 FK 也是 employees.id），
  //   与上面三张表的 users.id 口径**不同** —— 不能统一到登录账号。
  //   且本脚本的 apply WHERE 是 `(nameCol<>?) OR (idCol<>TARGET_ID)`，
  //   归一后的 'EMP_007' 会命中第二个分支被**改回 'user-admin'**，
  //   与 migrateOperationIdentity.cjs 的归一结果直接打架（两脚本互相覆盖）。
  //   归一由 server/scripts/db-migrations/migrateOperationIdentity.cjs 负责。
];

/** 只改姓名列（无配套 id 列） */
const NAME_ONLY = [
  { table: 'problems', nameCol: 'handler' },
];

/** 端口是否被监听（判断后端是否在跑） */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.setTimeout(800);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => resolve(false));
  });
}

/** 统计待迁移行数 */
function countPending(db, table, cols) {
  const where = cols
    .map((c) => `(${c} IS NOT NULL AND ${c} <> '' AND ${c} <> '${TARGET_NAME}' AND ${c} <> '${TARGET_ID}')`)
    .join(' OR ');
  const stmt = db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`);
  stmt.step();
  const n = stmt.getAsObject().n;
  stmt.free();
  return Number(n);
}

(async () => {
  const isApply = process.argv.includes('--apply');
  const isDryRun = process.argv.includes('--dry-run') || !isApply;

  if (!fs.existsSync(DB_PATH)) {
    console.error(`✗ 数据库不存在：${DB_PATH}`);
    process.exit(1);
  }

  if (isApply) {
    const running = await isPortInUse(3001);
    if (running) {
      console.error('✗ 检测到后端服务仍在 3001 端口运行。');
      console.error('  sql.js 会把内存快照整库写回磁盘，覆盖本次修改。');
      console.error('  请先停止后端，再重新执行 --apply。');
      process.exit(1);
    }
  }

  const SQL = await initSqlJs({
    locateFile: (f) => path.join(__dirname, '../node_modules/sql.js/dist', f),
  });
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  console.log(isApply ? '=== 执行迁移 ===' : '=== 预演（--dry-run，不写盘）===');
  console.log(`目标执行人：${TARGET_NAME}（${TARGET_ID}）\n`);

  // ---- 统计 ----
  const plan = [];
  for (const m of MIGRATIONS) {
    const n = countPending(db, m.table, [m.idCol, m.nameCol]);
    plan.push({ ...m, count: n, kind: 'id+name' });
  }
  for (const m of NAME_ONLY) {
    const n = countPending(db, m.table, [m.nameCol]);
    plan.push({ ...m, count: n, kind: 'name' });
  }

  console.log('待迁移行数：');
  for (const p of plan) {
    console.log(`  ${p.table}.${p.nameCol}${p.idCol ? ` / ${p.idCol}` : ''}: ${p.count} 行`);
  }
  const total = plan.reduce((s, p) => s + p.count, 0);
  console.log(`  合计: ${total} 行\n`);

  if (total === 0) {
    console.log('没有需要迁移的数据。');
    return;
  }

  if (!isApply) {
    console.log('预演结束。确认无误后加 --apply 执行（需先停后端）。');
    return;
  }

  // ---- 备份 ----
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `yuanxingtu.db.bak-assignee-${stamp}`);
  fs.copyFileSync(DB_PATH, backupPath);
  console.log(`✓ 已备份到 ${path.relative(process.cwd(), backupPath)}\n`);

  // ---- 执行（单事务）----
  db.run('BEGIN');
  try {
    for (const p of MIGRATIONS) {
      if (p.count === 0) continue;
      db.run(
        `UPDATE ${p.table}
            SET ${p.idCol} = ?, ${p.nameCol} = ?
          WHERE (${p.nameCol} IS NOT NULL AND ${p.nameCol} <> '' AND ${p.nameCol} <> ?)
             OR (${p.idCol} IS NOT NULL AND ${p.idCol} <> '' AND ${p.idCol} <> ?)`,
        [TARGET_ID, TARGET_NAME, TARGET_NAME, TARGET_ID],
      );
      console.log(`✓ ${p.table}: 已归到 ${TARGET_NAME}`);
    }
    for (const p of NAME_ONLY) {
      if (p.count === 0) continue;
      db.run(
        `UPDATE ${p.table}
            SET ${p.nameCol} = ?
          WHERE ${p.nameCol} IS NOT NULL AND ${p.nameCol} <> '' AND ${p.nameCol} <> ?`,
        [TARGET_NAME, TARGET_NAME],
      );
      console.log(`✓ ${p.table}.${p.nameCol}: 已归到 ${TARGET_NAME}`);
    }
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    console.error('✗ 迁移失败，已回滚：', err.message);
    process.exit(1);
  }

  // ---- 落盘 ----
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.close();
  console.log('\n✓ 已写盘。');

  // ---- 复核 ----
  const verify = new SQL.Database(fs.readFileSync(DB_PATH));
  console.log('\n=== 迁移后复核 ===');
  for (const p of MIGRATIONS) {
    const stmt = verify.prepare(
      `SELECT ${p.nameCol} AS v, COUNT(*) AS n FROM ${p.table} GROUP BY ${p.nameCol} ORDER BY n DESC`,
    );
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    console.log(`  ${p.table}.${p.nameCol}:`, JSON.stringify(rows));
  }
  verify.close();
})().catch((err) => {
  console.error('✗ 脚本异常：', err);
  process.exit(1);
});
