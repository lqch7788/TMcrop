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
  const store = useOrganizationStore();

  const value: OrganizationContextValue = {
    organizations: store.organizations,
    loadOrganizations: store.loadOrganizations,
    saveOrganization: store.saveOrganization,
    deleteOrganization: store.deleteOrganization,

    roles: store.roles,
    loadRoles: store.loadRoles,
    saveRole: store.saveRole,
    deleteRole: store.deleteRole,

    users: store.users,
    loadUsers: store.loadUsers,
    saveUser: store.saveUser,
    deleteUser: store.deleteUser,
    getUserRoles: store.getUserRoles,
    assignUserRoles: store.assignUserRoles,

    processes: store.processes,
    loadProcesses: store.loadProcesses,
    saveProcess: store.saveProcess,
    deleteProcess: store.deleteProcess,

    actions: store.actions,
    loadActions: store.loadActions,

    roleAuthorities: store.roleAuthorities,
    loadRoleAuthority: store.loadRoleAuthority,
    saveRoleAuthority: store.saveRoleAuthority,

    roleDataAuthorities: store.roleDataAuthorities,
    loadRoleDataAuthority: store.loadRoleDataAuthority,
    saveRoleDataAuthority: store.saveRoleDataAuthority,

    loading: store.loading,
    error: store.error,
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
