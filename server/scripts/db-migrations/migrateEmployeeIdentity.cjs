/**
 * 员工身份建模迁移（2026-10-24 · 员工身份管理 E1 / Task 3）
 *
 * 背景
 *   全站并存 5 套互不相通的员工 ID 空间。2026-10-24 已定调（决策 D-A/D-B/D-C）：
 *   · D-A 唯一员工主数据源 = employees（员工档案）
 *   · D-B users（登录账号）↔ employees 为 1:N，通过新增的 users.employee_id 挂靠，
 *     该列可空（允许"有档案无账号"的纯现场工人）
 *   · D-C 补全部真实员工档案：陆启闯 / 张俊生 / 王建国（employees 6 → 9 人），
 *     武侠人名 mock（W001/S001/EMP_63279 等）属 E2 归档范围，本脚本不碰
 *
 * 本脚本做两件事
 *   1. users 表加 employee_id 列 + 索引（老库；新库由 schema.ts 的 CREATE TABLE 直接带上）
 *   2. 建 3 个真实员工档案，并把 3 个真实登录账号挂到对应档案上
 *
 * 用法
 *   node server/scripts/db-migrations/migrateEmployeeIdentity.cjs --dry-run   # 只统计，不写盘
 *   node server/scripts/db-migrations/migrateEmployeeIdentity.cjs --apply     # 执行（必须先停后端）
 *
 * ⚠️ 必须先停后端服务
 *   后端用 sql.js（内存快照），运行中会把内存整库写回磁盘，直接改盘会被覆盖。
 *   脚本检测到 3001 端口在监听时拒绝执行 --apply。
 *
 * 幂等性
 *   · 加列：已存在则跳过
 *   · 建档：employees.id 已存在且内容一致 → 跳过；已存在但内容不一致 → 报错退出（不覆盖）
 *   · 回填：users.employee_id 已非空且一致 → 跳过
 *   可安全重复执行。
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const net = require('net');

/**
 * 数据库路径
 * 默认指向生产库；可用环境变量 YUANXINGTU_DB_PATH 指向其它库（测试用）
 * 指向非默认库时**跳过 3001 端口停服检查** —— 生产库保护不因测试而放松
 */
const DB_PATH_OVERRIDE = process.env.YUANXINGTU_DB_PATH;
const DB_PATH = DB_PATH_OVERRIDE
  ? path.resolve(DB_PATH_OVERRIDE)
  : path.join(__dirname, '../../data/yuanxingtu.db');
const IS_PRODUCTION_DB = !DB_PATH_OVERRIDE;
const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backups');

/**
 * 待建档的真实员工（决策 D-C）
 * 部门/岗位优先取登录账号上的组织信息，取不到时用 fallback
 */
const EMPLOYEE_SEEDS = [
  {
    id: 'EMP_007',
    employeeCode: 'EMP26100001',
    userId: 'user-admin',
    deptFallback: '管理层',
    positionFallback: '系统管理员',
  },
  {
    id: 'EMP_008',
    employeeCode: 'EMP26100002',
    userId: 'user-manager',
    deptFallback: '生产部',
    positionFallback: '生产经理',
  },
  {
    id: 'EMP_009',
    employeeCode: 'EMP26100003',
    userId: 'user-regular',
    deptFallback: '生产部',
    positionFallback: '农艺师',
  },
];

/** 员工档案的固定属性（与现有 6 条 employees 记录同口径） */
const EMPLOYEE_TYPE = '正式';
const EMPLOYEE_STATUS = 'active';
const TENANT_ID = 1;
const CREATE_BY = 'migration';

/** 端口是否被监听（判断后端是否在跑） */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.setTimeout(800);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

/** 读单列值（sql.js prepare/step 形态） */
function queryOne(db, sql, params) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    if (stmt.step()) return stmt.getAsObject();
    return null;
  } finally {
    stmt.free();
  }
}

/** 读多行 */
function queryAll(db, sql, params) {
  const stmt = db.prepare(sql);
  const rows = [];
  try {
    stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

/** 表是否存在 */
function tableExists(db, name) {
  const r = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = '" + name + "'",
  );
  return !!(r && r[0] && r[0].values && r[0].values.length > 0);
}

/** 列是否存在 */
function columnExists(db, table, column) {
  const r = db.exec('PRAGMA table_info(' + table + ')');
  if (!r || !r[0]) return false;
  const nameIdx = r[0].columns.indexOf('name');
  if (nameIdx < 0) return false;
  return r[0].values.some((row) => row[nameIdx] === column);
}

/** 取今天日期（本地时区，不用 toISOString —— UTC bug） */
function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

(async () => {
  const isApply = process.argv.includes('--apply');
  const isDryRun = process.argv.includes('--dry-run') || !isApply;

  if (!fs.existsSync(DB_PATH)) {
    console.error('✗ 数据库不存在：' + DB_PATH);
    process.exit(1);
  }

  // ---- 停服检查（仅 --apply，且仅对生产库）----
  if (isApply && IS_PRODUCTION_DB) {
    const running = await isPortInUse(3001);
    if (running) {
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

  // ---- 前置体检 ----
  if (!tableExists(db, 'employees') || !tableExists(db, 'users')) {
    console.error('✗ 缺少 employees 或 users 表，终止。');
    db.close();
    process.exit(1);
  }

  const hasColumn = columnExists(db, 'users', 'employee_id');
  const empCountBefore = queryOne(db, 'SELECT COUNT(*) AS c FROM employees').c;
  const userCountBefore = queryOne(db, 'SELECT COUNT(*) AS c FROM users').c;
  const teamMembersBefore = queryOne(db, 'SELECT COUNT(*) AS c FROM team_members').c;
  const teamOrphansBefore = queryOne(
    db,
    `SELECT COUNT(*) AS c FROM team_members tm
      WHERE NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = tm.team_id)
         OR NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = tm.worker_id)`,
  ).c;

  // ---- 逐个种子员工计算迁移计划 ----
  const plan = [];
  for (const seed of EMPLOYEE_SEEDS) {
    const user = queryOne(
      db,
      'SELECT id, real_name, username, department_name, position, created_at, status FROM users WHERE id = ?',
      [seed.userId],
    );
    if (!user) {
      console.error('✗ 登录账号不存在，终止：' + seed.userId);
      db.close();
      process.exit(1);
    }
    const existing = queryOne(
      db,
      'SELECT id, name, employee_code, department_name, position_name FROM employees WHERE id = ?',
      [seed.id],
    );
    const name = user.real_name || user.username || '';
    const dept = user.department_name || seed.deptFallback;
    const position = user.position || seed.positionFallback;
    const hireDate =
      user.created_at && String(user.created_at).slice(0, 10).length === 10
        ? String(user.created_at).slice(0, 10)
        : todayLocal();

    // 已存在但内容对不上 → 拒绝覆盖，交人工判断
    if (existing && existing.name !== name) {
      console.error('✗ 目标 id 已被占用且内容不一致，终止（不覆盖）：');
      console.error('  id=' + seed.id + ' 库内姓名=' + existing.name + ' 期望姓名=' + name);
      db.close();
      process.exit(1);
    }

    plan.push({
      seed,
      user,
      name,
      dept,
      position,
      hireDate,
      action: existing ? 'skip-existing' : 'insert',
      existing: existing || null,
    });
  }

  console.log(isApply ? '=== 执行迁移 ===' : '=== 预演（--dry-run，不写盘）===');
  console.log('users.employee_id 列：' + (hasColumn ? '已存在（跳过加列）' : '不存在 → 需要 ALTER TABLE 添加'));
  console.log('employees 行数：' + empCountBefore + ' → 预计 ' + (empCountBefore + plan.filter((p) => p.action === 'insert').length));
  console.log('users 行数：' + userCountBefore + '（不变）');
  console.log('team_members 行数：' + teamMembersBefore + '，当前孤儿数：' + teamOrphansBefore + '（本脚本不触碰）\n');

  console.log('迁移计划：');
  for (const p of plan) {
    console.log(
      '  ' +
        p.action +
        '  ' +
        p.seed.id +
        '  ' +
        p.name +
        '  工号=' +
        p.seed.employeeCode +
        '  ' +
        p.dept +
        '/' +
        p.position +
        '  ← 账号 ' +
        p.seed.userId,
    );
  }
  console.log('');

  if (!isApply) {
    console.log('预演结束。确认无误后加 --apply 执行（需先停后端）。');
    db.close();
    return;
  }

  // ---- 备份 ----
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, 'yuanxingtu.db.bak-employee-identity-' + stamp);
  fs.copyFileSync(DB_PATH, backupPath);
  console.log('✓ 已备份到 ' + path.relative(process.cwd(), backupPath) + '\n');

  // ---- 执行（单事务）----
  const now = new Date().toISOString();
  db.run('BEGIN');
  try {
    // 1. 加列（幂等）
    if (!hasColumn) {
      db.run('ALTER TABLE users ADD COLUMN employee_id TEXT');
      console.log('✓ users 表已添加 employee_id 列');
    }
    // 2. 索引（幂等）
    db.run('CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id)');
    console.log('✓ idx_users_employee_id 索引已就绪');

    // 3. 建档（幂等；已存在且一致则跳过）
    for (const p of plan) {
      if (p.action === 'skip-existing') {
        console.log('· 跳过（已存在且一致）：' + p.seed.id + ' ' + p.name);
        continue;
      }
      db.run(
        `INSERT INTO employees
           (id, employee_code, name, position_name, department_name, employee_type,
            hire_date, status, create_by, create_time, update_time, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.seed.id,
          p.seed.employeeCode,
          p.name,
          p.position,
          p.dept,
          EMPLOYEE_TYPE,
          p.hireDate,
          EMPLOYEE_STATUS,
          CREATE_BY,
          now,
          now,
          TENANT_ID,
        ],
      );
      console.log('✓ 已建档：' + p.seed.id + ' ' + p.name + '（' + p.dept + '/' + p.position + '）');
    }

    // 4. 回填 users.employee_id（幂等；已非空则不覆盖）
    //    注意：users 表的时间列是 updated_at（不是 update_time）——
    //    employees 用 create_time/update_time，users 用 created_at/updated_at，两表命名不同
    for (const p of plan) {
      const res = db.run(
        `UPDATE users SET employee_id = ?, updated_at = ?
          WHERE id = ? AND (employee_id IS NULL OR employee_id = '' OR employee_id = ?)`,
        [p.seed.id, now, p.seed.userId, p.seed.id],
      );
      if (res.changes > 0) {
        console.log('✓ 已挂靠：' + p.seed.userId + ' → ' + p.seed.id);
      } else {
        const cur = queryOne(db, 'SELECT employee_id FROM users WHERE id = ?', [p.seed.userId]);
        if (cur && cur.employee_id === p.seed.id) {
          console.log('· 跳过（已挂靠）：' + p.seed.userId + ' → ' + p.seed.id);
        } else {
          console.error('✗ 回填异常：' + p.seed.userId + ' 当前 employee_id=' + (cur && cur.employee_id));
          throw new Error('回填 users.employee_id 异常');
        }
      }
    }
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    console.error('✗ 迁移失败，已回滚：', err.message);
    db.close();
    process.exit(1);
  }

  // ---- 落盘 ----
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.close();
  console.log('\n✓ 已写盘。');

  // ---- 复核 ----
  const verify = new SQL.Database(fs.readFileSync(DB_PATH));
  const empAfter = queryOne(verify, 'SELECT COUNT(*) AS c FROM employees').c;
  const linked = queryOne(
    verify,
    "SELECT COUNT(*) AS c FROM users WHERE employee_id IS NOT NULL AND employee_id <> ''",
  ).c;
  const dangling = queryOne(
    verify,
    `SELECT COUNT(*) AS c FROM users u
      WHERE u.employee_id IS NOT NULL AND u.employee_id <> ''
        AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = u.employee_id)`,
  ).c;
  const teamMembersAfter = queryOne(verify, 'SELECT COUNT(*) AS c FROM team_members').c;
  const teamOrphansAfter = queryOne(
    verify,
    `SELECT COUNT(*) AS c FROM team_members tm
      WHERE NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = tm.team_id)
         OR NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = tm.worker_id)`,
  ).c;
  const links = queryAll(
    verify,
    `SELECT u.id AS userId, u.username AS username, u.employee_id AS employeeId,
            e.name AS employeeName, e.employee_code AS employeeCode, e.status AS employeeStatus
       FROM users u LEFT JOIN employees e ON e.id = u.employee_id
      ORDER BY u.id`,
  );
  verify.close();

  const report = {
    appliedAt: now,
    rowsBefore: { employees: empCountBefore, users: userCountBefore, teamMembers: teamMembersBefore },
    rowsAfter: { employees: empAfter, users: userCountBefore, teamMembers: teamMembersAfter },
    linkedUsers: linked,
    danglingLinks: dangling,
    teamOrphansBefore,
    teamOrphansAfter,
    createdEmployees: plan.filter((p) => p.action === 'insert').map((p) => p.seed.id),
    links,
  };
  const reportPath = path.join(
    path.dirname(DB_PATH),
    'employee-identity-report.' + stamp + '.json',
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('=== 迁移后复核 ===');
  console.log('  employees 行数 ' + empCountBefore + ' → ' + empAfter);
  console.log('  已挂靠账号数 ' + linked + '；悬挂引用（指向不存在的档案）' + dangling + ' 条');
  console.log('  team_members 行数 ' + teamMembersBefore + ' → ' + teamMembersAfter + '；孤儿 ' + teamOrphansBefore + ' → ' + teamOrphansAfter);
  console.log('  账号 → 档案映射：');
  for (const l of links) {
    console.log(
      '    ' +
        l.userId +
        ' (' +
        l.username +
        ') → ' +
        (l.employeeId ? l.employeeId + ' ' + l.employeeName + ' [' + l.employeeCode + ']' : '（无档案）'),
    );
  }
  console.log('  报告 → ' + reportPath);

  const ok =
    empAfter === empCountBefore + report.createdEmployees.length &&
    dangling === 0 &&
    teamMembersAfter === teamMembersBefore &&
    teamOrphansAfter === teamOrphansBefore;
  console.log(ok ? '\n✓ 复核通过' : '\n✗ 复核不通过');
  if (!ok) process.exit(2);
})().catch((err) => {
  console.error('✗ 脚本异常：', err);
  process.exit(1);
});
