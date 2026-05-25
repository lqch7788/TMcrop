/**
 * 组织管理 Store - Zustand 替代 OrganizationContext
 * 提供组织、角色、用户、工序、动作的全局状态管理
 */
import { create } from 'zustand';
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

interface OrganizationStore {
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

  // 加载状态
  loading: boolean;
  error: string | null;
}

export const useOrganizationStore = create<OrganizationStore>((set, get) => ({
  organizations: [],
  roles: [],
  users: [],
  processes: [],
  actions: [],
  roleAuthorities: [],
  roleDataAuthorities: [],
  loading: false,
  error: null,

  // 组织管理
  loadOrganizations: async () => {
    try {
      set({ loading: true, error: null });
      const data = await authorityService.getOrganizations();
      set({ organizations: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载组织失败' });
    } finally {
      set({ loading: false });
    }
  },

  saveOrganization: async (org) => {
    try {
      set({ loading: true, error: null });
      const orgExists = get().organizations.find((o) => o.oid === org.oid);
      await authorityService.saveOrganizations({
        inserted: orgExists ? [] : [org],
        updated: orgExists ? [org] : [],
        deleted: [],
      });
      await get().loadOrganizations();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '保存组织失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  deleteOrganization: async (oid) => {
    try {
      set({ loading: true, error: null });
      await authorityService.saveOrganizations({
        inserted: [],
        updated: [],
        deleted: [oid],
      });
      await get().loadOrganizations();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '删除组织失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  // 角色管理
  loadRoles: async (orgOid) => {
    try {
      set({ loading: true, error: null });
      const data = await authorityService.getRoles(orgOid);
      set({ roles: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载角色失败' });
    } finally {
      set({ loading: false });
    }
  },

  saveRole: async (role) => {
    try {
      set({ loading: true, error: null });
      const roleExists = get().roles.find((r) => r.oid === role.oid);
      await authorityService.saveRoles({
        inserted: roleExists ? [] : [role],
        updated: roleExists ? [role] : [],
        deleted: [],
      });
      await get().loadRoles();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '保存角色失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  deleteRole: async (oid) => {
    try {
      set({ loading: true, error: null });
      await authorityService.saveRoles({
        inserted: [],
        updated: [],
        deleted: [oid],
      });
      await get().loadRoles();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '删除角色失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  // 用户管理
  loadUsers: async (params) => {
    try {
      set({ loading: true, error: null });
      const data = await authorityService.getUsers(params);
      set({ users: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载用户失败' });
    } finally {
      set({ loading: false });
    }
  },

  saveUser: async (user) => {
    try {
      set({ loading: true, error: null });
      const existing = get().users.find((u) => u.oid === user.oid);
      await authorityService.saveUsers({
        inserted: existing ? [] : [user],
        updated: existing ? [user] : [],
        deleted: [],
      });
      await get().loadUsers();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '保存用户失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  deleteUser: async (oid) => {
    try {
      set({ loading: true, error: null });
      await authorityService.saveUsers({
        inserted: [],
        updated: [],
        deleted: [oid],
      });
      await get().loadUsers();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '删除用户失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  getUserRoles: async (userOid) => {
    const data = await authorityService.getUserRoles(userOid);
    return data;
  },

  assignUserRoles: async (userOid, roleOids) => {
    try {
      set({ loading: true, error: null });
      await authorityService.saveUserRoles(userOid, roleOids);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '分配角色失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  // 工序管理
  loadProcesses: async (params) => {
    try {
      set({ loading: true, error: null });
      const data = await authorityService.getProcesses(params);
      // 字段映射：后端 parent_oid → oidParent, process_code → aid, process_name → name
      const normalize = (p: any): Process => ({
        oid: p.oid,
        oidParent: p.parent_oid || null,
        aid: p.process_code || p.aid || '',
        name: p.process_name || p.name || '',
        appType: p.app_type || p.appType,
        hidden: p.is_hidden === 1 || p.hidden,
        sortNumber: p.sort_order || p.sortNumber,
        status: p.status,
        children: p.children?.map(normalize),
      });
      set({ processes: Array.isArray(data) ? data.map(normalize) : [] });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载工序失败' });
    } finally {
      set({ loading: false });
    }
  },

  saveProcess: async (process) => {
    try {
      set({ loading: true, error: null });
      const procExists = get().processes.find((p) => p.oid === process.oid);
      await authorityService.saveProcesses({
        inserted: procExists ? [] : [process],
        updated: procExists ? [process] : [],
        deleted: [],
      });
      await get().loadProcesses();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '保存工序失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  deleteProcess: async (oid) => {
    try {
      set({ loading: true, error: null });
      await authorityService.saveProcesses({
        inserted: [],
        updated: [],
        deleted: [oid],
      });
      await get().loadProcesses();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '删除工序失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  // 动作管理
  loadActions: async (params) => {
    try {
      set({ loading: true, error: null });
      const data = await authorityService.getActions(params);
      set({ actions: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载动作失败' });
    } finally {
      set({ loading: false });
    }
  },

  // 角色权限管理
  loadRoleAuthority: async (roleOid, appType) => {
    try {
      set({ loading: true, error: null });
      const data = await authorityService.getRoleAuthority(roleOid, appType);
      set({ roleAuthorities: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载角色权限失败' });
    } finally {
      set({ loading: false });
    }
  },

  saveRoleAuthority: async (roleOid, authorities) => {
    try {
      set({ loading: true, error: null });
      await authorityService.saveRoleAuthority(roleOid, authorities);
      await get().loadRoleAuthority(roleOid);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '保存角色权限失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  // 角色数据权限管理
  loadRoleDataAuthority: async (roleOid) => {
    try {
      set({ loading: true, error: null });
      const data = await authorityService.getRoleDataAuthority(roleOid);
      set({ roleDataAuthorities: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载数据权限失败' });
    } finally {
      set({ loading: false });
    }
  },

  saveRoleDataAuthority: async (roleOid, orgOids, isAuthorize) => {
    try {
      set({ loading: true, error: null });
      await authorityService.saveRoleDataAuthority(roleOid, orgOids, isAuthorize);
      await get().loadRoleDataAuthority(roleOid);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '保存数据权限失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));
