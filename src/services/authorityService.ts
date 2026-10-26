/**
 * 组织与权限管理 API 服务
 * 对接后端 /api/authority/*
 * 本地模式回退数据
 */

import { enhancedApiClient } from '@/lib/apiClient';
import {
  Organization,
  Role,
  User,
  UserRole,
  Process,
  Action,
  RoleAuthorityItem,
  RoleDataAuthorityItem,
  AppType,
  AuthValue,
} from '../types/authority';

/**
 * 把 query 参数拼到 URL 上（2026-10-26）
 *
 * 此前本文件用的是自研 apiClient（src/services/apiClient.ts），
 * 它的 baseUrl 硬编码 `http://localhost:3001/api`，忽略 VITE_API_BASE_URL、
 * 绕过 Vite 代理、不带 X-Base-Oid、401 处理被整段注释。
 * 结果：部署到后端不在 localhost:3001 的环境时，整个权限模块连不上后端；
 * 后端重启导致 token 失效时，权限页面抛 401 卡在加载失败，
 * 而其它模块已跳回登录页，行为不一致。
 *
 * 现统一改用 enhancedApiClient（全站标准客户端）。
 * 差异：enhancedApiClient.get 的第二参是重试选项而非 query，
 * 所以 query 必须拼进 URL。
 */
function withQuery(path: string, params?: Record<string, string>): string {
  if (!params) return path;
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return path;
  const qs = new URLSearchParams(entries).toString();
  return path + (path.includes('?') ? '&' : '?') + qs;
}

// ============================================
// 本地模式默认数据
// ============================================

const DEFAULT_ORGANIZATIONS: Organization[] = [
  { oid: 'ORG001', name: '宁波帮帮忙公司', oidParent: null, sortNumber: 1, status: 'active', description: '总公司' },
  { oid: 'ORG002', name: '生产部', oidParent: 'ORG001', sortNumber: 2, status: 'active', description: '生产管理部门' },
  { oid: 'ORG003', name: '技术部', oidParent: 'ORG001', sortNumber: 3, status: 'active', description: '技术研发部门' },
  { oid: 'ORG004', name: '后勤部', oidParent: 'ORG001', sortNumber: 4, status: 'active', description: '后勤保障部门' },
  { oid: 'ORG005', name: '财务部', oidParent: 'ORG001', sortNumber: 5, status: 'active', description: '财务管理部门' },
];

const DEFAULT_ROLES: Role[] = [
  { oid: 'ROLE001', name: '系统管理员', orgOid: 'ORG001', description: '系统全部权限', status: 'active', sortNumber: 1 },
  { oid: 'ROLE002', name: '生产主管', orgOid: 'ORG002', description: '生产管理权限', status: 'active', sortNumber: 2 },
  { oid: 'ROLE003', name: '技术员', orgOid: 'ORG003', description: '技术操作权限', status: 'active', sortNumber: 3 },
  { oid: 'ROLE004', name: '普通员工', orgOid: 'ORG001', description: '基本操作权限', status: 'active', sortNumber: 4 },
];

const DEFAULT_USERS: User[] = [
  { oid: 'USER001', aid: 'admin', name: '系统管理员', orgOid: 'ORG001', status: 'active' },
  { oid: 'USER002', aid: 'lcq', name: '陆启闯', orgOid: 'ORG002', status: 'active' },
  { oid: 'USER003', aid: 'guojing', name: '郭靖', orgOid: 'ORG002', status: 'active' },
  { oid: 'USER004', aid: 'huangrong', name: '黄蓉', orgOid: 'ORG003', status: 'active' },
];

// 本地模式用户角色关联存储
interface LocalUserRole {
  userOid: string;
  roleOids: string[];
}

const LOCAL_USER_ROLES: LocalUserRole[] = [
  { userOid: 'USER001', roleOids: ['ROLE001'] },
  { userOid: 'USER002', roleOids: ['ROLE002'] },
  { userOid: 'USER003', roleOids: ['ROLE003'] },
  { userOid: 'USER004', roleOids: ['ROLE004'] },
];

const DEFAULT_PROCESSES: Process[] = [
  { oid: 'PROC001', name: '采收管理', appType: 0 as AppType, category: 'harvest', sortNumber: 1, status: 'active', description: '采收相关工序' },
  { oid: 'PROC002', name: '种植管理', appType: 0 as AppType, category: 'planting', sortNumber: 2, status: 'active', description: '种植相关工序' },
  { oid: 'PROC003', name: '施肥管理', appType: 0 as AppType, category: 'fertilizer', sortNumber: 3, status: 'active', description: '施肥相关工序' },
  { oid: 'PROC004', name: '浇水管理', appType: 0 as AppType, category: 'irrigation', sortNumber: 4, status: 'active', description: '浇水相关工序' },
  { oid: 'PROC005', name: '巡检管理', appType: 0 as AppType, category: 'inspection', sortNumber: 5, status: 'active', description: '巡检相关工序' },
];

const DEFAULT_ACTIONS: Action[] = [
  { oid: 'ACT001', name: '查看', code: 'view', category: 'common', sortNumber: 1 },
  { oid: 'ACT002', name: '新增', code: 'create', category: 'common', sortNumber: 2 },
  { oid: 'ACT003', name: '编辑', code: 'edit', category: 'common', sortNumber: 3 },
  { oid: 'ACT004', name: '删除', code: 'delete', category: 'common', sortNumber: 4 },
  { oid: 'ACT005', name: '导出', code: 'export', category: 'common', sortNumber: 5 },
  { oid: 'ACT006', name: '审核', code: 'approve', category: 'common', sortNumber: 6 },
];

// LocalStorage 键名
const STORAGE_KEYS = {
  organizations: 'yuanxingtu_organizations',
  roles: 'yuanxingtu_roles',
  users: 'yuanxingtu_users',
  processes: 'yuanxingtu_processes',
};

// ============================================
// 组织管理
// ============================================

function getStoredData<T>(key: string, defaultData: T[]): T[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn(`Failed to parse ${key} from localStorage`);
  }
  // 保存默认数据到本地存储
  localStorage.setItem(key, JSON.stringify(defaultData));
  return defaultData;
}

function saveStoredData<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * 获取组织树
 */
export async function getOrganizations(params?: {
  rows?: number;
  id?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}): Promise<Organization[]> {
  const queryParams: Record<string, string> = {};
  if (params?.rows !== undefined) queryParams.rows = String(params.rows);
  if (params?.id) queryParams.id = params.id;
  if (params?.sort) queryParams.sort = params.sort;
  if (params?.order) queryParams.order = params.order;
  return enhancedApiClient.get<Organization[]>(withQuery('/authority/organizations', queryParams));
}

/**
 * 保存组织（新增/更新/删除）
 */
export async function saveOrganizations(data: {
  inserted?: Partial<Organization>[];
  updated?: Partial<Organization>[];
  deleted?: string[];
}): Promise<{
  inserted: Organization[];
  updated: Organization[];
  deleted: string[];
}> {
  return enhancedApiClient.post('/authority/organizations', data);
}

// ============================================
// 角色管理
// ============================================

/**
 * 获取角色列表
 */
export async function getRoles(params?: {
  orgOid?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}): Promise<Role[]> {
  const queryParams: Record<string, string> = {};
  if (params?.orgOid) queryParams.orgOid = params.orgOid;
  if (params?.sort) queryParams.sort = params.sort;
  if (params?.order) queryParams.order = params.order;
  return enhancedApiClient.get<Role[]>(withQuery('/authority/roles', queryParams));
}

/**
 * 保存角色
 */
export async function saveRoles(data: {
  inserted?: Partial<Role>[];
  updated?: Partial<Role>[];
  deleted?: string[];
}): Promise<{
  inserted: Role[];
  updated: Role[];
  deleted: string[];
}> {
  return enhancedApiClient.post('/authority/roles', data);
}

// ============================================
// 用户管理
// ============================================

/**
 * 获取用户列表
 */
export async function getUsers(params?: {
  orgOid?: string;
  status?: string;
}): Promise<User[]> {
  const queryParams: Record<string, string> = {};
  if (params?.orgOid) queryParams.orgOid = params.orgOid;
  if (params?.status) queryParams.status = params.status;
  return enhancedApiClient.get<User[]>(withQuery('/authority/users', queryParams));
}

/**
 * 保存用户
 */
export async function saveUsers(data: {
  inserted?: Partial<User>[];
  updated?: Partial<User>[];
  deleted?: string[];
}): Promise<{
  inserted: User[];
  updated: User[];
  deleted: string[];
}> {
  return enhancedApiClient.post('/authority/users', data);
}

/**
 * 保存用户角色关联
 */
export async function saveUserRoles(
  userOid: string,
  roleOids: string[]
): Promise<{ success: boolean }> {
  return enhancedApiClient.post('/authority/users/' + userOid + '/roles', { roleOids });
}

/**
 * 获取用户角色
 */
export async function getUserRoles(userOid: string): Promise<string[]> {
  return enhancedApiClient.get<string[]>('/authority/users/' + userOid + '/roles');
}

/**
 * 获取工序列表
 */
export async function getProcesses(params?: {
  appType?: AppType;
  id?: string;
}): Promise<Process[]> {
  const queryParams: Record<string, string> = {};
  if (params?.appType !== undefined) queryParams.appType = String(params.appType);
  if (params?.id) queryParams.id = params.id;
  return enhancedApiClient.get<Process[]>(withQuery('/authority/processes', queryParams));
}

/**
 * 保存工序
 */
export async function saveProcesses(data: {
  inserted?: Partial<Process>[];
  updated?: Partial<Process>[];
  deleted?: string[];
}): Promise<{
  inserted: Process[];
  updated: Process[];
  deleted: string[];
}> {
  return enhancedApiClient.post('/authority/processes', data);
}

/**
 * 从系统菜单同步工序树（2026-10-25）
 *
 * 以侧边栏实际菜单为准，把工序树的名称与父子层级刷新到与菜单一致。
 * 只更新、不新增：新增工序必须同时进入前后端两套路由映射才会真正生效，
 * 由菜单自动造出来的工序在权限矩阵里配了也不起作用。
 * 匹配不到的菜单项通过 `unmatched` 返回，提示人工处理。
 */
export async function syncProcessesFromMenu(items: Array<{
  label: string;
  path: string;
  children?: Array<{ label: string; path: string }>;
}>): Promise<{
  updatedCount: number;
  unmatchedCount: number;
  updated: Array<{ oid: string; name: string; route: string }>;
  unmatched: Array<{ label: string; path: string }>;
}> {
  return enhancedApiClient.post('/authority/processes/sync-from-menu', { items });
}

// ============================================
// 动作管理
// ============================================

/**
 * 获取动作列表
 */
export async function getActions(params?: {
  appType?: AppType;
  category?: string;
}): Promise<Action[]> {
  const queryParams: Record<string, string> = {};
  if (params?.appType !== undefined) queryParams.appType = String(params.appType);
  if (params?.category) queryParams.category = params.category;
  return enhancedApiClient.get<Action[]>(withQuery('/authority/actions', queryParams));
}

// ============================================
// 角色权限管理
// ============================================

/**
 * 获取角色权限
 */
export async function getRoleAuthority(
  roleOid: string,
  appType: AppType = 0
): Promise<RoleAuthorityItem[]> {
  return enhancedApiClient.get<RoleAuthorityItem[]>(
    withQuery('/authority/roles/' + roleOid + '/authority', { appType: String(appType) })
  );
}

/**
 * 保存角色权限
 */
export async function saveRoleAuthority(
  roleOid: string,
  authorities: {
    processOid: string;
    actionOid: string;
    value: AuthValue;
  }[]
): Promise<{ success: boolean }> {
  return enhancedApiClient.post('/authority/roles/' + roleOid + '/authority', { authorities });
}

// ============================================
// 数据权限管理
// ============================================

/**
 * 获取角色数据权限
 */
export async function getRoleDataAuthority(
  roleOid: string
): Promise<RoleDataAuthorityItem[]> {
  return enhancedApiClient.get<RoleDataAuthorityItem[]>(
    '/authority/roles/' + roleOid + '/data-authority'
  );
}

/**
 * 保存角色数据权限
 */
export async function saveRoleDataAuthority(
  roleOid: string,
  orgOids: string[],
  isAuthorize: boolean
): Promise<{ success: boolean }> {
  return enhancedApiClient.post('/authority/roles/' + roleOid + '/data-authority', {
    orgOids,
    isAuthorize,
  });
}

// ============================================
// 用户特殊权限管理
// ============================================

/**
 * 获取用户特殊权限覆盖
 */
export async function getUserAuthority(
  userOid: string
): Promise<{ processOid: string; actionOid: string; value: number }[]> {
  return enhancedApiClient.get<{ processOid: string; actionOid: string; value: number }[]>(
    '/authority/users/' + userOid + '/authority'
  );
}

/**
 * 保存用户特殊权限覆盖
 */
export async function saveUserAuthority(
  userOid: string,
  authorities: { processOid: string; actionOid: string; value: number }[]
): Promise<{ success: boolean }> {
  return enhancedApiClient.post('/authority/users/' + userOid + '/authority', { authorities });
}

/**
 * 为用户分配角色
 */
export async function assignUserRoles(
  userOid: string,
  roleOids: string[]
): Promise<{ success: boolean }> {
  return enhancedApiClient.post('/authority/users/' + userOid + '/roles', { roleOids });
}
