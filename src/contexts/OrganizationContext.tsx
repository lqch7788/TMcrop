/**
 * 组织管理 Context
 * 提供组织、角色、用户、工序、动作的全局状态管理
 * 已迁移到 Zustand Store (src/stores/useOrganizationStore.ts)
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useOrganizationStore } from '../stores/useOrganizationStore';
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

interface OrganizationContextValue {
  organizations: Organization[];
  loadOrganizations: () => Promise<void>;
  saveOrganization: (org: Partial<Organization>) => Promise<void>;
  deleteOrganization: (oid: string) => Promise<void>;

  roles: Role[];
  loadRoles: (orgOid?: string) => Promise<void>;
  saveRole: (role: Partial<Role>) => Promise<void>;
  deleteRole: (oid: string) => Promise<void>;

  users: User[];
  loadUsers: (params?: { orgOid?: string; status?: string }) => Promise<void>;
  saveUser: (user: Partial<User>) => Promise<void>;
  deleteUser: (oid: string) => Promise<void>;
  getUserRoles: (userOid: string) => Promise<string[]>;
  assignUserRoles: (userOid: string, roleOids: string[]) => Promise<void>;

  processes: Process[];
  loadProcesses: (params?: { appType?: AppType; id?: string }) => Promise<void>;
  saveProcess: (process: Partial<Process>) => Promise<void>;
  deleteProcess: (oid: string) => Promise<void>;

  actions: Action[];
  loadActions: (params?: { appType?: AppType; category?: string }) => Promise<void>;

  roleAuthorities: RoleAuthorityItem[];
  loadRoleAuthority: (roleOid: string, appType?: AppType) => Promise<void>;
  saveRoleAuthority: (
    roleOid: string,
    authorities: { processOid: string; actionOid: string; value: AuthValue }[]
  ) => Promise<void>;

  roleDataAuthorities: RoleDataAuthorityItem[];
  loadRoleDataAuthority: (roleOid: string) => Promise<void>;
  saveRoleDataAuthority: (roleOid: string, orgOids: string[], isAuthorize: boolean) => Promise<void>;

  loading: boolean;
  error: string | null;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  // 2026-07-29 死循环修复：改为 selector 单独订阅字段，避免 store 任意字段变化触发整 Provider 重渲染
  const organizations = useOrganizationStore((s) => s.organizations);
  const roles = useOrganizationStore((s) => s.roles);
  const users = useOrganizationStore((s) => s.users);
  const processes = useOrganizationStore((s) => s.processes);
  const actions = useOrganizationStore((s) => s.actions);
  const roleAuthorities = useOrganizationStore((s) => s.roleAuthorities);
  const roleDataAuthorities = useOrganizationStore((s) => s.roleDataAuthorities);
  const loading = useOrganizationStore((s) => s.loading);
  const error = useOrganizationStore((s) => s.error);

  const loadOrganizations = useOrganizationStore((s) => s.loadOrganizations);
  const saveOrganization = useOrganizationStore((s) => s.saveOrganization);
  const deleteOrganization = useOrganizationStore((s) => s.deleteOrganization);
  const loadRoles = useOrganizationStore((s) => s.loadRoles);
  const saveRole = useOrganizationStore((s) => s.saveRole);
  const deleteRole = useOrganizationStore((s) => s.deleteRole);
  const loadUsers = useOrganizationStore((s) => s.loadUsers);
  const saveUser = useOrganizationStore((s) => s.saveUser);
  const deleteUser = useOrganizationStore((s) => s.deleteUser);
  const getUserRoles = useOrganizationStore((s) => s.getUserRoles);
  const assignUserRoles = useOrganizationStore((s) => s.assignUserRoles);
  const loadProcesses = useOrganizationStore((s) => s.loadProcesses);
  const saveProcess = useOrganizationStore((s) => s.saveProcess);
  const deleteProcess = useOrganizationStore((s) => s.deleteProcess);
  const loadActions = useOrganizationStore((s) => s.loadActions);
  const loadRoleAuthority = useOrganizationStore((s) => s.loadRoleAuthority);
  const saveRoleAuthority = useOrganizationStore((s) => s.saveRoleAuthority);
  const loadRoleDataAuthority = useOrganizationStore((s) => s.loadRoleDataAuthority);
  const saveRoleDataAuthority = useOrganizationStore((s) => s.saveRoleDataAuthority);

  const value: OrganizationContextValue = {
    organizations,
    loadOrganizations,
    saveOrganization,
    deleteOrganization,

    roles,
    loadRoles,
    saveRole,
    deleteRole,

    users,
    loadUsers,
    saveUser,
    deleteUser,
    getUserRoles,
    assignUserRoles,

    processes,
    loadProcesses,
    saveProcess,
    deleteProcess,

    actions,
    loadActions,

    roleAuthorities,
    loadRoleAuthority,
    saveRoleAuthority,

    roleDataAuthorities,
    loadRoleDataAuthority,
    saveRoleDataAuthority,

    loading,
    error,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}

export { OrganizationContext };
