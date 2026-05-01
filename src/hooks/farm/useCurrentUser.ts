/**
 * 当前用户信息Hook
 * 提供获取当前登录用户信息的功能
 * 用于替代硬编码的审核员、创建人等字段
 */

import { useState, useEffect, useCallback } from 'react';

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
}

/**
 * 获取当前用户信息
 * 从localStorage中读取用户信息
 */
export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
    // 初始化时从localStorage读取
    const username = localStorage.getItem('username') || '';
    const userId = localStorage.getItem('userId') || '';
    const realName = localStorage.getItem('realName') || username || '未知用户';

    return {
      userId,
      username,
      realName,
      department: localStorage.getItem('department') || undefined
    };
  });

  // 监听storage变化，同步更新用户信息
  useEffect(() => {
    const handleStorageChange = () => {
      const username = localStorage.getItem('username') || '';
      const userId = localStorage.getItem('userId') || '';
      const realName = localStorage.getItem('realName') || username || '未知用户';

      setCurrentUser({
        userId,
        username,
        realName,
        department: localStorage.getItem('department') || undefined
      });
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 手动刷新用户信息
  const refresh = useCallback(() => {
    const username = localStorage.getItem('username') || '';
    const userId = localStorage.getItem('userId') || '';
    const realName = localStorage.getItem('realName') || username || '未知用户';

    setCurrentUser({
      userId,
      username,
      realName,
      department: localStorage.getItem('department') || undefined
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
  return localStorage.getItem('username') || '';
}

/**
 * 获取当前用户名
 */
export function getCurrentUsername(): string {
  // 优先获取 username，其次 realName，最后使用默认值
  return localStorage.getItem('username') || localStorage.getItem('realName') || '未知用户';
}

export default useCurrentUser;
