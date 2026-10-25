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
  /**
   * 2026-10-11：物料页（useApplicationTab / useExecuteTab）按 `currentUser?.name` 读显示名。
   * 登录链路目前只写入 realName，故该字段实际恒为 undefined —— 消费点已用 `|| ''` 兜底（筛选因此不生效），
   * 若要启用「我的申请 / 待我审批」筛选，需在 login/restore 时同步写入 name。
   */
  name?: string;
  orgOid: string;
  email?: string;
  phone?: string;
  status?: string;
  /**
   * 角色码（2026-09-22 新增）：admin / manager / user / 访客…
   * 由登录接口从 roles + user_roles 查出，多角色时取权限最高者。
   * 供 useTasks 的 canPerformAction 等权限判断使用。
   */
  role?: string;
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
  /** 按工序 OID 检查动作权限（2026-10-25 新增） */
  hasProcessPermission: (processOid: string, actionCode: string) => boolean;
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

/**
 * 动作代码 ↔ 动作 OID 映射
 * 2026-10-25：角色权限与用户覆盖在库里存在两种形态（ACT001~006 与 view/create/...），
 * 合并覆盖时必须同时处理，否则强制拒绝/允许会因为匹配不上而不生效。
 */
const ACTION_CODE_TO_OID: Record<string, string> = {
  view: 'ACT001',
  create: 'ACT002',
  edit: 'ACT003',
  delete: 'ACT004',
  export: 'ACT005',
  approve: 'ACT006',
};
const ACTION_OID_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(ACTION_CODE_TO_OID).map(([code, oid]) => [oid, code]),
);

/**
 * 把用户级特殊权限合并进角色权限（用户覆盖优先）
 *
 * 2026-10-25：无论是否有用户覆盖，都把每条授权同步成 code 与 ACT OID 两种形态。
 *   原因：后端 roles_authority 已统一为 ACT 口径，但 my-permissions 返回的仍是
 *   code 形态（'view'），若不双向展开，前端按 'create' 判定会全部落空
 *   （表现为"按钮该隐藏的没隐藏"）。
 */
function mergeUserOverrides(
  roleAuths: AuthorityEntry[],
  // my-permissions 返回的 userAuthorities 只含 processOid/actionOid/value，不需要 userOid
  userAuths: AuthorityEntry[],
): AuthorityEntry[] {
  const map = new Map<string, number>();
  const put = (a: AuthorityEntry) => {
    map.set(`${a.processOid}|${a.actionOid}`, a.value);
    // 同步到另一种命名形态（code → OID 或 OID → code）
    const asOid = ACTION_CODE_TO_OID[a.actionOid];
    if (asOid) map.set(`${a.processOid}|${asOid}`, a.value);
    const asCode = ACTION_OID_TO_CODE[a.actionOid];
    if (asCode) map.set(`${a.processOid}|${asCode}`, a.value);
  };

  for (const a of roleAuths || []) put(a);
  for (const a of userAuths || []) put(a);

  return [...map.entries()].map(([key, value]) => {
    const [processOid, actionOid] = key.split('|');
    return { processOid, actionOid, value };
  });
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
            // 2026-09-22：登录接口新增返回 role（来自 roles + user_roles）。
            //   此处【不要】用 `|| 'user'` 兜底 —— 那会让"后端未下发角色"与
            //   "真实角色就是 user"两种情形不可区分，进而使 useTasks.resolveTaskRole
            //   里"角色缺失时临时放行"的保护永远不触发，把本该放行的操作误拒。
            //   保持原值（缺失即 undefined）。
            role: response.user?.role as string,
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
              // 用户级覆盖合并进角色权限（覆盖优先），否则"强制允许/拒绝"不会生效
              authorities: mergeUserOverrides(
                response.authorities || [],
                response.userAuthorities || [],
              ),
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

        // 2026-10-25：动作参数可能传 'view' 或 'ACT001'，两种都匹配
        //   （后端 roles_authority 已统一为 ACT 单一口径，这里兼容 code 形态）
        const oidForm = ACTION_CODE_TO_OID[actionCode];
        return authorities.some(a => {
          const pOid = a.processOid || (a as unknown as Record<string, string>).process_oid;
          const aOid = a.actionOid || (a as unknown as Record<string, string>).action_oid;
          const matchAction = aOid === actionCode || (!!oidForm && aOid === oidForm);
          return pOid === processOid && matchAction && a.value >= 1;
        });
      },

      /**
       * 按工序 OID 检查动作权限（2026-10-25 新增）
       * 页面已知自己属于哪个工序时用这个（比 hasPermission 少一次路由反查）。
       * @param processOid 工序 OID，如 'PROC_SEEDLING'
       * @param actionCode  动作代码（view/create/...）或动作 OID（ACT001/...）
       */
      hasProcessPermission: (processOid: string, actionCode: string): boolean => {
        const { isAdmin, authorities } = get();
        if (isAdmin) return true;
        if (!processOid) return false;

        const oidForm = ACTION_CODE_TO_OID[actionCode];
        return authorities.some(a => {
          const pOid = a.processOid || (a as unknown as Record<string, string>).process_oid;
          const aOid = a.actionOid || (a as unknown as Record<string, string>).action_oid;
          const matchAction = aOid === actionCode || (!!oidForm && aOid === oidForm);
          return pOid === processOid && matchAction && a.value >= 1;
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

        // 2026-10-25：菜单可见性统一按「查看」权限判断。
        //   原先只要该工序任一动作 value>=1 就可见，导致"强制拒绝查看"
        //   因 create/edit 等权限仍为 1 而无法隐藏菜单。
        return authorities.some(a => {
          const pOid = a.processOid || (a as unknown as Record<string, string>).process_oid;
          const aOid = a.actionOid || (a as unknown as Record<string, string>).action_oid;
          return pOid === processOid
            && (aOid === 'ACT001' || aOid === 'view')
            && a.value >= 1;
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
