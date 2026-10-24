/**
 * 作业 / 工时记录人员 ID 归一（2026-10-24 · 员工身份管理 E3）
 *
 * 背景
 *   farm_operation_records.operator_id 与 labor_records.worker_id 存着多种历史 ID：
 *   USER_ADMIN_001 / u / user-admin / demo_user（都是「陆启闯」的不同写法）、
 *   EMP_98404 / EMP_76162 / EMP_W5（姓名哈希产物）、
 *   EMP-999 / EMP_VERIFY / QA / U001 / U013（占位与测试值）、
 *   以及空串与 NULL。
 *
 *   结果：作业记录与工时记录无法与员工档案关联，按员工查作业/工时全部查不到。
 *
 * 归一判定（与 server/src/lib/employeeIdentity.ts 同序）
 *   1. worker_id 命中 employees.id 且 status='active'  → 保留
 *   2. worker_id 命中 users.id → users.employee_id → employees.id → 归一
 *   3. 姓名唯一命中 employees.name 且 status='active'   → 归一
 *   4. 以上都不中                                        → worker_id 置 NULL
 *
 * 为什么第 4 步是「置 NULL」而不是「归档」
 *   · 这两列都可置 NULL（实测 PRAGMA notnull=0），NULL 语义 = 「无归属员工的操作」
 *   · operator_name 保留原始显示名（「系统」/「验收员」/「访客01」…），界面照常可读
 *   · 归档需要给表加 is_archived 列并改 20+ 个查询点（批次成本视图 / 合规报告 /
 *     审批联动 / 成本统计…），风险远大于收益；
 *     且《农产品质量安全法》要求生产记录保存 ≥2 年，归档等于削弱法定存档
 *   · 置 NULL 后这两列严格只存 employees.id 或 NULL，契约成立，且**不改动任何查询逻辑** ⇒ 零回归
 *
 * 归一目标：employees.id（不是 users.id）
 *   理由：这两张表记录的是「员工干了多少活」，6 名现场员工（张三/李四/王五/赵六/钱七/孙八）
 *   只有员工档案、没有登录账号，归到 users.id 会让他们无法表示。
 *
 * 用法
 *   node server/scripts/db-migrations/migrateOperationIdentity.cjs --dry-run
 *   node server/scripts/db-migrations/migrateOperationIdentity.cjs --apply
 *
 * ⚠️ 必须先停后端（sql.js 内存快照会覆盖外部改盘）。
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

/**
 * 待归一的表：表名 + 人员 id 列 + 姓名列 + 更新时间列 + 人员 id 列是否可空
 *
 * 注意 1：时间列命名不统一 —— farm_operation_records 用 created_at/updated_at，
 *   labor_records 与 farm_task_schedules 用 create_time/update_time。
 *   （E1 迁移脚本已栽过一次同类坑）
 * 注意 2：farm_task_schedules.worker_id 是 NOT NULL，无法归一的行不能置 NULL ——
 *   实测其 41 行 worker_id 全部可归一（user-admin → users.employee_id → EMP_007），
 *   故该表不需要 nullify 分支；若将来出现不可归一行，脚本会报错退出而不是静默置空。
 */
const TARGETS = [
  { table: 'farm_operation_records', idCol: 'operator_id', nameCol: 'operator_name', timeCol: 'updated_at', nullable: true },
  { table: 'labor_records', idCol: 'worker_id', nameCol: 'worker_name', timeCol: 'update_time', nullable: true },
  { table: 'farm_task_schedules', idCol: 'worker_id', nameCol: 'worker_name', timeCol: 'updated_at', nullable: false },
];

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

/** 构建归一索引：employees.id / users.id→employee_id / 姓名（重名不可用） */
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
  const dupNames = new Set();
  for (const [name, ids] of byName) if (ids.length > 1) dupNames.add(name);

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

/** 判定一行该怎么处理 */
function classify(row, index) {
  const wid = String(row.worker_id ?? '').trim();
  const nm = String(row.worker_name ?? '').trim();

  if (wid && index.byId.has(wid)) {
    return { action: 'keep', targetId: wid, targetName: index.byId.get(wid).name };
  }
  if (wid && index.byUser.has(wid)) {
    const empId = index.byUser.get(wid);
    return { action: 'normalize', targetId: empId, targetName: index.byId.get(empId).name, reason: 'users.employee_id' };
  }
  if (nm && !index.dupNames.has(nm)) {
    const ids = index.byName.get(nm);
    if (ids && ids.length === 1) {
      return { action: 'normalize', targetId: ids[0], targetName: nm, reason: 'name' };
    }
  }
  // 无法归一 → 置 NULL（operator_name 保留原显示名）
  let reason;
  if (!wid && !nm) reason = '无操作人（历史空记录）';
  else if (!wid) reason = `无 id，姓名「${nm}」不在员工档案中`;
  else if (!nm) reason = `id「${wid}」不在员工档案中且无姓名`;
  else if (index.dupNames.has(nm)) reason = `姓名「${nm}」在员工档案中重名，无法唯一匹配`;
  else reason = `id「${wid}」与姓名「${nm}」均不在员工档案中（占位/测试数据）`;
  return { action: 'nullify', reason };
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
  const plans = [];
  for (const t of TARGETS) {
    const rows = queryAll(
      db,
      `SELECT id, ${t.idCol} AS worker_id, ${t.nameCol} AS worker_name FROM "${t.table}"`,
      [],
    );
    const items = rows.map((r) => ({ row: r, ...classify(r, index) }));
    // 人员 id 列不可空的表（如 farm_task_schedules.worker_id NOT NULL）：
    //   若存在无法归一的行，置 NULL 会违反约束 → 直接报错退出，不静默处理
    if (!t.nullable) {
      const bad = items.filter((i) => i.action === 'nullify');
      if (bad.length > 0) {
        console.error(`✗ ${t.table}.${t.idCol} 为 NOT NULL，但有 ${bad.length} 行无法归一，终止：`);
        for (const i of bad.slice(0, 10)) {
          console.error(`   ${i.row.id} → ${i.reason}`);
        }
        db.close();
        process.exit(1);
      }
    }
    plans.push({
      table: t.table,
      idCol: t.idCol,
      nameCol: t.nameCol,
      timeCol: t.timeCol,
      nullable: t.nullable,
      total: rows.length,
      keep: items.filter((i) => i.action === 'keep'),
      normalize: items.filter((i) => i.action === 'normalize'),
      nullify: items.filter((i) => i.action === 'nullify'),
    });
  }

  console.log(isApply ? '=== 执行迁移 ===' : '=== 预演（--dry-run，不写盘）===');
  console.log('归一索引：在职员工 ' + index.byId.size + ' 人；可转档账号 ' + index.byUser.size +
    ' 个；重名 ' + index.dupNames.size + ' 个\n');

  for (const p of plans) {
    console.log(`【${p.table}】共 ${p.total} 行 → 保留 ${p.keep.length} / 归一 ${p.normalize.length} / 置空 ${p.nullify.length}`);
    if (p.normalize.length) {
      const byTarget = new Map();
      for (const i of p.normalize) {
        const k = `${i.targetId} ${i.targetName}`;
        byTarget.set(k, (byTarget.get(k) || 0) + 1);
      }
      for (const [k, n] of byTarget) console.log(`    归一 → ${k}：${n} 行`);
    }
    if (p.nullify.length) {
      const byReason = new Map();
      for (const i of p.nullify) byReason.set(i.reason, (byReason.get(i.reason) || 0) + 1);
      for (const [r, n] of byReason) console.log(`    置空：${n} 行 — ${r}`);
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
  const backupPath = path.join(BACKUP_DIR, 'yuanxingtu.db.bak-operation-identity-' + stamp);
  fs.copyFileSync(DB_PATH, backupPath);
  console.log('✓ 已备份到 ' + path.relative(process.cwd(), backupPath) + '\n');

  const now = new Date().toISOString();
  db.run('BEGIN');
  try {
    for (const p of plans) {
      const upd = db.prepare(
        `UPDATE "${p.table}" SET ${p.idCol} = ?, ${p.nameCol} = ?, ${p.timeCol} = ? WHERE id = ?`,
      );
      for (const i of p.normalize) {
        upd.run([i.targetId, i.targetName, now, i.row.id]);
      }
      upd.free();

      // 置空：id 列置 NULL，姓名列保留原显示名（不覆盖）
      const nul = db.prepare(
        `UPDATE "${p.table}" SET ${p.idCol} = NULL, ${p.timeCol} = ? WHERE id = ?`,
      );
      for (const i of p.nullify) {
        nul.run([now, i.row.id]);
      }
      nul.free();

      console.log(`✓ ${p.table}：归一 ${p.normalize.length} 行，置空 ${p.nullify.length} 行`);
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
  let ok = true;
  console.log('\n=== 迁移后复核 ===');
  for (const t of TARGETS) {
    const total = queryOne(verify, `SELECT COUNT(*) AS c FROM "${t.table}"`).c;
    const nonNull = queryOne(verify, `SELECT COUNT(*) AS c FROM "${t.table}" WHERE ${t.idCol} IS NOT NULL`).c;
    const hitEmp = queryOne(
      verify,
      `SELECT COUNT(*) AS c FROM "${t.table}" o JOIN employees e ON e.id = o.${t.idCol}`,
    ).c;
    const stray = queryOne(
      verify,
      `SELECT COUNT(*) AS c FROM "${t.table}" o
        WHERE o.${t.idCol} IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = o.${t.idCol})`,
    ).c;
    const good = hitEmp === nonNull && stray === 0;
    if (!good) ok = false;
    console.log(`  ${good ? '✅' : '❌'} ${t.table}：总 ${total}；非空 id ${nonNull}，` +
      `其中命中 employees ${hitEmp}，游离（非员工 id）${stray}；置空 ${total - nonNull} 行`);
  }
  verify.close();
  console.log(ok ? '\n✓ 复核通过（非空 id 全部是 employees.id）' : '\n✗ 复核不通过');
  if (!ok) process.exit(2);
})().catch((err) => {
  console.error('✗ 脚本异常：', err);
  process.exit(1);
});
