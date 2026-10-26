/**
 * 数据范围解析（行级权限基础设施）
 *
 * 2026-10-25 新增。背景：
 *   权限体系此前只到「工序-动作」层（能不能进这个模块、能不能点这个按钮），
 *   没有「数据行级」（在这个模块里能看到哪些基地的数据）。
 *   两张表早已存在但从未被任何业务查询消费：
 *     - user_base_permissions（用户 → 基地，access_level: admin/readonly/none）
 *     - roles_data_authority（角色 → 组织）
 *
 * ⚠️ 当前实现边界（务必先读）：
 *   1. **只有 `user_base_permissions` 生效**。`roles_data_authority` 存的是
 *      `organizations.oid`，而数据过滤需要 `bases.oid`，两者是**不同的 ID 空间**
 *      （组织树里的「宁波北仑基地」是 ORG_xxx，基地主数据里是 base_xxx）。
 *      在两者统一之前，角色维度无法可靠换算 → 本模块显式返回 unsupported 原因。
 *   2. **不限制任何现有查询**。本模块只负责「解析范围」，是否应用由调用方决定。
 *      原因：实测业务表普遍缺少 base_oid 字段，greenhouse_id 存的是 "0" 或自由文本，
 *      强过滤会让绝大多数历史数据无法归属 → 普通用户瞬间看不到数据。
 *
 * 用法：
 *   const scope = resolveUserDataScope(userOid);
 *   if (scope.restricted) { ...按 scope.baseOids 过滤... }
 */
import { getDatabase } from '../db/index';
// 2026-10-26：管理员判定统一走 lib/adminRole.ts
import { isAdminUserByRoleCode } from './adminRole';

export interface DataScope {
  /** 是否受基地维度限制（false = 不限，可见全部） */
  restricted: boolean;
  /** 可见基地 OID 列表（restricted=false 时为空数组） */
  baseOids: string[];
  /** 范围来源 */
  source: 'admin' | 'user_base' | 'none';
  /** 人类可读说明（供前端展示 / 排障） */
  reason: string;
  /** 无法生效的数据源及原因（Fail Loud：不静默忽略已配置但未生效的权限） */
  unsupported: Array<{ source: string; detail: string }>;
}

/**
 * 判断用户是否为管理员角色
 * 2026-10-26：改用 lib/adminRole.ts 的统一实现（此前此处与 processPermission.ts 各写一份）
 */
export function isAdminUser(userOid: string): boolean {
  return isAdminUserByRoleCode(userOid);
}

/**
 * 解析用户的数据范围
 *
 * 判定顺序：
 *   1. admin → 不受限
 *   2. user_base_permissions 有 access_level != 'none' 的记录 → 按基地限制
 *   3. 都未配置 → 不受限（fail open，保持现有行为不被破坏）
 */
export function resolveUserDataScope(userOid: string): DataScope {
  const unsupported: Array<{ source: string; detail: string }> = [];

  if (!userOid) {
    return {
      restricted: false,
      baseOids: [],
      source: 'none',
      reason: '未提供用户标识，不做数据范围限制',
      unsupported,
    };
  }

  if (isAdminUser(userOid)) {
    return {
      restricted: false,
      baseOids: [],
      source: 'admin',
      reason: '管理员不受数据范围限制',
      unsupported,
    };
  }

  const db = getDatabase();

  // ① 用户级基地权限（唯一当前可生效的数据源）
  const baseStmt = db.prepare(`
    SELECT base_oid, COALESCE(access_level, 'admin') AS access_level
    FROM user_base_permissions
    WHERE user_oid = ? AND base_oid IS NOT NULL AND base_oid != ''
  `);
  baseStmt.bind([userOid]);
  const granted: string[] = [];
  while (baseStmt.step()) {
    const row = baseStmt.getAsObject() as { base_oid: string; access_level: string };
    if (String(row.access_level).toLowerCase() !== 'none') granted.push(row.base_oid);
  }
  baseStmt.free();

  if (granted.length > 0) {
    return {
      restricted: true,
      baseOids: [...new Set(granted)],
      source: 'user_base',
      reason: `按用户基地权限限制到 ${granted.length} 个基地`,
      unsupported,
    };
  }

  // ② 角色级组织权限 —— 已配置但换算不了，必须显式报告
  const roleStmt = db.prepare(`
    SELECT DISTINCT rda.org_oid
    FROM roles_data_authority rda
    JOIN user_roles ur ON rda.role_oid = ur.role_oid
    JOIN roles r ON ur.role_oid = r.oid AND (r.status IS NULL OR r.status = 'active')
    WHERE ur.user_oid = ? AND rda.org_oid IS NOT NULL AND rda.org_oid != ''
  `);
  roleStmt.bind([userOid]);
  const orgOids: string[] = [];
  while (roleStmt.step()) {
    orgOids.push((roleStmt.getAsObject() as { org_oid: string }).org_oid);
  }
  roleStmt.free();

  if (orgOids.length > 0) {
    unsupported.push({
      source: 'roles_data_authority',
      detail:
        `角色配置了 ${orgOids.length} 个组织范围（${orgOids.join(', ')}），但组织 OID 与基地 OID 是两套 ID 空间，` +
        `当前无法换算为基地范围。需先统一「组织树中的基地节点」与「bases 表主数据」的 ID，` +
        `否则该配置不生效。`,
    });
  }

  return {
    restricted: false,
    baseOids: [],
    source: 'none',
    reason:
      orgOids.length > 0
        ? '角色组织范围暂无法换算为基地范围，当前不做数据限制（详见 unsupported）'
        : '未配置数据范围，默认不限制',
    unsupported,
  };
}

/**
 * 判断某条数据是否在用户范围内
 * @param baseOid 数据行所属基地；为空表示「未归属」——按 outOfScopePolicy 处理
 * @param policy 未归属数据的处理策略：'allow'（默认，兼容现状）| 'deny'
 */
export function isBaseInScope(
  scope: DataScope,
  baseOid: string | null | undefined,
  policy: 'allow' | 'deny' = 'allow',
): boolean {
  if (!scope.restricted) return true;
  if (!baseOid) return policy === 'allow';
  return scope.baseOids.includes(baseOid);
}
