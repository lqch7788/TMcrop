/**
 * 员工身份归一 —— 集成测试（2026-10-24）
 *
 * 与 employeeIdentity.test.ts（假库、只验规则）互补：这里用**真实 sql.js + 真实表结构**
 * 验证迁移后的数据能真正被归一：
 *
 *   场景：commit 2b382ba0 把农事任务执行人统一为 users.id（'user-admin'），
 *         而 farm_task_schedules.worker_id 外键指向 employees(id)。
 *         迁移（E1 Task 2/3）给 users 加了 employee_id 列并建了 3 个真实员工档案，
 *         于是 'user-admin' → users.employee_id → 'EMP_007' 这条确定性路径必须成立。
 *
 * 用真实引擎的意义：假库无法发现列名写错、JOIN 写错、status 取值不符这类问题
 *   （迁移脚本第一次执行就因 users.updated_at 写成 update_time 而失败）。
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import path from 'path';
import initSqlJs from 'sql.js';

/** 真实数据库实例（在 beforeAll 里建好，供被 mock 的 getDatabase 返回） */
let realDb: any = null;

vi.mock('../db', () => ({
  getDatabase: () => realDb,
  saveDatabase: () => {},
}));

import { resolveEmployeeIdentity } from '../lib/employeeIdentity';
import { resolveEmployeeId } from '../services/farmTaskScheduleService';

/**
 * 建一个与生产库同形状的内存库，并置于「迁移已完成」的状态
 */
beforeAll(async () => {
  const SQL = await initSqlJs({
    locateFile: (f: string) => path.join(__dirname, '../../node_modules/sql.js/dist', f),
  });
  const db = new SQL.Database();

  // —— 与生产库一致的表结构 ——
  db.run(`
    CREATE TABLE employees (
      id TEXT PRIMARY KEY,
      employee_code TEXT NOT NULL,
      name TEXT NOT NULL,
      gender TEXT, phone TEXT, id_card TEXT,
      position_id TEXT, position_name TEXT, department_id TEXT, department_name TEXT,
      employee_type TEXT, hire_date TEXT, status TEXT, skills TEXT, remarks TEXT,
      create_by TEXT, create_time TEXT, update_time TEXT,
      leave_date TEXT, leave_reason TEXT, resigned_at TEXT, transferred_at TEXT,
      approval_code TEXT, hourly_rate REAL, tenant_id INTEGER NOT NULL
    )`);
  // users：迁移后多了 employee_id 列
  db.run(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT,
      real_name TEXT,
      org_oid TEXT, org_name TEXT, department_oid TEXT, department_name TEXT,
      position TEXT, email TEXT, phone TEXT, avatar TEXT,
      status TEXT DEFAULT 'active',
      employee_id TEXT,
      last_login TEXT,
      created_at TEXT, updated_at TEXT
    )`);

  // —— 迁移后的存量数据 ——
  // 原有 6 个员工档案
  for (const e of [
    ['EMP_001', 'EMP001', '张三', '生产部', '生产组长'],
    ['EMP_002', 'EMP002', '李四', '技术部', '农艺师'],
    ['EMP_003', 'EMP003', '王五', '生产部', '生产组长'],
    ['EMP_004', 'EMP004', '赵六', '质量部', '质检员'],
    ['EMP_005', 'EMP005', '钱七', '仓储部', '仓库管理员'],
    ['EMP_006', 'EMP006', '孙八', '人事部', '人事专员'],
  ]) {
    db.run(
      `INSERT INTO employees (id, employee_code, name, department_name, position_name,
        employee_type, hire_date, status, tenant_id)
       VALUES (?, ?, ?, ?, ?, '正式', '2024-01-01', 'active', 1)`,
      e,
    );
  }
  // E1 Task 3 新建的 3 个真实员工档案
  for (const e of [
    ['EMP_007', 'EMP26100001', '陆启闯', '管理层', '系统管理员'],
    ['EMP_008', 'EMP26100002', '张俊生', '生产部', '生产经理'],
    ['EMP_009', 'EMP26100003', '王建国', '生产部', '农艺师'],
  ]) {
    db.run(
      `INSERT INTO employees (id, employee_code, name, department_name, position_name,
        employee_type, hire_date, status, tenant_id)
       VALUES (?, ?, ?, ?, ?, '正式', '2026-05-20', 'active', 1)`,
      e,
    );
  }
  // 5 个登录账号；3 个已挂靠档案，2 个访客无档案
  const users: [string, string, string, string | null][] = [
    ['user-admin', '陆启闯', '管理层', 'EMP_007'],
    ['user-manager', '张俊生', '生产部', 'EMP_008'],
    ['user-regular', '王建国', '生产部', 'EMP_009'],
    ['USER_ID_1', '访客01', null, null],
    ['USER_ID_2', '访客02', null, null],
  ];
  for (const [id, name, dept, empId] of users) {
    db.run(
      `INSERT INTO users (id, oid, username, real_name, department_name, position,
        status, employee_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, '2026-05-20T08:00:00.000Z', '2026-05-20T08:00:00.000Z')`,
      [id, 'oid-' + id, name, name, dept, dept ? '职位' : null, empId],
    );
  }

  realDb = db;
});

describe('resolveEmployeeIdentity —— 真实 sql.js 集成', () => {
  it('users.id 能确定性归一到 employees.id（迁移后的核心路径）', () => {
    const r = resolveEmployeeIdentity('user-admin');
    expect(r).toEqual({ employeeId: 'EMP_007', name: '陆启闯', matchedBy: 'user_employee_id' });
  });

  it('三个真实账号都能归一到各自档案', () => {
    expect(resolveEmployeeIdentity('user-manager')?.employeeId).toBe('EMP_008');
    expect(resolveEmployeeIdentity('user-regular')?.employeeId).toBe('EMP_009');
  });

  it('访客账号（employee_id 为 NULL）归一失败 → null（调用方据此不写库）', () => {
    expect(resolveEmployeeIdentity('USER_ID_1')).toBeNull();
    expect(resolveEmployeeIdentity('USER_ID_2')).toBeNull();
  });

  it('employees.id 直引仍优先于账号路径', () => {
    const r = resolveEmployeeIdentity('EMP_001');
    expect(r).toEqual({ employeeId: 'EMP_001', name: '张三', matchedBy: 'employee_id' });
  });

  it('姓名兜底在真实数据上命中唯一员工', () => {
    const r = resolveEmployeeIdentity('EMP_UNKNOWN', '李四');
    expect(r).toEqual({ employeeId: 'EMP_002', name: '李四', matchedBy: 'name' });
  });

  it('登录账号姓名在 employees 里也命中同一档案（两条路径结果一致）', () => {
    const byId = resolveEmployeeIdentity('user-admin');
    const byName = resolveEmployeeIdentity('EMP_98404', '陆启闯');
    expect(byName?.employeeId).toBe(byId?.employeeId);
  });
});

describe('resolveEmployeeId（服务层包装器）—— 委托是否真的生效', () => {
  it('accounts 侧标识能归一到 employees.id（证明已委托公共工具，而非旧的按姓名匹配）', async () => {
    const r = await resolveEmployeeId('user-admin', '陆启闯');
    expect(r).toEqual({ id: 'EMP_007', name: '陆启闯' });
  });

  it('访客账号返回 null（调用方据此跳过写库）', async () => {
    expect(await resolveEmployeeId('USER_ID_1', '访客01')).toBeNull();
  });

  it('employees.id 直引保持原有行为', async () => {
    expect(await resolveEmployeeId('EMP_003', '')).toEqual({ id: 'EMP_003', name: '王五' });
  });

  it('旧行为回归点：账号存在但无档案时，姓名恰好命中唯一员工才可兜底', async () => {
    // 旧实现用 LIMIT 1，多个同名时随机挑一个；新实现要求唯一命中
    expect(await resolveEmployeeId('USER_ID_2', '访客02')).toBeNull();
  });
});
