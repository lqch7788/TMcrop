/**
 * 管理员角色判定（2026-10-26 单一真相源）
 *
 * 背景：
 *   「哪些 role_code 算管理员」此前在 4 个文件里各写一份，且口径不一致：
 *     - middleware/processPermission.ts → ['admin','administrators','super_admin']
 *     - lib/dataScope.ts              → ['admin','administrators','super_admin']
 *     - routes/authority.ts (my-permissions / check-authority)
 *                                  → 只认 ['admin','administrators']（漏 super_admin）
 *     - routes/userBasePermissions.ts → 只认 ['admin','administrators']（漏 super_admin）
 *
 *   后果：某用户角色是 super_admin 时，后端 requireAdminRole / requireProcessPermission
 *   全部放行，但前端 useAuthStore.isAdmin（来自 my-permissions）恒为 false
 *   → 「后端放行、前端拦」的错配：菜单全空、按钮全隐藏，API 却还能调。
 *
 * 现在统一走这里。
 */
import { getDatabase } from '../db/index';

/** 视为管理员的角色码（小写比较） */
export const ADMIN_ROLE_CODES = ['admin', 'administrators', 'super_admin'] as const;

/** 单个角色码是否算管理员 */
export function isAdminRoleCode(roleCode: string | null | undefined): boolean {
  if (!roleCode) return false;
  return (ADMIN_ROLE_CODES as readonly string[]).includes(String(roleCode).toLowerCase());
}

/**
 * 取用户的全部角色码（已过滤停用角色）
 *
 * @param userOid 用户 OID
 * @param includeInactive true 时不过滤 roles.status（用于排查停用角色导致的权限不一致）
 */
export function getUserRoleCodes(userOid: string, includeInactive = false): string[] {
  if (!userOid) return [];
  const db = getDatabase();
  const sql = includeInactive
    ? `SELECT r.role_code FROM user_roles ur JOIN roles r ON r.oid = ur.role_oid WHERE ur.user_oid = ?`
    : `SELECT r.role_code FROM user_roles ur JOIN roles r ON r.oid = ur.role_oid
       WHERE ur.user_oid = ? AND (r.status IS NULL OR r.status = 'active')`;
  const st = db.prepare(sql);
  st.bind([userOid]);
  const codes: string[] = [];
  while (st.step()) {
    codes.push(String((st.getAsObject() as { role_code: string }).role_code || ''));
  }
  st.free();
  return codes;
}

/**
 * 判断用户是否为管理员
 *
 * @param userOid 用户 OID
 * @param includeInactive true 时把停用角色也算进来（排查用）
 */
export function isAdminUserByRoleCode(userOid: string, includeInactive = false): boolean {
  return getUserRoleCodes(userOid, includeInactive).some(isAdminRoleCode);
}
