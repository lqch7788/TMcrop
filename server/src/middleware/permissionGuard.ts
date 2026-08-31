/**
 * v0.3 前置 5：RBAC 权限守卫中间件
 *
 * 用途：
 *   - 检查用户角色
 *   - 角色不足返回 403 Forbidden
 *
 * 4 个内置角色（v0.3）：
 *   - super_admin：所有 tenant + 所有功能
 *   - base_admin：本 tenant 所有功能
 *   - agronomist：本 tenant + 农艺相关
 *   - worker：仅自己的任务
 *
 * 原则（用户强制）：
 *   - 不删改现有 auth.ts
 *   - 仅新增中间件，不破坏现有任何 API 行为
 */

import { Request, Response, NextFunction } from 'express';

export type UserRole = 'super_admin' | 'base_admin' | 'agronomist' | 'worker' | 'admin';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 90,        // 兼容旧 admin（与 super_admin 等价）
  base_admin: 70,
  agronomist: 50,
  worker: 20,
};

/**
 * 权限守卫中间件
 *
 * 用法（在路由中）：
 *   import { permissionGuard } from '../middleware/permissionGuard';
 *   router.use(authenticate, permissionGuard(['super_admin', 'base_admin', 'agronomist']));
 *
 * @param allowedRoles 允许的角色列表
 */
export function permissionGuard(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req.user?.role as UserRole | undefined) ?? 'worker';

    if (allowedRoles.includes(userRole)) {
      next();
      return;
    }

    // 角色继承：super_admin 自动具备所有角色权限
    if (allowedRoles.some((r) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[r])) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: '权限不足',
      code: 'PERMISSION_DENIED',
      meta: {
        requiredRoles: allowedRoles,
        userRole,
      },
    });
  };
}

/**
 * 角色继承检查（独立函数）
 */
export function hasRole(userRole: UserRole | undefined, requiredRole: UserRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * 多角色检查
 */
export function hasAnyRole(userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.some((r) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[r]);
}

export default permissionGuard;
