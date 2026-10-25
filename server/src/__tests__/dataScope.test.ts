/**
 * 数据范围解析单测（2026-10-25）
 *
 * 覆盖 lib/dataScope.resolveUserDataScope 的四条判定分支与全部边界：
 *   1. 管理员 → 不受限
 *   2. user_base_permissions 有授权 → 按基地限制
 *   3. 只有 roles_data_authority → 显式报告「无法换算」（Fail Loud）
 *   4. 都未配置 → 不受限（fail open，保持现有行为）
 *
 * 另覆盖 isBaseInScope 的三种输入（在范围内 / 不在范围内 / 未归属）。
 *
 * 用假 DB（按 SQL 文本分派）替代真实库，保证用例只验证判定规则本身。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

interface FakeRoleRow { role_code: string }
interface FakeBasePerm { base_oid: string; access_level: string | null }
interface FakeRoleOrg { org_oid: string }

interface Fixture {
  /** 用户的角色码 */
  roleCodes: string[];
  /** user_base_permissions 行 */
  basePerms: FakeBasePerm[];
  /** roles_data_authority 行（经 user_roles 关联后） */
  roleOrgs: FakeRoleOrg[];
}

const dbModule = { current: null as FakeDb | null };

vi.mock('../db', () => ({
  getDatabase: () => dbModule.current,
  saveDatabase: () => {},
}));

import { resolveUserDataScope, isBaseInScope } from '../lib/dataScope';

/**
 * SQL 分派
 * 只实现 resolveUserDataScope 实际发出的三类查询，其它一律抛错
 * （防止实现改了 SQL 而测试没察觉）。
 */
function runQuery(fixture: Fixture, sql: string): Record<string, unknown>[] {
  // 1) admin 判定
  if (/FROM user_roles ur\s+JOIN roles r/i.test(sql)) {
    return fixture.roleCodes.map((c) => ({ role_code: c }));
  }
  // 2) 用户基地权限
  if (/FROM user_base_permissions/i.test(sql)) {
    return fixture.basePerms.map((p) => ({
      base_oid: p.base_oid,
      access_level: p.access_level,
    }));
  }
  // 3) 角色组织范围
  if (/FROM roles_data_authority rda/i.test(sql)) {
    return fixture.roleOrgs.map((r) => ({ org_oid: r.org_oid }));
  }
  throw new Error(`[FakeDb] 未预期的 prepare: ${sql}`);
}

class FakeDb {
  constructor(private fixture: Fixture) {}

  exec(): { columns: string[]; values: unknown[][] }[] {
    throw new Error('[FakeDb] resolveUserDataScope 不应调用 exec');
  }

  prepare(sql: string) {
    const fixture = this.fixture;
    let params: unknown[] = [];
    let rows: Record<string, unknown>[] = [];
    let computed = false;
    let cursor = 0;

    return {
      bind(p: unknown[]) { params = p; },
      step() {
        if (!computed) {
          rows = runQuery(fixture, sql);
          computed = true;
          cursor = 0;
        }
        // sql.js 语义：游标只前进，不回绕
        if (cursor >= rows.length) return false;
        cursor++;
        return true;
      },
      getAsObject() { return rows[cursor - 1]; },
      free() {},
      run() {},
    };
  }
}

function setup(fixture: Partial<Fixture>) {
  dbModule.current = new FakeDb({
    roleCodes: fixture.roleCodes ?? [],
    basePerms: fixture.basePerms ?? [],
    roleOrgs: fixture.roleOrgs ?? [],
  });
}

beforeEach(() => { dbModule.current = null; });

describe('resolveUserDataScope', () => {
  it('空 userOid → 不限制（fail open）', () => {
    setup({});
    const s = resolveUserDataScope('');
    expect(s.restricted).toBe(false);
    expect(s.source).toBe('none');
  });

  it('管理员（admin）→ 不受限', () => {
    setup({ roleCodes: ['admin'] });
    const s = resolveUserDataScope('USER_ADMIN_001');
    expect(s.restricted).toBe(false);
    expect(s.source).toBe('admin');
    expect(s.reason).toContain('管理员');
  });

  it('管理员（administrators）→ 不受限', () => {
    setup({ roleCodes: ['administrators'] });
    expect(resolveUserDataScope('u1').restricted).toBe(false);
  });

  it('非管理员 + 有基地授权 → 按基地限制', () => {
    setup({
      roleCodes: ['farm_clerk'],
      basePerms: [
        { base_oid: 'base_A', access_level: 'admin' },
        { base_oid: 'base_B', access_level: 'readonly' },
      ],
    });
    const s = resolveUserDataScope('u1');
    expect(s.restricted).toBe(true);
    expect(s.source).toBe('user_base');
    expect(s.baseOids).toEqual(['base_A', 'base_B']);
  });

  it('access_level=none 的记录被排除（不视为授权）', () => {
    setup({
      roleCodes: ['user'],
      basePerms: [
        { base_oid: 'base_A', access_level: 'admin' },
        { base_oid: 'base_B', access_level: 'none' },
      ],
    });
    const s = resolveUserDataScope('u1');
    expect(s.restricted).toBe(true);
    expect(s.baseOids).toEqual(['base_A']);
  });

  it('只有 access_level=none → 不视为有基地授权', () => {
    setup({
      roleCodes: ['user'],
      basePerms: [{ base_oid: 'base_A', access_level: 'none' }],
    });
    const s = resolveUserDataScope('u1');
    expect(s.restricted).toBe(false);
  });

  it('access_level 为 null → 默认视为 admin（授权）', () => {
    setup({
      roleCodes: ['user'],
      basePerms: [{ base_oid: 'base_A', access_level: null }],
    });
    const s = resolveUserDataScope('u1');
    expect(s.restricted).toBe(true);
    expect(s.baseOids).toEqual(['base_A']);
  });

  it('基地授权去重', () => {
    setup({
      roleCodes: ['user'],
      basePerms: [
        { base_oid: 'base_A', access_level: 'admin' },
        { base_oid: 'base_A', access_level: 'admin' },
      ],
    });
    expect(resolveUserDataScope('u1').baseOids).toEqual(['base_A']);
  });

  it('只有角色组织范围 → 不限制，但显式报告 unsupported（Fail Loud）', () => {
    setup({
      roleCodes: ['manager'],
      roleOrgs: [{ org_oid: 'ORG002' }, { org_oid: 'ORG003' }],
    });
    const s = resolveUserDataScope('u1');
    expect(s.restricted).toBe(false);
    expect(s.unsupported).toHaveLength(1);
    expect(s.unsupported[0].source).toBe('roles_data_authority');
    expect(s.unsupported[0].detail).toContain('ORG002');
    expect(s.unsupported[0].detail).toContain('ID 空间');
  });

  it('基地授权优先于角色组织范围（有基地授权时不再报告 unsupported）', () => {
    setup({
      roleCodes: ['manager'],
      basePerms: [{ base_oid: 'base_A', access_level: 'admin' }],
      roleOrgs: [{ org_oid: 'ORG002' }],
    });
    const s = resolveUserDataScope('u1');
    expect(s.restricted).toBe(true);
    expect(s.unsupported).toHaveLength(0);
  });

  it('完全未配置 → 不限制', () => {
    setup({ roleCodes: ['viewer'] });
    const s = resolveUserDataScope('u1');
    expect(s.restricted).toBe(false);
    expect(s.source).toBe('none');
    expect(s.unsupported).toHaveLength(0);
  });
});

describe('isBaseInScope', () => {
  const unrestricted = resolveUserDataScope('') && {
    restricted: false, baseOids: [], source: 'none' as const, reason: '', unsupported: [],
  };
  const restricted = {
    restricted: true, baseOids: ['base_A'], source: 'user_base' as const, reason: '', unsupported: [],
  };

  it('不受限 → 任意基地都在范围内', () => {
    expect(isBaseInScope(unrestricted, 'base_X')).toBe(true);
    expect(isBaseInScope(unrestricted, null)).toBe(true);
  });

  it('受限 + 基地在范围内 → true', () => {
    expect(isBaseInScope(restricted, 'base_A')).toBe(true);
  });

  it('受限 + 基地不在范围内 → false', () => {
    expect(isBaseInScope(restricted, 'base_X')).toBe(false);
  });

  it('受限 + 未归属数据：默认放行（兼容现状）', () => {
    expect(isBaseInScope(restricted, null)).toBe(true);
    expect(isBaseInScope(restricted, '')).toBe(true);
  });

  it('受限 + 未归属数据：policy=deny 时拒绝', () => {
    expect(isBaseInScope(restricted, null, 'deny')).toBe(false);
    expect(isBaseInScope(restricted, undefined, 'deny')).toBe(false);
  });
});
