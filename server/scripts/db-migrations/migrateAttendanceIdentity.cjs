/**
 * 考勤 / 假勤人员 ID 归一 + mock 数据归档（2026-10-24 · 员工身份管理 E2）
 *
 * 背景
 *   决策 D-A/D-B（E1 已落地）：employees 是唯一员工主数据源，业务表人员列一律存
 *   employees.id；users.id → employees.id 走 users.employee_id 这条确定性通道。
 *   但 attendance_records / overtime_records / leave_records 三张表的人员列仍是
 *   W001 / S001 / U001 / WORKER_001 / EMP_98404 / user-admin 等历史 ID，与
 *   employees.id 零交集，导致：
 *     · 考勤页「今日排班对比」的缺勤/临时到岗恒等于全量（跨表求差集永远空）
 *     · 按员工查考勤/加班/请假全部查不到
 *
 * 归一判定（与 server/src/lib/employeeIdentity.ts 同序）
 *   1. worker_id 命中 employees.id 且 status='active'          → 保留
 *   2. worker_id 命中 users.id → users.employee_id → employees  → 归一
 *   3. 姓名唯一命中 employees.name 且 status='active'           → 归一
 *   4. 以上都不中（含 U+FFFD 乱码姓名）                          → 归档
 *
 * 归档而非删除（memory: 审计行删除必须显式授权 / data-migration-principle）
 *   置 is_archived = 1 + archived_reason，列表与统计默认过滤 is_archived = 0。
 *   原数据完整保留，可随时通过把 is_archived 改回 0 恢复。
 *
 * 用法
 *   node server/scripts/db-migrations/migrateAttendanceIdentity.cjs --dry-run
 *   node server/scripts/db-migrations/migrateAttendanceIdentity.cjs --apply
 *
 * ⚠️ 必须先停后端（sql.js 内存快照会覆盖外部改盘）。脚本检测 3001 端口占用时拒绝 --apply。
 * 环境变量 YUANXINGTU_DB_PATH 可指向其它库（合成库测试用），此时跳过端口检查。
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const net = require('net');

const DB_PATH_OVERRIDE = process.env.YUANXINGTU_DB_PATH;
const DB_PATH = DB_PATH_OVERRIDE
  ? path.resolve(DB_PATH_OVERRIDE)
  : path.join(__dirname, '../../data/yuanxingtu.db');
const IS_PRODUCTION_DB = !DB_PATH_OVERRIDE;
const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backups');

/** 三张待归一的表：表名 + 姓名列（attendance 用 name，另两张用 worker_name） */
const TARGETS = [
  { table: 'attendance_records', nameCol: 'name' },
  { table: 'overtime_records', nameCol: 'worker_name' },
  { table: 'leave_records', nameCol: 'worker_name' },
];

/** U+FFFD 替换字符（乱码姓名标记） */
const REPLACEMENT_CHAR = '�';

/** 端口是否被监听 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.setTimeout(800);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => resolve(false));
  });
}

function queryAll(db, sql, params) {
  const stmt = db.prepare(sql);
  const rows = [];
  try {
    stmt.bind(params || []);
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

function queryOne(db, sql, params) {
  const rows = queryAll(db, sql, params);
  return rows.length ? rows[0] : null;
}

function tableExists(db, name) {
  const r = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='" + name + "'");
  return !!(r && r[0] && r[0].values && r[0].values.length > 0);
}

function columnExists(db, table, column) {
  const r = db.exec('PRAGMA table_info(' + table + ')');
  if (!r || !r[0]) return false;
  const idx = r[0].columns.indexOf('name');
  if (idx < 0) return false;
  return r[0].values.some((row) => row[idx] === column);
}

/**
 * 构建归一索引
 * @returns {{ byId: Map, byUser: Map, byName: Map<string,string[]>, dupNames: Set<string> }}
 */
function buildIndex(db) {
  const employees = queryAll(db, "SELECT id, name FROM employees WHERE status = 'active'", []);
  const byId = new Map();
  const byName = new Map();
  for (const e of employees) {
    byId.set(e.id, e);
    const list = byName.get(e.name) || [];
    list.push(e.id);
    byName.set(e.name, list);
  }
  // 重名（>1 个在职员工）不可用姓名兜底
  const dupNames = new Set();
  for (const [name, ids] of byName) if (ids.length > 1) dupNames.add(name);

  // users.id → employees.id（有 employee_id 列才建）
  const byUser = new Map();
  if (columnExists(db, 'users', 'employee_id')) {
    for (const u of queryAll(
      db,
      "SELECT id, employee_id FROM users WHERE employee_id IS NOT NULL AND employee_id <> ''",
      [],
    )) {
      if (byId.has(u.employee_id)) byUser.set(u.id, u.employee_id);
    }
  }
  return { byId, byUser, byName, dupNames };
}

/**
 * 判定一行该怎么处理
 *
 * 注意：调用方查询时已把姓名列统一别名成 `name`（attendance 原列名是 name，
 *   overtime/leave 是 worker_name），因此这里固定读 row.name，不要再按原列名取。
 *
 * @param row - 形如 { id, worker_id, name }
 * @returns {{ action:'keep'|'normalize'|'archive', targetId?:string, targetName?:string, reason?:string }}
 */
function classify(row, index) {
  const wid = String(row.worker_id ?? '').trim();
  const nm = String(row.name ?? '').trim();

  // 分支 1：已是合法 employees.id
  if (wid && index.byId.has(wid)) {
    return { action: 'keep', targetId: wid, targetName: index.byId.get(wid).name };
  }
  // 分支 2：登录账号 → 员工档案
  if (wid && index.byUser.has(wid)) {
    const empId = index.byUser.get(wid);
    return { action: 'normalize', targetId: empId, targetName: index.byId.get(empId).name, reason: 'users.employee_id' };
  }
  // 分支 3：姓名唯一命中
  if (nm && !nm.includes(REPLACEMENT_CHAR) && !index.dupNames.has(nm)) {
    const ids = index.byName.get(nm);
    if (ids && ids.length === 1) {
      return { action: 'normalize', targetId: ids[0], targetName: nm, reason: 'name' };
    }
  }
  // 分支 4：归档
  let reason;
  if (!wid) reason = '缺少 worker_id 且姓名无法匹配员工档案';
  else if (nm.includes(REPLACEMENT_CHAR)) reason = '姓名为 U+FFFD 乱码，无法匹配员工档案';
  else if (!nm) reason = `worker_id「${wid}」不在员工档案中，且无姓名可兜底`;
  else if (index.dupNames.has(nm)) reason = `姓名「${nm}」在员工档案中重名，无法唯一匹配`;
  else reason = `worker_id「${wid}」与姓名「${nm}」均不在员工档案中（历史 mock / 演示数据）`;
  return { action: 'archive', reason };
}

(async () => {
  const isApply = process.argv.includes('--apply');

  if (!fs.existsSync(DB_PATH)) {
    console.error('✗ 数据库不存在：' + DB_PATH);
    process.exit(1);
  }

  if (isApply && IS_PRODUCTION_DB) {
    if (await isPortInUse(3001)) {
      console.error('✗ 检测到后端服务仍在 3001 端口运行。');
      console.error('  sql.js 会把内存快照整库写回磁盘，覆盖本次修改。');
      console.error('  请先停止后端，再重新执行 --apply。');
      process.exit(1);
    }
  }

  const SQL = await initSqlJs({
    locateFile: (f) => path.join(__dirname, '../../node_modules/sql.js/dist', f),
  });
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  for (const t of TARGETS) {
    if (!tableExists(db, t.table)) {
      console.error('✗ 缺少表 ' + t.table + '，终止。');
      db.close();
      process.exit(1);
    }
  }

  const index = buildIndex(db);
  const missingCols = [];
  for (const t of TARGETS) {
    if (!columnExists(db, t.table, 'is_archived')) missingCols.push(t.table + '.is_archived');
    if (!columnExists(db, t.table, 'archived_reason')) missingCols.push(t.table + '.archived_reason');
  }

  // ---- 逐表生成计划 ----
  const plans = [];
  for (const t of TARGETS) {
    const rows = queryAll(db, `SELECT id, worker_id, ${t.nameCol} AS name FROM "${t.table}"`, []);
    const items = rows.map((r) => ({ row: r, ...classify(r, index) }));
    plans.push({
      table: t.table,
      nameCol: t.nameCol,
      total: rows.length,
      keep: items.filter((i) => i.action === 'keep'),
      normalize: items.filter((i) => i.action === 'normalize'),
      archive: items.filter((i) => i.action === 'archive'),
    });
  }

  console.log(isApply ? '=== 执行迁移 ===' : '=== 预演（--dry-run，不写盘）===');
  console.log('归一索引：在职员工 ' + index.byId.size + ' 人；可转档账号 ' + index.byUser.size +
    ' 个；重名 ' + index.dupNames.size + ' 个');
  console.log('缺列：' + (missingCols.length ? missingCols.join(', ') : '无（已就绪）') + '\n');

  for (const p of plans) {
    console.log(`【${p.table}】共 ${p.total} 行 → 保留 ${p.keep.length} / 归一 ${p.normalize.length} / 归档 ${p.archive.length}`);
    if (p.normalize.length) {
      const byTarget = new Map();
      for (const i of p.normalize) {
        const k = `${i.targetId} ${i.targetName}`;
        byTarget.set(k, (byTarget.get(k) || 0) + 1);
      }
      for (const [k, n] of byTarget) console.log(`    归一 → ${k}：${n} 行`);
    }
    if (p.archive.length) {
      const byReason = new Map();
      for (const i of p.archive) byReason.set(i.reason, (byReason.get(i.reason) || 0) + 1);
      for (const [r, n] of byReason) console.log(`    归档：${n} 行 — ${r}`);
    }
    console.log('');
  }

  if (!isApply) {
    console.log('预演结束。确认无误后加 --apply 执行（需先停后端）。');
    db.close();
    return;
  }

  // ---- 备份 ----
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, 'yuanxingtu.db.bak-attendance-identity-' + stamp);
  fs.copyFileSync(DB_PATH, backupPath);
  console.log('✓ 已备份到 ' + path.relative(process.cwd(), backupPath) + '\n');

  const now = new Date().toISOString();
  db.run('BEGIN');
  try {
    // 1. 加列（幂等）
    for (const t of TARGETS) {
      if (!columnExists(db, t.table, 'is_archived')) {
        db.run(`ALTER TABLE ${t.table} ADD COLUMN is_archived INTEGER DEFAULT 0`);
        console.log(`✓ ${t.table} 添加 is_archived`);
      }
      if (!columnExists(db, t.table, 'archived_reason')) {
        db.run(`ALTER TABLE ${t.table} ADD COLUMN archived_reason TEXT`);
        console.log(`✓ ${t.table} 添加 archived_reason`);
      }
      db.run(`CREATE INDEX IF NOT EXISTS idx_${t.table}_archived ON ${t.table}(is_archived)`);
    }

    // 2. 归一 + 归档
    for (const p of plans) {
      const upd = db.prepare(
        `UPDATE "${p.table}" SET worker_id = ?, ${p.nameCol} = ?, update_time = ? WHERE id = ?`,
      );
      for (const i of p.normalize) {
        upd.run([i.targetId, i.targetName, now, i.row.id]);
      }
      upd.free();

      const arc = db.prepare(
        `UPDATE "${p.table}" SET is_archived = 1, archived_reason = ?, update_time = ? WHERE id = ?`,
      );
      for (const i of p.archive) {
        arc.run([i.reason, now, i.row.id]);
      }
      arc.free();

      console.log(`✓ ${p.table}：归一 ${p.normalize.length} 行，归档 ${p.archive.length} 行`);
    }
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    console.error('✗ 迁移失败，已回滚：', err.message);
    db.close();
    process.exit(1);
  }

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.close();
  console.log('\n✓ 已写盘。');

  // ---- 复核 ----
  const verify = new SQL.Database(fs.readFileSync(DB_PATH));
  const report = { appliedAt: now, tables: {} };
  let ok = true;
  console.log('\n=== 迁移后复核 ===');
  for (const t of TARGETS) {
    const total = queryOne(verify, `SELECT COUNT(*) AS c FROM "${t.table}"`).c;
    const archived = queryOne(verify, `SELECT COUNT(*) AS c FROM "${t.table}" WHERE is_archived = 1`).c;
    const active = total - archived;
    const activeHit = queryOne(
      verify,
      `SELECT COUNT(*) AS c FROM "${t.table}" a
        JOIN employees e ON e.id = a.worker_id
       WHERE COALESCE(a.is_archived,0) = 0`,
    ).c;
    report.tables[t.table] = { total, archived, active, activeHit };
    const good = activeHit === active;
    if (!good) ok = false;
    console.log(`  ${good ? '✅' : '❌'} ${t.table}：总 ${total} = 生效 ${active} + 归档 ${archived}；` +
      `生效行命中 employees ${activeHit}/${active}`);
  }
  // 索引确认
  for (const t of TARGETS) {
    const has = queryOne(verify,
      `SELECT COUNT(*) AS c FROM sqlite_master WHERE type='index' AND name='idx_${t.table}_archived'`).c;
    if (!has) { ok = false; console.log(`  ❌ 缺少索引 idx_${t.table}_archived`); }
  }
  verify.close();

  const reportPath = path.join(path.dirname(DB_PATH), 'attendance-identity-report.' + stamp + '.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log('  报告 → ' + reportPath);
  console.log(ok ? '\n✓ 复核通过' : '\n✗ 复核不通过');
  if (!ok) process.exit(2);
})().catch((err) => {
  console.error('✗ 脚本异常：', err);
  process.exit(1);
});
