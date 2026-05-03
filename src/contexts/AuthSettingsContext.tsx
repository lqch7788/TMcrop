/**
 * 组织与权限管理 Context
 * 提供全局权限状态管理
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import {
  Organization,
  Role,
  User,
  Process,
  Action,
  RoleAuthorityItem,
  RoleDataAuthorityItem,
  AppType,
  AuthValue,
} from '../types/authority';
import * as authorityService from '../services/authorityService';
import * as departmentService from '../services/departmentService';
import * as warehouseService from '../services/warehouseService';
import * as greenhouseService from '../services/greenhouseService';
import type { Department } from '../services/departmentService';
import type { Warehouse } from '../services/warehouseService';
import type { Greenhouse } from '../services/greenhouseService';

// ============================================
// 类型定义
// ============================================

interface AuthSettingsContextValue {
  // 组织相关
  organizations: Organization[];
  loadOrganizations: () => Promise<void>;
  saveOrganization: (org: Partial<Organization>) => Promise<void>;
  deleteOrganization: (oid: string) => Promise<void>;

  // 角色相关
  roles: Role[];
  loadRoles: (orgOid?: string) => Promise<void>;
  saveRole: (role: Partial<Role>) => Promise<void>;
  deleteRole: (oid: string) => Promise<void>;

  // 用户相关
  users: User[];
  loadUsers: (params?: { orgOid?: string; status?: string }) => Promise<void>;
  saveUser: (user: Partial<User>) => Promise<void>;
  deleteUser: (oid: string) => Promise<void>;
  getUserRoles: (userOid: string) => Promise<string[]>;
  assignUserRoles: (userOid: string, roleOids: string[]) => Promise<void>;

  // 工序相关
  processes: Process[];
  loadProcesses: (params?: { appType?: AppType; id?: string }) => Promise<void>;
  saveProcess: (process: Partial<Process>) => Promise<void>;
  deleteProcess: (oid: string) => Promise<void>;

  // 动作相关
  actions: Action[];
  loadActions: (params?: { appType?: AppType; category?: string }) => Promise<void>;

  // 角色权限相关
  roleAuthorities: RoleAuthorityItem[];
  loadRoleAuthority: (roleOid: string, appType?: AppType) => Promise<void>;
  saveRoleAuthority: (
    roleOid: string,
    authorities: { processOid: string; actionOid: string; value: AuthValue }[]
  ) => Promise<void>;

  // 角色数据权限相关
  roleDataAuthorities: RoleDataAuthorityItem[];
  loadRoleDataAuthority: (roleOid: string) => Promise<void>;
  saveRoleDataAuthority: (roleOid: string, orgOids: string[], isAuthorize: boolean) => Promise<void>;

  // 部门相关
  departments: Department[];
  loadDepartments: () => Promise<void>;

  // 仓库相关
  warehouses: Warehouse[];
  loadWarehouses: () => Promise<void>;

  // 温室相关
  greenhouses: Greenhouse[];
  loadGreenhouses: () => Promise<void>;

  // 加载状态
  loading: boolean;
  error: string | null;
}

const AuthSettingsContext = createContext<AuthSettingsContextValue | null>(null);

// ============================================
// Provider 组件
// ============================================

export function AuthSettingsProvider({ children }: { children: ReactNode }) {
  // 状态
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [roleAuthorities, setRoleAuthorities] = useState<RoleAuthorityItem[]>([]);
  const [roleDataAuthorities, setRoleDataAuthorities] = useState<RoleDataAuthorityItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [greenhouses, setGreenhouses] = useState<Greenhouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // 组织管理
  // ============================================

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authorityService.getOrganizations();
      setOrganizations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载组织失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveOrganization = useCallback(async (org: Partial<Organization>) => {
    try {
      setLoading(true);
      setError(null);
      await authorityService.saveOrganizations({
        inserted: org.oid ? [] : [org],
        updated: org.oid ? [org] : [],
        deleted: [],
      });
      await loadOrganizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存组织失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadOrganizations]);

  const deleteOrganization = useCallback(async (oid: string) => {
    try {
      setLoading(true);
      setError(null);
      await authorityService.saveOrganizations({ inserted: [], updated: [], deleted: [oid] });
      await loadOrganizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除组织失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadOrganizations]);

  // ============================================
  // 角色管理
  // ============================================

  const loadRoles = useCallback(async (orgOid?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authorityService.getRoles({ orgOid });
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载角色失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveRole = useCallback(async (role: Partial<Role>) => {
    try {
      setLoading(true);
      setError(null);
      await authorityService.saveRoles({
        inserted: role.oid ? [] : [role],
        updated: role.oid ? [role] : [],
        deleted: [],
      });
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存角色失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadRoles]);

  const deleteRole = useCallback(async (oid: string) => {
    try {
      setLoading(true);
      setError(null);
      await authorityService.saveRoles({ inserted: [], updated: [], deleted: [oid] });
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除角色失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadRoles]);

  // ============================================
  // 用户管理
  // ============================================

  const loadUsers = useCallback(async (params?: { orgOid?: string; status?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authorityService.getUsers(params);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载用户失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveUser = useCallback(async (user: Partial<User>) => {
    try {
      setLoading(true);
      setError(null);
      await authorityService.saveUsers({
        inserted: user.oid ? [] : [user],
        updated: user.oid ? [user] : [],
        deleted: [],
      });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存用户失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadUsers]);

  const deleteUser = useCallback(async (oid: string) => {
    try {
      setLoading(true);
      setError(null);
      await authorityService.saveUsers({ inserted: [], updated: [], deleted: [oid] });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除用户失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadUsers]);

  const getUserRoles = useCallback(async (userOid: string): Promise<string[]> => {
    try {
      return await authorityService.getUserRoles(userOid);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取用户角色失败');
      return [];
    }
  }, []);

  const assignUserRoles = useCallback(async (userOid: string, roleOids: string[]) => {
    try {
      setLoading(true);
      setError(null);
      await authorityService.saveUserRoles(userOid, roleOids);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分配用户角色失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // 工序管理
  // ============================================

  const loadProcesses = useCallback(async (params?: { appType?: AppType; id?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authorityService.getProcesses(params);
      setProcesses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载工序失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProcess = useCallback(async (process: Partial<Process>) => {
    try {
      setLoading(true);
      setError(null);
      await authorityService.saveProcesses({
        inserted: process.oid ? [] : [process],
        updated: process.oid ? [process] : [],
        deleted: [],
      });
      await loadProcesses();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存工序失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadProcesses]);

  const deleteProcess = useCallback(async (oid: string) => {
    try {
      setLoading(true);
      setError(null);
      await authorityService.saveProcesses({ inserted: [], updated: [], deleted: [oid] });
      await loadProcesses();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除工序失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadProcesses]);

  // ============================================
  // 动作管理
  // ============================================

  const loadActions = useCallback(async (params?: { appType?: AppType; category?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authorityService.getActions(params);
      setActions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载动作失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // 角色权限管理
  // ============================================

  const loadRoleAuthority = useCallback(async (roleOid: string, appType: AppType = 0) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authorityService.getRoleAuthority(roleOid, appType);
      setRoleAuthorities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载角色权限失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveRoleAuthority = useCallback(
    async (
      roleOid: string,
      authorities: { processOid: string; actionOid: string; value: AuthValue }[]
    ) => {
      try {
        setLoading(true);
        setError(null);
        await authorityService.saveRoleAuthority(roleOid, authorities);
      } catch (err) {
        setError(err instanceof Error ? err.message : '保存角色权限失败');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ============================================
  // 角色数据权限管理
  // ============================================

  const loadRoleDataAuthority = useCallback(async (roleOid: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authorityService.getRoleDataAuthority(roleOid);
      setRoleDataAuthorities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载角色数据权限失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveRoleDataAuthority = useCallback(
    async (roleOid: string, orgOids: string[], isAuthorize: boolean) => {
      try {
        setLoading(true);
        setError(null);
        await authorityService.saveRoleDataAuthority(roleOid, orgOids, isAuthorize);
      } catch (err) {
        setError(err instanceof Error ? err.message : '保存角色数据权限失败');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ============================================
  // 部门管理
  // ============================================

  const loadDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await departmentService.getDepartments();
      setDepartments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载部门失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // 仓库管理
  // ============================================

  const loadWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载仓库失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // 温室管理
  // ============================================

  const loadGreenhouses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await greenhouseService.getGreenhouses();
      setGreenhouses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载温室失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // 初始化加载
  // ============================================

  useEffect(() => {
    // 初始化时加载基础数据
    loadOrganizations();
    loadRoles();
    loadActions();
  }, [loadOrganizations, loadRoles, loadActions]);

  // ============================================
  // 提供值
  // ============================================

  const value: AuthSettingsContextValue = {
    // 组织相关
    organizations,
    loadOrganizations,
    saveOrganization,
    deleteOrganization,

    // 角色相关
    roles,
    loadRoles,
    saveRole,
    deleteRole,

    // 用户相关
    users,
    loadUsers,
    saveUser,
    deleteUser,
    getUserRoles,
    assignUserRoles,

    // 工序相关
    processes,
    loadProcesses,
    saveProcess,
    deleteProcess,

    // 动作相关
    actions,
    loadActions,

    // 角色权限相关
    roleAuthorities,
    loadRoleAuthority,
    saveRoleAuthority,

    // 角色数据权限相关
    roleDataAuthorities,
    loadRoleDataAuthority,
    saveRoleDataAuthority,

    // 部门相关
    departments,
    loadDepartments,

    // 仓库相关
    warehouses,
    loadWarehouses,

    // 温室相关
    greenhouses,
    loadGreenhouses,

    // 加载状态
    loading,
    error,
  };

  return <AuthSettingsContext.Provider value={value}>{children}</AuthSettingsContext.Provider>;
}

// ============================================
// Hook
// ============================================

export function useAuthSettings() {
  const context = useContext(AuthSettingsContext);
  if (!context) {
    throw new Error('useAuthSettings must be used within an AuthSettingsProvider');
  }
  return context;
}
