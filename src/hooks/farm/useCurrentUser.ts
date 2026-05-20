/**
 * 当前用户信息Hook
 * 提供获取当前登录用户信息的功能
 * 用于替代硬编码的审核员、创建人等字段
 */

import { useState, useEffect, useCallback } from 'react';
import { storageGet } from '../../lib/storageService';

// 当前用户信息接口
export interface CurrentUser {
  /** 用户ID */
  userId: string;
  /** 用户名 */
  username: string;
  /** 真实姓名 */
  realName: string;
  /** 部门 */
  department?: string;
  /** 角色列表 */
  roles: string[];
  /** 是否是管理员 */
  isAdmin: boolean;
}

/**
 * 获取当前用户信息
 * 从localStorage中读取用户信息
 */
export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
    // 初始化时从localStorage读取
    const username = storageGet('username') || '';
    const userId = storageGet('userId') || '';
    const realName = storageGet('realName') || username || '陆启闯';

    // 获取角色信息
    let roles: string[] = [];
    try {
      const rolesStr = storageGet('userRoles');
      if (rolesStr) {
        roles = JSON.parse(rolesStr);
      }
    } catch (e) {
      roles = [];
    }

    // 检查是否是管理员
    const isAdmin = storageGet('isAdmin') === 'true' ||
      roles.some(roleOid => {
        const roleOidLower = roleOid?.toLowerCase() || '';
        return roleOid === 'ROLE001' ||
               roleOid === 'ROLE_ADMIN' ||
               roleOidLower.includes('admin');
      });

    return {
      userId,
      username,
      realName,
      department: storageGet('department') || undefined,
      roles,
      isAdmin
    };
  });

  // 监听storage变化，同步更新用户信息
  useEffect(() => {
    const handleStorageChange = () => {
      const username = storageGet('username') || '';
      const userId = storageGet('userId') || '';
      const realName = storageGet('realName') || username || '陆启闯';

      // 获取角色信息
      let roles: string[] = [];
      try {
        const rolesStr = storageGet('userRoles');
        if (rolesStr) {
          roles = JSON.parse(rolesStr);
        }
      } catch (e) {
        roles = [];
      }

      // 检查是否是管理员
      const isAdmin = storageGet('isAdmin') === 'true' ||
        roles.some(roleOid => roleOid === 'ROLE001' || (roleOid && roleOid.toLowerCase().includes('admin')));

      setCurrentUser({
        userId,
        username,
        realName,
        department: storageGet('department') || undefined,
        roles,
        isAdmin
      });
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 手动刷新用户信息
  const refresh = useCallback(() => {
    const username = storageGet('username') || '';
    const userId = storageGet('userId') || '';
    const realName = storageGet('realName') || username || '陆启闯';

    // 获取角色信息
    let roles: string[] = [];
    try {
      const rolesStr = storageGet('userRoles');
      if (rolesStr) {
        roles = JSON.parse(rolesStr);
      }
    } catch (e) {
      roles = [];
    }

    // 检查是否是管理员
    const isAdmin = storageGet('isAdmin') === 'true' ||
      roles.some(roleOid => {
        const roleOidLower = roleOid?.toLowerCase() || '';
        return roleOid === 'ROLE001' ||
               roleOid === 'ROLE_ADMIN' ||
               roleOidLower.includes('admin');
      });

    setCurrentUser({
      userId,
      username,
      realName,
      department: storageGet('department') || undefined,
      roles,
      isAdmin
    });
  }, []);

  return {
    ...currentUser,
    refresh
  };
}

/**
 * 获取默认审核员/创建人
 * 当没有当前用户时返回空字符串，让后端自动处理
 */
export function getDefaultAuditor(): string {
  return storageGet('username') || '';
}

/**
 * 获取当前用户名
 */
export function getCurrentUsername(): string {
  // 优先获取 username，其次 realName，最后使用系统配置的默认值
  return storageGet('username') || storageGet('realName') || '陆启闯';
}

export default useCurrentUser;
