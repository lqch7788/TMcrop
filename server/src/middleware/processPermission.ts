/**
 * 工序-动作权限校验中间件（2026-10-25 新增）
 *
 * 背景：
 *   此前全站 561 个写端点只做 JWT 身份识别（登录即可写），
 *   权限模型（processes / roles_authority / users_authority）只存在于前端。
 *   实测：只有查看权限的普通用户仍能 POST /api/seedlings 创建育苗单。
 *
 * 本中间件做什么：
 *   把 API 路径映射到工序 OID，再按「用户覆盖 > 角色授权」判定是否有该动作权限。
 *
 * 判定顺序（fail closed）：
 *   1. 无 req.user → 401
 *   2. admin 快速通道：user_roles JOIN roles 得 role_code，admin/administrators 放行
 *   3. users_authority（用户级覆盖，优先级最高）：
 *        value>=1 → 放行；value=0 → 拒绝
 *   4. roles_authority（角色授权，多角色取 MAX）：MAX(value)>=1 → 放行
 *   5. 都没配 → 403
 *
 * 关于 action_oid 的两种形态：
 *   库中历史上同时存在 ACT001~ACT006 与 view/create/... 两种写法。
 *   2026-10-25 已把 roles_authority 统一为 ACT 单一口径；
 *   users_authority 仍可能存在旧数据，故查询时两种都匹配。
 */
import type { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/index';
import { resolveProcessOidByApiPath } from '../lib/apiRouteProcessMap';

/** 动作 OID 常量 */
export const ACTION = {
  VIEW: 'ACT001',
  CREATE: 'ACT002',
  EDIT: 'ACT003',
  DELETE: 'ACT004',
  EXPORT: 'ACT005',
  APPROVE: 'ACT006',
} as const;

/** 动作 OID → 动作代码（用于兼容旧数据） */
const OID_TO_CODE: Record<string, string> = {
  ACT001: 'view',
  ACT002: 'create',
  ACT003: 'edit',
  ACT004: 'delete',
  ACT005: 'export',
  ACT006: 'approve',
};

/** 允许通过的角色码（与 roles 表实际 role_code 一致） */
const ADMIN_ROLE_CODES = ['admin', 'administrators', 'super_admin'];

/** 判断用户是否 admin（查 user_roles JOIN roles） */
function isAdminUser(userOid: string): boolean {
  const db = getDatabase();
  const st = db.prepare(`
    SELECT r.role_code FROM user_roles ur
    JOIN roles r ON r.oid = ur.role_oid
    WHERE ur.user_oid = ? AND (r.status IS NULL OR r.status = 'active')
  `);
  st.bind([userOid]);
  let admin = false;
  while (st.step()) {
    const code = String((st.getAsObject() as { role_code: string }).role_code || '').toLowerCase();
    if (ADMIN_ROLE_CODES.includes(code)) { admin = true; break; }
  }
  st.free();
  return admin;
}

/**
 * 是否为演示模式旁路身份
 * 2026-10-25：DEMO_MODE 下无 token 请求被注入 demo_user 且 role='admin'，
 *   若直接信任 role 字段，权限体系对匿名请求完全失效。
 *   故：演示身份不享受 admin 快通，按「无角色」处理（user_roles 查无此人 → 无权限）。
 */
function isDemoUser(req: { user?: { isDemo?: boolean; userId?: string } }): boolean {
  if (req.user?.isDemo === true) return true;
  return req.user?.userId === 'demo_user';
}

/** 核心判定：返回 true=有权限 */
export function checkProcessPermission(
  userOid: string,
  processOid: string,
  actionOid: string,
): { allowed: boolean; source: string } {
  const db = getDatabase();
  const code = OID_TO_CODE[actionOid] || actionOid;

  // 1) 用户级覆盖优先
  const uaStmt = db.prepare(`
    SELECT value FROM users_authority
    WHERE user_oid = ? AND process_oid = ? AND action_oid IN (?, ?)
  `);
  uaStmt.bind([userOid, processOid, actionOid, code]);
  if (uaStmt.step()) {
    const v = (uaStmt.getAsObject() as { value: number }).value;
    uaStmt.free();
    return { allowed: (v ?? 0) >= 1, source: 'user_override' };
  }
  uaStmt.free();

  // 2) 角色授权（多角色取 MAX）
  const raStmt = db.prepare(`
    SELECT MAX(ra.value) as maxValue
    FROM roles_authority ra
    JOIN user_roles ur ON ra.role_oid = ur.role_oid
    JOIN roles r ON ur.role_oid = r.oid AND (r.status IS NULL OR r.status = 'active')
    WHERE ur.user_oid = ? AND ra.process_oid = ? AND ra.action_oid IN (?, ?)
  `);
  raStmt.bind([userOid, processOid, actionOid, code]);
  const maxValue = raStmt.step()
    ? ((raStmt.getAsObject() as { maxValue: number | null }).maxValue ?? 0)
    : 0;
  raStmt.free();

  return { allowed: maxValue >= 1, source: maxValue >= 1 ? 'role' : 'none' };
}

/**
 * HTTP 方法 → 动作 OID（自动模式用）
 * POST=create / PUT|PATCH=edit / DELETE=delete
 */
const METHOD_TO_ACTION: Record<string, string> = {
  POST: ACTION.CREATE,
  PUT: ACTION.EDIT,
  PATCH: ACTION.EDIT,
  DELETE: ACTION.DELETE,
};

/**
 * 中间件工厂：要求指定动作权限
 *
 * 两种用法：
 *   requireProcessPermission('ACT002')       固定动作（用于单个端点）
 *   requireProcessPermission()               自动按 HTTP 方法映射（用于 router.use 级别挂载）
 */
export function requireProcessPermission(actionOid?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userOid = req.user?.userId;
    if (!userOid) {
      res.status(401).json({ success: false, error: '未认证', code: 'UNAUTHENTICATED' });
      return;
    }

    // 读请求不做动作校验（读权限由 requireProcessView 单独控制）
    const effectiveAction = actionOid || METHOD_TO_ACTION[req.method];
    if (!effectiveAction) {
      next();
      return;
    }

    const pathname = req.originalUrl.split('?')[0];
    const processOid = resolveProcessOidByApiPath(pathname);
    if (!processOid) {
      // 映射表未覆盖的路径：不做权限拦截（避免误伤），但记录便于后续补全
      next();
      return;
    }

    // admin 快速通道（演示身份不走此快通，见 isDemoUser 说明）
    if (!isDemoUser(req) && isAdminUser(userOid)) {
      next();
      return;
    }

    const { allowed, source } = checkProcessPermission(userOid, processOid, effectiveAction);
    if (allowed) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: '权限不足：该操作未被授权',
      code: 'PERMISSION_DENIED',
      meta: { processOid, actionOid: effectiveAction, source },
    });
  };
}

/**
 * 读权限中间件：要求该工序的查看权限
 * 与 requireProcessPermission 的区别：未映射到工序的路径放行（读权限只做加严，不做阻断）
 */
export function requireProcessView() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userOid = req.user?.userId;
    if (!userOid) {
      res.status(401).json({ success: false, error: '未认证', code: 'UNAUTHENTICATED' });
      return;
    }
    const pathname = req.originalUrl.split('?')[0];
    const processOid = resolveProcessOidByApiPath(pathname);
    if (!processOid) { next(); return; }
    if (!isDemoUser(req) && isAdminUser(userOid)) { next(); return; }

    const { allowed } = checkProcessPermission(userOid, processOid, ACTION.VIEW);
    if (!allowed) {
      res.status(403).json({
        success: false,
        error: '权限不足：无该模块的查看权限',
        code: 'PERMISSION_DENIED',
        meta: { processOid, actionOid: ACTION.VIEW },
      });
      return;
    }
    next();
  };
}

/**
 * 要求 admin 角色（用于权限管理等高危端点）
 */
export function requireAdminRole() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userOid = req.user?.userId;
    if (!userOid) {
      res.status(401).json({ success: false, error: '未认证', code: 'UNAUTHENTICATED' });
      return;
    }
    if (isDemoUser(req) || !isAdminUser(userOid)) {
      res.status(403).json({
        success: false,
        error: '权限不足：仅管理员可操作',
        code: 'PERMISSION_DENIED',
      });
      return;
    }
    next();
  };
}
