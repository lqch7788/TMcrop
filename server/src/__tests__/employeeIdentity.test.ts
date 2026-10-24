/**
 * 员工身份归一工具单测（2026-10-24）
 *
 * 覆盖 lib/employeeIdentity.resolveEmployeeIdentity 的三条判定分支与全部边界：
 *   1. 档案直引（employees.id）
 *   2. 登录账号 → 员工档案（users.id → users.employee_id → employees.id）
 *   3. 姓名兜底（唯一命中才用）
 *   4. 全部不命中 → null
 *
 * 用假 DB（按 SQL 文本分派）替代真实库，保证用例只验证归一规则本身，
 * 不受库内真实数据影响。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

/** 假 employees 行 */
interface FakeEmployee {
  id: string;
  name: string;
  status?: string;
}

/** 假 users 行 */
interface FakeUser {
  id: string;
  employee_id: string | null;
}

/** 假库配置 */
interface Fixture {
  employees: FakeEmployee[];
  users: FakeUser[];
  /** users 表是否已具备 employee_id 列（E1 Task 2 落地后为 true） */
  hasEmployeeIdColumn: boolean;
}

/** 在跑测试前替换 ../db 模块 */
const dbModule = {
  current: null as FakeDb | null,
};

vi.mock('../db', () => ({
  getDatabase: () => dbModule.current,
  saveDatabase: () => {},
}));

import { resolveEmployeeIdentity } from '../lib/employeeIdentity';

/**
 * SQL 分派（模块级函数，避免在 stmt 内使用 this）
 *
 * 只实现 resolveEmployeeIdentity 实际发出的三类查询，
 * 其它 SQL 一律抛错（防止工具改了 SQL 而测试没察觉）。
 */
function runQuery(fixture: Fixture, sql: string, params: unknown[]): Record<string, unknown>[] {
  const p0 = params[0] as string;

  // 分支 1：档案直引
  if (/FROM employees WHERE id = \?/i.test(sql)) {
    return fixture.employees
      .filter((e) => e.id === p0 && (e.status ?? 'active') === 'active')
      .map((e) => ({ id: e.id, name: e.name }));
  }

  // 分支 2：登录账号 → 员工档案
  if (/FROM users u/i.test(sql)) {
    const user = fixture.users.find((u) => u.id === p0);
    if (!user || !user.employee_id) return [];
    return fixture.employees
      .filter((e) => e.id === user.employee_id && (e.status ?? 'active') === 'active')
      .map((e) => ({ id: e.id, name: e.name }));
  }

  // 分支 3：姓名兜底
  if (/FROM employees WHERE name = \?/i.test(sql)) {
    return fixture.employees
      .filter((e) => e.name === p0 && (e.status ?? 'active') === 'active')
      .map((e) => ({ id: e.id, name: e.name }));
  }

  throw new Error(`[FakeDb] 未预期的 prepare: ${sql}`);
}

/**
 * 按 SQL 文本分派的假 sql.js 数据库
 *
 * 只实现 resolveEmployeeIdentity 实际发出的三类查询 + 一条 PRAGMA，
 * 其它 SQL 一律抛错（防止工具改了 SQL 而测试没察觉）。
 */
class FakeDb {
  constructor(private fixture: Fixture) {}

  exec(sql: string): { columns: string[]; values: unknown[][] }[] {
    if (/PRAGMA\s+table_info\(users\)/i.test(sql)) {
      const values: unknown[][] = [[0, 'id', 'TEXT', 0, null, 0]];
      if (this.fixture.hasEmployeeIdColumn) {
        values.push([1, 'employee_id', 'TEXT', 0, null, 0]);
      }
      return [{ columns: ['cid', 'name', 'type', 'notnull', 'dflt_value', 'pk'], values }];
    }
    throw new Error(`[FakeDb] 未预期的 exec: ${sql}`);
  }

  prepare(sql: string) {
    // 捕获夹具数据（非 this 别名），stmt 内的方法因此不依赖 this 绑定
    const fixture = this.fixture;
    let params: unknown[] = [];
    let rows: Record<string, unknown>[] = [];
    let computed = false;
    let cursor = 0;

    const stmt = {
      bind(p: unknown[]) {
        params = p;
        computed = false;
        return stmt;
      },
      // sql.js 语义：step() 前进游标，有行返回 true；行耗尽后恒返回 false
      step(): boolean {
        if (!computed) {
          rows = runQuery(fixture, sql, params);
          computed = true;
          cursor = 0;
        }
        if (cursor < rows.length) {
          cursor += 1;
          return true;
        }
        return false;
      },
      getAsObject(): Record<string, unknown> {
        return rows[cursor - 1];
      },
      free() {
        /* no-op */
      },
    };
    return stmt;
  }
}

/** 默认夹具：3 个在职员工 + 1 个离职员工 + 2 个账号 */
function defaultFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    employees: [
      { id: 'EMP_001', name: '张三' },
      { id: 'EMP_002', name: '李四' },
      { id: 'EMP_007', name: '陆启闯' },
      { id: 'EMP_099', name: '离职王', status: 'resigned' },
    ],
    users: [
      { id: 'user-admin', employee_id: 'EMP_007' },
      { id: 'visitor-01', employee_id: null },
    ],
    hasEmployeeIdColumn: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbModule.current = new FakeDb(defaultFixture());
});

describe('resolveEmployeeIdentity — 分支 1：档案直引', () => {
  it('传 employees.id → 返回该员工，matchedBy=employee_id', () => {
    const r = resolveEmployeeIdentity('EMP_001');
    expect(r).toEqual({ employeeId: 'EMP_001', name: '张三', matchedBy: 'employee_id' });
  });

  it('传入职状态非 active 的员工 ID → 返回 null', () => {
    expect(resolveEmployeeIdentity('EMP_099')).toBeNull();
  });

  it('传不存在的 ID 且无姓名 → 返回 null', () => {
    expect(resolveEmployeeIdentity('EMP_NOT_EXIST')).toBeNull();
  });
});

describe('resolveEmployeeIdentity — 分支 2：登录账号 → 员工档案', () => {
  it('传 users.id（有档案关联）→ 返回其关联员工，matchedBy=user_employee_id', () => {
    const r = resolveEmployeeIdentity('user-admin');
    expect(r).toEqual({ employeeId: 'EMP_007', name: '陆启闯', matchedBy: 'user_employee_id' });
  });

  it('传 users.id 但 employee_id 为 NULL（访客）→ 返回 null', () => {
    expect(resolveEmployeeIdentity('visitor-01')).toBeNull();
  });

  it('传 users.id 但其 employee_id 指向已不存在的档案 → 返回 null', () => {
    dbModule.current = new FakeDb(
      defaultFixture({ users: [{ id: 'user-ghost', employee_id: 'EMP_GONE' }] }),
    );
    expect(resolveEmployeeIdentity('user-ghost')).toBeNull();
  });

  it('users 表尚无 employee_id 列（E1 Task 2 落地前）→ 跳过该分支，退化为姓名兜底', () => {
    dbModule.current = new FakeDb(defaultFixture({ hasEmployeeIdColumn: false }));
    // 账号分支不可用 → 只靠姓名兜底
    const byName = resolveEmployeeIdentity('user-admin', '陆启闯');
    expect(byName).toEqual({ employeeId: 'EMP_007', name: '陆启闯', matchedBy: 'name' });
    // 无姓名兜底 → null
    expect(resolveEmployeeIdentity('user-admin')).toBeNull();
  });
});

describe('resolveEmployeeIdentity — 分支 3：姓名兜底', () => {
  it('未知 ID + 唯一重名 → 返回该员工，matchedBy=name', () => {
    const r = resolveEmployeeIdentity('EMP_63279', '李四');
    expect(r).toEqual({ employeeId: 'EMP_002', name: '李四', matchedBy: 'name' });
  });

  it('未知 ID + 多人重名 → 返回 null（不得随便挑一个）', () => {
    dbModule.current = new FakeDb(
      defaultFixture({
        employees: [
          { id: 'EMP_001', name: '同名' },
          { id: 'EMP_002', name: '同名' },
        ],
      }),
    );
    expect(resolveEmployeeIdentity('EMP_UNKNOWN', '同名')).toBeNull();
  });

  it('姓名对应的员工已离职 → 返回 null', () => {
    expect(resolveEmployeeIdentity('EMP_UNKNOWN', '离职王')).toBeNull();
  });

  it('档案直引命中时不再走姓名兜底（优先级 1 > 3）', () => {
    const r = resolveEmployeeIdentity('EMP_001', '陆启闯');
    expect(r?.matchedBy).toBe('employee_id');
    expect(r?.employeeId).toBe('EMP_001');
  });
});

describe('resolveEmployeeIdentity — 输入边界', () => {
  it('ID 与姓名都为空 → 返回 null', () => {
    expect(resolveEmployeeIdentity(null, null)).toBeNull();
    expect(resolveEmployeeIdentity('', '')).toBeNull();
    expect(resolveEmployeeIdentity(undefined, undefined)).toBeNull();
  });

  it('ID 与姓名都为空 → 不发起任何 DB 查询', () => {
    const spy = vi.spyOn(dbModule.current as unknown as FakeDb, 'prepare');
    resolveEmployeeIdentity('', '   ');
    expect(spy).not.toHaveBeenCalled();
  });

  it('空白字符视为未提供', () => {
    expect(resolveEmployeeIdentity('   ', '   ')).toBeNull();
  });

  it('ID 前后空白会被裁剪后再匹配', () => {
    const r = resolveEmployeeIdentity('  EMP_001  ');
    expect(r?.employeeId).toBe('EMP_001');
  });
});
