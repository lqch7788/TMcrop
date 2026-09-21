/**
 * 认证与权限 Zustand Store
 *
 * 架构：enhancedApiClient → API（无缓存层，V2.1 铁律）
 * 数据流：Login → Store → 组件 (组件不直接读写 localStorage)
 *
 * 对接后端: /api/authority/*
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
import { getProcessOidByRoute } from '../lib/processRouteMap';

// ==================== 类型定义 ====================

/** 当前登录用户信息 */
export interface CurrentUser {
  oid: string;
  username: string;
  realName: string;
  orgOid: string;
  email?: string;
  phone?: string;
  status?: string;
}

/** 角色摘要 */
export interface RoleSummary {
  oid: string;
  code: string;
  name: string;
  isSystem: number;
}

/** 权限条目 */
export interface AuthorityEntry {
  processOid: string;
  actionOid: string;
  value: number;
}

/** 用户特殊权限 */
export interface UserAuthorityEntry {
  userOid: string;
  processOid: string;
  actionOid: string;
  value: number; // 1=强制允许, 0=强制拒绝, -1=清除覆盖
}

/** 权限摘要响应 */
export interface MyPermissionsResponse {
  user: CurrentUser;
  roles: RoleSummary[];
  isAdmin: boolean;
  authorities: AuthorityEntry[];
  userAuthorities: AuthorityEntry[];
  dataOrgOids: string[];
}

// ==================== Store 接口 ====================

interface AuthState {
  // 登录状态
  token: string | null;
  currentUser: CurrentUser | null;
  isAuthenticated: boolean;

  // 权限数据
  roles: RoleSummary[];
  isAdmin: boolean;
  authorities: AuthorityEntry[];        // 角色权限汇总
  userAuthorities: AuthorityEntry[];     // 用户特殊权限
  dataOrgOids: string[];                // 数据权限范围

  // 加载状态
  isLoading: boolean;
  error: string | null;

  // 操作
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  /** 加载当前用户权限；返回是否加载成功（verifyToken 据此判定会话是否真正有效） */
  loadPermissions: () => Promise<boolean>;
  verifyToken: () => Promise<boolean>;

  // 权限检查
  hasPermission: (processRoute: string, actionCode: string) => boolean;
  canAccessProcess: (processRoute: string) => boolean;
  getAccessibleMenuRoutes: (allRoutes: string[]) => string[];
}

// ==================== 会话持久化恢复（2026-09-21） ====================

/**
 * 启动时从 localStorage 恢复登录会话
 *
 * 背景：登录成功后 token/currentUser 已写入 localStorage，但此前**启动时不读回**，
 *   导致 App.tsx 的 `if (isAuthenticated && token)` 恒为 false → 每次整页加载都重新
 *   POST /authority/auth/login（StrictMode 双跑 = 2 次）→ 每次刷新触发 2 条登录审计
 *   + 2 次全量 10.6MB 落盘，并污染操作日志。
 *
 * 恢复后走 verifyToken()（GET，不写盘）；校验失败由 App.tsx 回退到自动登录。
 */
function restorePersistedAuth(): { token: string | null; currentUser: CurrentUser | null } {
  try {
    const token = localStorage.getItem('token');
    if (!token) return { token: null, currentUser: null };
    const raw = localStorage.getItem('currentUser');
    return { token, currentUser: raw ? (JSON.parse(raw) as CurrentUser) : null };
  } catch {
    // localStorage 不可用或数据损坏 → 视为未登录，交由 App 触发登录
    return { token: null, currentUser: null };
  }
}

const restoredAuth = restorePersistedAuth();

// ==================== 创建 Store ====================

export const useAuthStore = create<AuthState>()(
  (set, get)=> ({
      token: restoredAuth.token,
      currentUser: restoredAuth.currentUser,
      isAuthenticated: !!restoredAuth.token,
      roles: [],
      isAdmin: false,
      authorities: [],
      userAuthorities: [],
      dataOrgOids: [],
      isLoading: false,
      error: null,

      // ---------- 登录 ----------
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await enhancedApiClient.post<{
            success: boolean;
            token: string;
            user: Record<string, unknown>;
            roles?: string[];
          }>('/authority/auth/login', { username, password });

          if (!response?.token) {
            set({ isLoading: false, error: '登录失败：未返回 token' });
            return { success: false, error: '登录失败：未返回 token' };
          }

          const user: CurrentUser = {
            oid: response.user?.oid as string || '',
            username: response.user?.username as string || username,
            realName: (response.user?.real_name || response.user?.name || username) as string,
            orgOid: response.user?.org_oid as string || '',
            email: response.user?.email as string,
            phone: response.user?.phone as string,
            status: response.user?.status as string,
          };

          // 直接写入 localStorage，确保 enhancedApiClient 立即可读取
          localStorage.setItem('token', response.token);
          localStorage.setItem('username', user.username);
          // 2026-09-21：持久化完整 currentUser，供启动时恢复会话（见 restorePersistedAuth）
          localStorage.setItem('currentUser', JSON.stringify(user));

          set({
            token: response.token,
            currentUser: user,
            isAuthenticated: true,
            isLoading: false,
          });

          // 登录后自动加载权限
          await get().loadPermissions();

          return { success: true };
        } catch (error) {
          const msg = (error as Error).message || '登录失败';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      // ---------- 登出 ----------
      logout: () => {
        set({
          token: null,
          currentUser: null,
          isAuthenticated: false,
          roles: [],
          isAdmin: false,
          authorities: [],
          userAuthorities: [],
          dataOrgOids: [],
          error: null,
        });
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRoles');
      },

      // ---------- 加载权限 ----------
      loadPermissions: async () => {
        const { token } = get();
        if (!token) return false;

        set({ isLoading: true, error: null });
        try {
          // enhancedApiClient 已自动提取 result.data，response 就是 MyPermissionsResponse
          const response = await enhancedApiClient.get<MyPermissionsResponse>('/authority/my-permissions');

          if (response) {
            set({
              roles: response.roles || [],
              isAdmin: response.isAdmin || false,
              authorities: response.authorities || [],
              userAuthorities: response.userAuthorities || [],
              dataOrgOids: response.dataOrgOids || [],
              isLoading: false,
            });
            return true;
          }
          // 无响应体（token 被拒但服务端返回 200 空体）→ 视为失败
          set({ isLoading: false });
          return false;
        } catch (error) {
          // logger.warn('[AuthStore] 加载权限失败:', error);
          // 失败即视为会话无效：调用方（verifyToken）据此触发 logout + 重新登录
          set({ isLoading: false, error: (error as Error).message });
          return false;
        }
      },

      // ---------- 验证 Token ----------
      verifyToken: async () => {
        const { token } = get();
        if (!token) return false;

        try {
          const response = await enhancedApiClient.get<{ success: boolean }>('/authority/verify');
          if (!response?.success) {
            get().logout();
            return false;
          }
          set({ isAuthenticated: true });

          // 2026-09-21 修复（空菜单）：权限加载失败同样判定为会话失效。
          //   背景：/authority/verify 在演示模式下会放行任意 token（返回 200 success），
          //   而 /authority/my-permissions 会因"用户不存在"失败。若只信任 verify，
          //   前端会停在「isAuthenticated=true 但 authorities=[]、isAdmin=false」的中间态
          //   → Sidebar 的 filteredXxxSubItems 长度全为 0 → 整个左侧菜单消失，
          //   且不会自行恢复（用户必须手动退出重登）。实测无效 token 复现：菜单链接数 0。
          //   改为以权限加载结果为准：失败即 logout，交由 App.tsx 回退自动登录。
          const permsLoaded = await get().loadPermissions();
          if (!permsLoaded) {
            get().logout();
            return false;
          }
          return true;
        } catch {
          get().logout();
          return false;
        }
      },

      // ---------- 权限检查 ----------

      /**
       * 检查用户是否有特定工序的特定动作权限
       * Admin 直接返回 true
       * processRoute: 页面路由路径（如 /dashboard），内部转为工序OID
       * actionCode: 动作代码（如 view/create/edit/delete/export/approve）
       */
      hasPermission: (processRoute: string, actionCode: string): boolean => {
        const { isAdmin, authorities } = get();
        if (isAdmin) return true;

        const processOid = getProcessOidByRoute(processRoute);
        if (!processOid) return false;

        return authorities.some(a => {
          const pOid = a.processOid || (a as unknown as Record<string, string>).process_oid;
          const aOid = a.actionOid || (a as unknown as Record<string, string>).action_oid;
          return pOid === processOid && aOid === actionCode && a.value >= 1;
        });
      },

      /**
       * 检查用户是否能访问某个工序（菜单）
       * 只要有该工序的任一 action 权限即视为可访问
       */
      canAccessProcess: (processRoute: string): boolean => {
        const { isAdmin, authorities } = get();
        if (isAdmin) return true;

        const processOid = getProcessOidByRoute(processRoute);
        if (!processOid) return false;

        return authorities.some(a => {
          const pOid = a.processOid || (a as unknown as Record<string, string>).process_oid;
          return pOid === processOid && a.value >= 1;
        });
      },

      /**
       * 从菜单路由列表中筛选用户可访问的路由
       */
      getAccessibleMenuRoutes: (allRoutes: string[]): string[] => {
        const { isAdmin } = get();
        if (isAdmin) return allRoutes;

        return allRoutes.filter(route => get().canAccessProcess(route));
      },
    })
);
