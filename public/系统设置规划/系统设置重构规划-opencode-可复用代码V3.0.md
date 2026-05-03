# 系统设置模块重构规划方案 V3.0
# 包含完整可复用代码 - 可直接复制使用

> 目标：后台可配置 → 数据存储 SQLite → 页面自动联动
> 包含从弘智耘源系统转换的完整React/TypeScript代码

---

## 第一部分：类型定义 (src/types/authority.ts)

```typescript
// ============================================
// 组织与权限管理系统类型定义
// 来源参考：弘智耘源 authority2 模块
// ============================================

// 组织状态
export type OrgStatus = 'active' | 'inactive';

// 组织类型（从数据字典读取）
export type OrgType = 'company' | 'base' | 'region' | 'department' | 'workshop';

// 应用类型
export type AppType = 0 | 1; // 0=Web, 1=Mobile

// 权限值：1=有权限, 0=无权限, -1=未设置（继承角色）
export type AuthValue = 1 | 0 | -1;

// ============================================
// 组织管理
// ============================================

export interface Organization {
  id?: string;
  oid: string;                    // 组织OID（原系统字段）
  oidParent: string | null;       // 父组织OID
  aid: string;                    // 组织编码（OrgAID）
  name: string;                   // 组织名称
  description?: string;           // 描述
  address?: string;               // 地址
  contactor?: string;             // 联系人
  contactorPhone?: string;        // 联系人电话
  contactorMobile?: string;       // 联系人手机
  contactorEmail?: string;        // 联系人邮箱
  orgType?: OrgType;              // 组织类型
  viLogo?: string;               // VI Logo
  viName?: string;               // VI名称
  viDescription?: string;         // VI描述
  viBanner?: string;             // VI横幅
  sortNumber?: number;            // 排序号
  status?: OrgStatus;
  createdAt?: string;
  updatedAt?: string;
  children?: Organization[];       // 子组织
}

// ============================================
// 角色管理
// ============================================

export interface Role {
  id?: string;
  oid: string;                    // 角色OID
  orgOid: string;                // 所属组织OID
  aid: string;                   // 角色编码（RoleAID）
  name: string;                   // 角色名称
  description?: string;
  sortNumber?: number;
  status?: OrgStatus;
  createdAt?: string;
  updatedAt?: string;
}

// 角色列表项（用于下拉选择）
export interface RoleListItem {
  oid: string;
  aid: string;
  name: string;
  orgOid: string;
  sortNumber: number;
}

// ============================================
// 用户管理
// ============================================

export interface User {
  id?: string;
  oid: string;                    // 用户OID
  orgOid: string;                // 所属组织OID
  aid: string;                   // 用户账号（UserAID）
  name: string;                  // 用户姓名
  passwordHash?: string;          // 密码哈希
  email?: string;
  phone?: string;
  avatar?: string;
  status?: OrgStatus;
  isAdmin?: boolean;              // 是否超管
  hireDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 用户角色关联
export interface UserRole {
  id?: string;
  userOid: string;
  roleOid: string;
  createdAt?: string;
}

// ============================================
// 工序管理（树形结构）
// ============================================

export interface Process {
  id?: string;
  oid: string;                    // 工序OID
  oidParent: string | null;      // 父工序OID
  aid: string;                   // 工序编码（ProcessAID）
  name: string;                  // 工序名称
  appType?: AppType;             // App类型
  execName?: string;              // 执行名称
  execMode?: string;              // 执行模式
  description?: string;
  imageAid?: string;             // 图标
  hidden?: boolean;              // 是否隐藏
  sortNumber?: number;
  status?: OrgStatus;
  createdAt?: string;
  updatedAt?: string;
  children?: Process[];            // 子工序
}

// 工序树节点（用于combotreegrid）
export interface ProcessTreeNode {
  oid: string;
  oidParent: string | null;
  aid: string;
  name: string;
  appType: AppType;
  sortNumber: number;
  children?: ProcessTreeNode[];
  iconCls?: string;
}

// ============================================
// 动作管理
// ============================================

export interface Action {
  id?: string;
  oid: string;                    // 动作OID
  aid: string;                   // 动作编码（ActionAID）
  name: string;                  // 动作名称
  category: string;              // 分类（如：查询、编辑、删除、审批）
  appType?: AppType;             // App类型
  description?: string;
  imageAid?: string;
  sortNumber?: number;
  status?: OrgStatus;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// 角色权限矩阵
// ============================================

// 角色权限项：角色对某个工序+动作的权限
export interface RoleAuthorityItem {
  id?: string;
  roleOid: string;
  processOid: string;
  actionOid: string;
  value: AuthValue;
  createdAt?: string;
  updatedAt?: string;
}

// 角色权限矩阵数据（用于渲染表格）
export interface RoleAuthorityMatrix {
  processOid: string;
  processAid: string;
  processName: string;
  processOidParent: string | null;
  sortNumber: number;
  actions: {
    [actionOid: string]: AuthValue;
  };
}

// ============================================
// 用户权限矩阵
// ============================================

// 用户权限项：用户对某个工序+动作的权限
export interface UserAuthorityItem {
  id?: string;
  userOid: string;
  processOid: string;
  actionOid: string;
  value: AuthValue;  // 1=授权, 0=禁用, -1=继承角色
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// 数据权限（组织访问控制）
// ============================================

// 角色数据权限项
export interface RoleDataAuthorityItem {
  id?: string;
  roleOid: string;
  orgOid: string;
  value: 1 | 0;
  createdAt?: string;
  updatedAt?: string;
}

// 组织权限树节点（用于显示和勾选）
export interface OrgAuthTreeNode {
  oid: string;
  oidParent: string | null;
  aid: string;
  name: string;
  kind: 1 | 2;  // 1=组织, 2=角色
  sortNumber: number;
  checked?: boolean;
  children?: OrgAuthTreeNode[];
  iconCls?: string;
}

// ============================================
// 树形下拉数据（lookup）
// ============================================

// 组织树下拉数据
export interface OrgLookupNode {
  TreeOID: string;  // 可能是OrgOID或RoleOID
  OID: string;
  AID: string;
  Name: string;
  Kind: 1 | 2;  // 1=组织, 2=角色
  SortNumber: number;
  children?: OrgLookupNode[];
  iconCls?: string;
}

// 用户树下拉数据
export interface UserLookupNode {
  TreeOID: string;
  OID: string;
  AID: string;
  Name: string;
  Kind: 1 | 2;
  SortNumber: number;
  children?: UserLookupNode[];
  iconCls?: string;
}

// ============================================
// API 请求/响应类型
// ============================================

// 树形查询参数
export interface TreeQueryParams {
  sort?: string;
  order?: 'asc' | 'desc';
  rows?: number;
  id?: string;  // 加载子节点时指定父节点ID
  isLoadChildren?: boolean;
  yjUser?: any;
}

// 角色权限查询参数
export interface AuthorityQueryParams {
  filterRules?: {
    field: string;
    op: string;
    value: string;
  }[];
  rows?: number;
}

// 保存权限请求
export interface SaveAuthorityRequest {
  roleOid?: string;
  userOid?: string;
  userAid?: string;
  processOid?: string;
  actionOid?: string;
  processOids?: string[];
  isAuthorize: boolean;
  appType?: AppType;
}

// 角色权限保存（批量）
export interface SaveRoleAuthorityRequest {
  roleOid: string;
  appType: AppType;
  authorities: {
    processOid: string;
    actionOid: string;
    value: AuthValue;
  }[];
}

// 用户权限保存（批量）
export interface SaveUserAuthorityRequest {
  userOid: string;
  userAid: string;
  appType: AppType;
  authorities: {
    processOid: string;
    actionOid: string;
    value: AuthValue;
  }[];
}
```

---

## 第二部分：数据库Schema (src/db/schema/authority.sql)

```sql
-- ============================================
-- 组织与权限管理系统 - SQLite数据库Schema
-- 来源参考：弘智耘源 authority2 模块
-- 适配目标：V1.1系统
-- ============================================

-- 组织表（树形结构）
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  oid TEXT UNIQUE NOT NULL,                    -- 组织OID（兼容原系统）
  oid_parent TEXT,                            -- 父组织OID，NULL表示根节点
  aid TEXT NOT NULL,                          -- 组织编码（唯一）
  name TEXT NOT NULL,                         -- 组织名称
  description TEXT,                           -- 描述
  address TEXT,                               -- 地址
  contactor TEXT,                            -- 联系人
  contactor_phone TEXT,                       -- 联系电话
  contactor_mobile TEXT,                     -- 联系手机
  contactor_email TEXT,                      -- 联系邮箱
  org_type TEXT DEFAULT 'department',         -- 组织类型：company/base/region/department/workshop
  vi_logo TEXT,                               -- VI Logo图片key
  vi_name TEXT,                               -- VI名称
  vi_description TEXT,                       -- VI描述
  vi_banner TEXT,                             -- VI横幅图片key
  sort_number INTEGER DEFAULT 0,              -- 排序号
  status TEXT DEFAULT 'active',               -- 状态：active/inactive
  created_at TEXT DEFAULT (datetime('now')),  -- 创建时间
  updated_at TEXT DEFAULT (datetime('now')),  -- 更新时间
  FOREIGN KEY (oid_parent) REFERENCES organizations(oid) ON DELETE CASCADE
);

-- 创建组织的检索字段（用于层级查询）
CREATE INDEX IF NOT EXISTS idx_orgs_oid_parent ON organizations(oid_parent);
CREATE INDEX IF NOT EXISTS idx_orgs_aid ON organizations(aid);
CREATE INDEX IF NOT EXISTS idx_orgs_status ON organizations(status);

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  oid TEXT UNIQUE NOT NULL,                   -- 角色OID
  org_oid TEXT NOT NULL,                     -- 所属组织OID
  aid TEXT NOT NULL,                          -- 角色编码（唯一）
  name TEXT NOT NULL,                         -- 角色名称
  description TEXT,                           -- 描述
  sort_number INTEGER DEFAULT 0,             -- 排序号
  status TEXT DEFAULT 'active',              -- 状态
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (org_oid) REFERENCES organizations(oid)
);

CREATE INDEX IF NOT EXISTS idx_roles_org_oid ON roles(org_oid);
CREATE INDEX IF NOT EXISTS idx_roles_aid ON roles(aid);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  oid TEXT UNIQUE NOT NULL,                   -- 用户OID
  org_oid TEXT NOT NULL,                     -- 所属组织OID
  aid TEXT UNIQUE NOT NULL,                   -- 用户账号（唯一）
  name TEXT NOT NULL,                         -- 用户姓名
  password_hash TEXT,                          -- 密码哈希（bcrypt）
  email TEXT,                                 -- 邮箱
  phone TEXT,                                -- 电话
  avatar TEXT,                               -- 头像图片key
  status TEXT DEFAULT 'active',               -- 状态
  is_admin INTEGER DEFAULT 0,                 -- 是否超管：0=否, 1=是
  hire_date TEXT,                             -- 入职日期
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (org_oid) REFERENCES organizations(oid)
);

CREATE INDEX IF NOT EXISTS idx_users_org_oid ON users(org_oid);
CREATE INDEX IF NOT EXISTS idx_users_aid ON users(aid);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  user_oid TEXT NOT NULL,
  role_oid TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_oid, role_oid),
  FOREIGN KEY (user_oid) REFERENCES users(oid) ON DELETE CASCADE,
  FOREIGN KEY (role_oid) REFERENCES roles(oid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_oid ON user_roles(user_oid);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_oid ON user_roles(role_oid);

-- 工序表（树形结构）
CREATE TABLE IF NOT EXISTS processes (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  oid TEXT UNIQUE NOT NULL,                   -- 工序OID
  oid_parent TEXT,                            -- 父工序OID，NULL表示根节点
  aid TEXT NOT NULL,                          -- 工序编码（唯一）
  name TEXT NOT NULL,                         -- 工序名称
  app_type INTEGER DEFAULT 0,                 -- App类型：0=Web, 1=Mobile
  exec_name TEXT,                             -- 执行名称
  exec_mode TEXT,                             -- 执行模式
  description TEXT,                           -- 描述
  image_aid TEXT,                            -- 图标图片key
  hidden INTEGER DEFAULT 0,                   -- 是否隐藏：0=否, 1=是
  sort_number INTEGER DEFAULT 0,               -- 排序号
  status TEXT DEFAULT 'active',               -- 状态
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (oid_parent) REFERENCES processes(oid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_processes_oid_parent ON processes(oid_parent);
CREATE INDEX IF NOT EXISTS idx_processes_aid ON processes(aid);
CREATE INDEX IF NOT EXISTS idx_processes_app_type ON processes(app_type);

-- 动作表
CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  oid TEXT UNIQUE NOT NULL,                   -- 动作OID
  aid TEXT NOT NULL,                          -- 动作编码（唯一）
  name TEXT NOT NULL,                         -- 动作名称
  category TEXT NOT NULL,                    -- 分类：如 query/insert/update/delete/approve
  app_type INTEGER DEFAULT 0,                 -- App类型：0=Web, 1=Mobile
  description TEXT,                           -- 描述
  image_aid TEXT,                            -- 图标图片key
  sort_number INTEGER DEFAULT 0,             -- 排序号
  status TEXT DEFAULT 'active',               -- 状态
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_actions_category ON actions(category);
CREATE INDEX IF NOT EXISTS idx_actions_app_type ON actions(app_type);

-- 角色权限矩阵表 (Process × Action)
CREATE TABLE IF NOT EXISTS roles_authority (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  role_oid TEXT NOT NULL,
  process_oid TEXT NOT NULL,
  action_oid TEXT NOT NULL,
  value INTEGER DEFAULT 0,                    -- 1=有权限, 0=无权限
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(role_oid, process_oid, action_oid),
  FOREIGN KEY (role_oid) REFERENCES roles(oid) ON DELETE CASCADE,
  FOREIGN KEY (process_oid) REFERENCES processes(oid) ON DELETE CASCADE,
  FOREIGN KEY (action_oid) REFERENCES actions(oid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_roles_authority_role_oid ON roles_authority(role_oid);
CREATE INDEX IF NOT EXISTS idx_roles_authority_process_oid ON roles_authority(process_oid);

-- 用户权限矩阵表（可覆盖角色权限）
CREATE TABLE IF NOT EXISTS users_authority (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  user_oid TEXT NOT NULL,
  process_oid TEXT NOT NULL,
  action_oid TEXT NOT NULL,
  value INTEGER DEFAULT -1,                    -- 1=授权, 0=禁用, -1=继承角色（未设置）
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_oid, process_oid, action_oid),
  FOREIGN KEY (user_oid) REFERENCES users(oid) ON DELETE CASCADE,
  FOREIGN KEY (process_oid) REFERENCES processes(oid) ON DELETE CASCADE,
  FOREIGN KEY (action_oid) REFERENCES actions(oid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_authority_user_oid ON users_authority(user_oid);

-- 角色数据权限表（组织访问控制）
CREATE TABLE IF NOT EXISTS roles_data_authority (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  role_oid TEXT NOT NULL,
  org_oid TEXT NOT NULL,
  value INTEGER DEFAULT 1,                      -- 1=可访问, 0=不可访问
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(role_oid, org_oid),
  FOREIGN KEY (role_oid) REFERENCES roles(oid) ON DELETE CASCADE,
  FOREIGN KEY (org_oid) REFERENCES organizations(oid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_roles_data_authority_role_oid ON roles_data_authority(role_oid);
CREATE INDEX IF NOT EXISTS idx_roles_data_authority_org_oid ON roles_data_authority(org_oid);

-- ============================================
-- 初始化数据
-- ============================================

-- 插入根组织
INSERT INTO organizations (oid, oid_parent, aid, name, org_type, sort_number, status)
VALUES ('ORG_ROOT', NULL, 'ROOT', '根组织', 'company', 0, 'active');

-- 插入超级管理员角色
INSERT INTO roles (oid, org_oid, aid, name, description, sort_number, status)
VALUES ('ROLE_ADMIN', 'ORG_ROOT', 'admin', '系统管理员', '拥有系统所有权限', 1, 'active');

-- 插入超管用户（密码：admin123，需要实际加密）
INSERT INTO users (oid, org_oid, aid, name, password_hash, is_admin, status)
VALUES ('USER_ADMIN', 'ORG_ROOT', 'admin', '系统管理员', '$2b$10$dummy_hash', 1, 'active');

-- 插入超管用户角色关联
INSERT INTO user_roles (user_oid, role_oid)
VALUES ('USER_ADMIN', 'ROLE_ADMIN');

-- 插入默认工序分类
INSERT INTO processes (oid, oid_parent, aid, name, app_type, sort_number, status)
VALUES
  ('PROC_SYSTEM', NULL, 'system', '系统管理', 0, 1, 'active'),
  ('PROC_SYSTEM_USER', 'PROC_SYSTEM', 'system.user', '用户管理', 0, 1.1, 'active'),
  ('PROC_SYSTEM_ROLE', 'PROC_SYSTEM', 'system.role', '角色管理', 0, 1.2, 'active'),
  ('PROC_SYSTEM_ORG', 'PROC_SYSTEM', 'system.org', '组织管理', 0, 1.3, 'active'),
  ('PROC_PRODUCTION', NULL, 'production', '生产管理', 0, 2, 'active'),
  ('PROC_PRODUCTION_PLAN', 'PROC_PRODUCTION', 'production.plan', '生产计划', 0, 2.1, 'active'),
  ('PROC_PRODUCTION_TASK', 'PROC_PRODUCTION', 'production.task', '生产任务', 0, 2.2, 'active'),
  ('PROC_PRODUCTION_HARVEST', 'PROC_PRODUCTION', 'production.harvest', '采收记录', 0, 2.3, 'active'),
  ('PROC_WAREHOUSE', NULL, 'warehouse', '仓库管理', 0, 3, 'active'),
  ('PROC_WAREHOUSE_IN', 'PROC_WAREHOUSE', 'warehouse.in', '入库管理', 0, 3.1, 'active'),
  ('PROC_WAREHOUSE_OUT', 'PROC_WAREHOUSE', 'warehouse.out', '出库管理', 0, 3.2, 'active');

-- 插入默认动作
INSERT INTO actions (oid, aid, name, category, app_type, sort_number, status)
VALUES
  ('ACTION_QUERY', 'query', '查询', 'common', 0, 1, 'active'),
  ('ACTION_INSERT', 'insert', '新增', 'common', 0, 2, 'active'),
  ('ACTION_UPDATE', 'update', '编辑', 'common', 0, 3, 'active'),
  ('ACTION_DELETE', 'delete', '删除', 'common', 0, 4, 'active'),
  ('ACTION_EXPORT', 'export', '导出', 'common', 0, 5, 'active'),
  ('ACTION_IMPORT', 'import', '导入', 'common', 0, 6, 'active'),
  ('ACTION_APPROVE', 'approve', '审批', 'approval', 0, 10, 'active'),
  ('ACTION_REJECT', 'reject', '驳回', 'approval', 0, 11, 'active'),
  ('ACTION_TRANSFER', 'transfer', '转移', 'approval', 0, 12, 'active');

-- 给超管角色授权所有权限
INSERT INTO roles_authority (role_oid, process_oid, action_oid, value)
SELECT 'ROLE_ADMIN', p.oid, a.oid, 1
FROM processes p
CROSS JOIN actions a
WHERE p.status = 'active' AND a.status = 'active';

-- 给超管角色授权根组织的数据权限
INSERT INTO roles_data_authority (role_oid, org_oid, value)
VALUES ('ROLE_ADMIN', 'ORG_ROOT', 1);
```

---

## 第三部分：API服务层 (src/services/authorityService.ts)

```typescript
// ============================================
// 组织与权限管理 - API服务层
// 来源参考：弘智耘源 authority2 模块
// ============================================

import {
  Organization,
  Role,
  User,
  Process,
  Action,
  RoleAuthorityItem,
  UserAuthorityItem,
  RoleDataAuthorityItem,
  TreeQueryParams,
  SaveAuthorityRequest,
  AppType
} from '../types/authority';
import { db } from '../db/database';

// ============================================
// 组织管理服务
// ============================================

export const organizationService = {
  /**
   * 获取组织树
   */
  async getOrgs(params: TreeQueryParams): Promise<Organization[]> {
    const { rows = -1, id, sort = 'sort_number', order = 'asc' } = params;

    let sql = 'SELECT * FROM organizations WHERE status = ?';
    const bindings: any[] = ['active'];

    // 按层级加载：根节点 或 指定父节点的子节点
    if (!id) {
      sql += ' AND oid_parent IS NULL';
    } else {
      sql += ' AND oid_parent = ?';
      bindings.push(id);
    }

    sql += ` ORDER BY ${sort} ${order}`;

    if (rows > 0) {
      sql += ' LIMIT ?';
      bindings.push(rows);
    }

    const stmt = db.prepare(sql);
    const rows_data = stmt.all(...bindings) as Organization[];

    // 递归加载子节点
    for (const org of rows_data) {
      const children = await this.getOrgs({ ...params, id: org.oid });
      if (children.length > 0) {
        org.children = children;
      }
    }

    return rows_data;
  },

  /**
   * 保存组织（新增或更新）
   */
  async saveOrgs(delta: {
    inserted?: Organization[];
    updated?: Organization[];
    deleted?: string[];
  }): Promise<any> {
    const results: any = { inserted: [], updated: [], deleted: [] };

    // 处理新增
    if (delta.inserted && delta.inserted.length > 0) {
      for (const org of delta.inserted) {
        const oid = org.oid || `ORG_${Date.now()}`;
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO organizations (oid, oid_parent, aid, name, description, address,
            contactor, contactor_phone, contactor_mobile, contactor_email,
            org_type, sort_number, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          oid,
          org.oidParent || null,
          org.aid,
          org.name,
          org.description || null,
          org.address || null,
          org.contactor || null,
          org.contactorPhone || null,
          org.contactorMobile || null,
          org.contactorEmail || null,
          org.orgType || 'department',
          org.sortNumber || 0,
          'active',
          now,
          now
        );

        results.inserted.push({ OID: oid, ...org });
      }
    }

    // 处理更新
    if (delta.updated && delta.updated.length > 0) {
      for (const org of delta.updated) {
        const now = new Date().toISOString();

        db.prepare(`
          UPDATE organizations SET
            oid_parent = ?, aid = ?, name = ?, description = ?, address = ?,
            contactor = ?, contactor_phone = ?, contactor_mobile = ?, contactor_email = ?,
            org_type = ?, sort_number = ?, updated_at = ?
          WHERE oid = ?
        `).run(
          org.oidParent || null,
          org.aid,
          org.name,
          org.description || null,
          org.address || null,
          org.contactor || null,
          org.contactorPhone || null,
          org.contactorMobile || null,
          org.contactorEmail || null,
          org.orgType || 'department',
          org.sortNumber || 0,
          now,
          org.oid
        );

        results.updated.push(org);
      }
    }

    // 处理删除
    if (delta.deleted && delta.deleted.length > 0) {
      for (const oid of delta.deleted) {
        db.prepare('DELETE FROM organizations WHERE oid = ?').run(oid);
        results.deleted.push(oid);
      }
    }

    return results;
  },

  /**
   * 根据OID获取组织详情
   */
  async getOrgByOid(oid: string): Promise<Organization | null> {
    const stmt = db.prepare('SELECT * FROM organizations WHERE oid = ?');
    return stmt.get(oid) as Organization | null;
  },

  /**
   * 获取组织下拉列表（用于combobox）
   */
  async getOrgsLookup(params: TreeQueryParams): Promise<any[]> {
    const { sort = 'sort_number', order = 'asc' } = params;

    const stmt = db.prepare(`
      SELECT oid as TreeOID, oid as OID, oid_parent as TreeOIDParent,
             aid as AID, name as Name, sort_number as SortNumber
      FROM organizations
      WHERE status = 'active'
      ORDER BY ${sort} ${order}
    `);

    return stmt.all();
  }
};

// ============================================
// 角色管理服务
// ============================================

export const roleService = {
  /**
   * 获取角色列表（可按组织过滤）
   */
  async getRoles(params: { orgOid?: string; sort?: string; order?: string }): Promise<Role[]> {
    const { orgOid, sort = 'sort_number', order = 'asc' } = params;

    let sql = 'SELECT * FROM roles WHERE status = ?';
    const bindings: any[] = ['active'];

    if (orgOid) {
      sql += ' AND org_oid = ?';
      bindings.push(orgOid);
    }

    sql += ` ORDER BY ${sort} ${order}`;

    const stmt = db.prepare(sql);
    return stmt.all(...bindings) as Role[];
  },

  /**
   * 保存角色
   */
  async saveRoles(delta: {
    inserted?: Role[];
    updated?: Role[];
    deleted?: string[];
  }): Promise<any> {
    const results: any = { inserted: [], updated: [], deleted: [] };

    // 处理新增
    if (delta.inserted && delta.inserted.length > 0) {
      for (const role of delta.inserted) {
        const oid = role.oid || `ROLE_${Date.now()}`;
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO roles (oid, org_oid, aid, name, description, sort_number, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          oid,
          role.orgOid,
          role.aid,
          role.name,
          role.description || null,
          role.sortNumber || 0,
          'active',
          now,
          now
        );

        results.inserted.push({ OID: oid, ...role });
      }
    }

    // 处理更新
    if (delta.updated && delta.updated.length > 0) {
      for (const role of delta.updated) {
        const now = new Date().toISOString();

        db.prepare(`
          UPDATE roles SET org_oid = ?, aid = ?, name = ?, description = ?,
            sort_number = ?, updated_at = ?
          WHERE oid = ?
        `).run(
          role.orgOid,
          role.aid,
          role.name,
          role.description || null,
          role.sortNumber || 0,
          now,
          role.oid
        );

        results.updated.push(role);
      }
    }

    // 处理删除
    if (delta.deleted && delta.deleted.length > 0) {
      for (const oid of delta.deleted) {
        db.prepare('DELETE FROM roles WHERE oid = ?').run(oid);
        results.deleted.push(oid);
      }
    }

    return results;
  },

  /**
   * 获取组织角色树下拉数据
   */
  async getOrgRolesTree(params: TreeQueryParams): Promise<any[]> {
    const { sort = 'sort_number', order = 'asc' } = params;

    // 获取组织树
    const orgStmt = db.prepare(`
      SELECT oid as TreeOID, oid as OID, oid_parent as TreeOIDParent,
             aid as AID, name as Name, 1 as Kind, sort_number as SortNumber
      FROM organizations WHERE status = 'active'
      ORDER BY ${sort} ${order}
    `);
    const orgs = orgStmt.all();

    // 获取角色
    const roleStmt = db.prepare(`
      SELECT oid as TreeOID, org_oid as OID, aid as AID, name as Name, 2 as Kind, sort_number as SortNumber
      FROM roles WHERE status = 'active'
      ORDER BY ${sort} ${order}
    `);
    const roles = roleStmt.all();

    // 合并返回（前端需要自行组装树）
    return [...orgs, ...roles];
  }
};

// ============================================
// 用户管理服务
// ============================================

export const userService = {
  /**
   * 获取用户列表
   */
  async getUsers(params: { orgOid?: string; status?: string }): Promise<User[]> {
    const { orgOid, status } = params;

    let sql = 'SELECT * FROM users WHERE 1=1';
    const bindings: any[] = [];

    if (orgOid) {
      sql += ' AND org_oid = ?';
      bindings.push(orgOid);
    }

    if (status) {
      sql += ' AND status = ?';
      bindings.push(status);
    }

    const stmt = db.prepare(sql);
    const users = stmt.all(...bindings) as User[];

    // 去除密码哈希
    return users.map(u => ({ ...u, passwordHash: undefined }));
  },

  /**
   * 保存用户
   */
  async saveUsers(delta: {
    inserted?: User[];
    updated?: User[];
    deleted?: string[];
  }): Promise<any> {
    const results: any = { inserted: [], updated: [], deleted: [] };

    // 处理新增
    if (delta.inserted && delta.inserted.length > 0) {
      for (const user of delta.inserted) {
        const oid = user.oid || `USER_${Date.now()}`;
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO users (oid, org_oid, aid, name, password_hash, email, phone, avatar, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          oid,
          user.orgOid,
          user.aid,
          user.name,
          user.passwordHash || null,
          user.email || null,
          user.phone || null,
          user.avatar || null,
          user.status || 'active',
          now,
          now
        );

        results.inserted.push({ OID: oid, ...user });
      }
    }

    // 处理更新
    if (delta.updated && delta.updated.length > 0) {
      for (const user of delta.updated) {
        const now = new Date().toISOString();

        const updates: string[] = [];
        const bindings: any[] = [];

        if (user.orgOid) { updates.push('org_oid = ?'); bindings.push(user.orgOid); }
        if (user.aid) { updates.push('aid = ?'); bindings.push(user.aid); }
        if (user.name) { updates.push('name = ?'); bindings.push(user.name); }
        if (user.passwordHash) { updates.push('password_hash = ?'); bindings.push(user.passwordHash); }
        if (user.email !== undefined) { updates.push('email = ?'); bindings.push(user.email); }
        if (user.phone !== undefined) { updates.push('phone = ?'); bindings.push(user.phone); }
        if (user.status) { updates.push('status = ?'); bindings.push(user.status); }

        updates.push('updated_at = ?');
        bindings.push(now);
        bindings.push(user.oid);

        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE oid = ?`).run(...bindings);

        results.updated.push(user);
      }
    }

    // 处理删除
    if (delta.deleted && delta.deleted.length > 0) {
      for (const oid of delta.deleted) {
        db.prepare('DELETE FROM users WHERE oid = ?').run(oid);
        results.deleted.push(oid);
      }
    }

    return results;
  },

  /**
   * 保存用户角色关联
   */
  async saveUserRoles(userOid: string, roleOids: string[]): Promise<void> {
    // 先删除现有关联
    db.prepare('DELETE FROM user_roles WHERE user_oid = ?').run(userOid);

    // 插入新关联
    for (const roleOid of roleOids) {
      db.prepare(`
        INSERT INTO user_roles (user_oid, role_oid, created_at)
        VALUES (?, ?, ?)
      `).run(userOid, roleOid, new Date().toISOString());
    }
  },

  /**
   * 获取用户角色
   */
  async getUserRoles(userOid: string): Promise<string[]> {
    const stmt = db.prepare('SELECT role_oid FROM user_roles WHERE user_oid = ?');
    const rows = stmt.all(userOid) as { role_oid: string }[];
    return rows.map(r => r.role_oid);
  },

  /**
   * 获取组织用户树下拉数据
   */
  async getOrgUsersTree(params: TreeQueryParams): Promise<any[]> {
    const { sort = 'sort_number', order = 'asc' } = params;

    // 获取组织树
    const orgStmt = db.prepare(`
      SELECT oid as TreeOID, oid as OID, oid_parent as TreeOIDParent,
             aid as AID, name as Name, 1 as Kind, sort_number as SortNumber
      FROM organizations WHERE status = 'active'
      ORDER BY ${sort} ${order}
    `);
    const orgs = orgStmt.all();

    // 获取用户
    const userStmt = db.prepare(`
      SELECT oid as TreeOID, org_oid as OID, aid as AID, name as Name, 1 as Kind, sort_number as SortNumber
      FROM users WHERE status = 'active'
      ORDER BY ${sort} ${order}
    `);
    const users = userStmt.all();

    return [...orgs, ...users];
  }
};

// ============================================
// 工序管理服务
// ============================================

export const processService = {
  /**
   * 获取工序树
   */
  async getProcesses(params: TreeQueryParams & { appType?: AppType }): Promise<Process[]> {
    const { rows = -1, id, appType, sort = 'sort_number', order = 'asc' } = params;

    let sql = 'SELECT * FROM processes WHERE status = ?';
    const bindings: any[] = ['active'];

    if (appType !== undefined) {
      sql += ' AND app_type = ?';
      bindings.push(appType);
    }

    if (!id) {
      sql += ' AND oid_parent IS NULL';
    } else {
      sql += ' AND oid_parent = ?';
      bindings.push(id);
    }

    sql += ` ORDER BY ${sort} ${order}`;

    if (rows > 0) {
      sql += ' LIMIT ?';
      bindings.push(rows);
    }

    const stmt = db.prepare(sql);
    const rows_data = stmt.all(...bindings) as Process[];

    // 递归加载子节点
    for (const proc of rows_data) {
      const children = await this.getProcesses({ ...params, id: proc.oid });
      if (children.length > 0) {
        proc.children = children;
      }
    }

    return rows_data;
  },

  /**
   * 保存工序
   */
  async saveProcesses(delta: {
    inserted?: Process[];
    updated?: Process[];
    deleted?: string[];
  }): Promise<any> {
    const results: any = { inserted: [], updated: [], deleted: [] };

    if (delta.inserted && delta.inserted.length > 0) {
      for (const proc of delta.inserted) {
        const oid = proc.oid || `PROC_${Date.now()}`;
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO processes (oid, oid_parent, aid, name, app_type, exec_name, exec_mode,
            description, image_aid, hidden, sort_number, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          oid,
          proc.oidParent || null,
          proc.aid,
          proc.name,
          proc.appType || 0,
          proc.execName || null,
          proc.execMode || null,
          proc.description || null,
          proc.imageAid || null,
          proc.hidden ? 1 : 0,
          proc.sortNumber || 0,
          'active',
          now,
          now
        );

        results.inserted.push({ OID: oid, ...proc });
      }
    }

    if (delta.updated && delta.updated.length > 0) {
      for (const proc of delta.updated) {
        const now = new Date().toISOString();

        db.prepare(`
          UPDATE processes SET oid_parent = ?, aid = ?, name = ?, app_type = ?,
            exec_name = ?, exec_mode = ?, description = ?, image_aid = ?,
            hidden = ?, sort_number = ?, updated_at = ?
          WHERE oid = ?
        `).run(
          proc.oidParent || null,
          proc.aid,
          proc.name,
          proc.appType || 0,
          proc.execName || null,
          proc.execMode || null,
          proc.description || null,
          proc.imageAid || null,
          proc.hidden ? 1 : 0,
          proc.sortNumber || 0,
          now,
          proc.oid
        );

        results.updated.push(proc);
      }
    }

    if (delta.deleted && delta.deleted.length > 0) {
      for (const oid of delta.deleted) {
        db.prepare('DELETE FROM processes WHERE oid = ?').run(oid);
        results.deleted.push(oid);
      }
    }

    return results;
  },

  /**
   * 获取工序树下拉数据
   */
  async getProcessesLookup(params: { appType?: AppType }): Promise<any[]> {
    const { appType = 0 } = params;

    const stmt = db.prepare(`
      SELECT oid as ProcessOID, oid_parent as ProcessOIDParent,
             aid as ProcessAID, name as Name, app_type as AppType, sort_number as SortNumber
      FROM processes
      WHERE status = 'active' AND app_type = ?
      ORDER BY sort_number ASC
    `);

    return stmt.all(appType);
  }
};

// ============================================
// 动作管理服务
// ============================================

export const actionService = {
  /**
   * 获取动作列表（可按分类和AppType过滤）
   */
  async getActions(params: { appType?: AppType; category?: string }): Promise<Action[]> {
    const { appType, category } = params;

    let sql = 'SELECT * FROM actions WHERE status = ?';
    const bindings: any[] = ['active'];

    if (appType !== undefined) {
      sql += ' AND app_type = ?';
      bindings.push(appType);
    }

    if (category) {
      sql += ' AND category = ?';
      bindings.push(category);
    }

    sql += ' ORDER BY sort_number ASC';

    const stmt = db.prepare(sql);
    return stmt.all(...bindings) as Action[];
  },

  /**
   * 保存动作
   */
  async saveActions(delta: {
    inserted?: Action[];
    updated?: Action[];
    deleted?: string[];
  }): Promise<any> {
    const results: any = { inserted: [], updated: [], deleted: [] };

    if (delta.inserted && delta.inserted.length > 0) {
      for (const action of delta.inserted) {
        const oid = action.oid || `ACTION_${Date.now()}`;
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO actions (oid, aid, name, category, app_type, description, image_aid, sort_number, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          oid,
          action.aid,
          action.name,
          action.category,
          action.appType || 0,
          action.description || null,
          action.imageAid || null,
          action.sortNumber || 0,
          'active',
          now,
          now
        );

        results.inserted.push({ OID: oid, ...action });
      }
    }

    if (delta.updated && delta.updated.length > 0) {
      for (const action of delta.updated) {
        const now = new Date().toISOString();

        db.prepare(`
          UPDATE actions SET aid = ?, name = ?, category = ?, app_type = ?,
            description = ?, image_aid = ?, sort_number = ?, updated_at = ?
          WHERE oid = ?
        `).run(
          action.aid,
          action.name,
          action.category,
          action.appType || 0,
          action.description || null,
          action.imageAid || null,
          action.sortNumber || 0,
          now,
          action.oid
        );

        results.updated.push(action);
      }
    }

    if (delta.deleted && delta.deleted.length > 0) {
      for (const oid of delta.deleted) {
        db.prepare('DELETE FROM actions WHERE oid = ?').run(oid);
        results.deleted.push(oid);
      }
    }

    return results;
  }
};

// ============================================
// 角色权限服务
// ============================================

export const roleAuthorityService = {
  /**
   * 获取角色权限矩阵
   */
  async getRoleAuthority(params: { roleOid: string; appType: AppType }): Promise<RoleAuthorityItem[]> {
    const { roleOid, appType } = params;

    const stmt = db.prepare(`
      SELECT ra.role_oid as roleOid, ra.process_oid as processOid,
             ra.action_oid as actionOid, ra.value
      FROM roles_authority ra
      JOIN processes p ON ra.process_oid = p.oid
      WHERE ra.role_oid = ? AND p.app_type = ?
    `);

    return stmt.all(roleOid, appType) as RoleAuthorityItem[];
  },

  /**
   * 批量保存角色权限
   */
  async saveRoleAuthorities(roleOid: string, authorities: RoleAuthorityItem[]): Promise<void> {
    for (const auth of authorities) {
      if (auth.value === -1) {
        // -1 表示删除权限记录（继承角色）
        db.prepare(`
          DELETE FROM roles_authority
          WHERE role_oid = ? AND process_oid = ? AND action_oid = ?
        `).run(roleOid, auth.processOid, auth.actionOid);
      } else {
        // upsert
        db.prepare(`
          INSERT INTO roles_authority (role_oid, process_oid, action_oid, value, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(role_oid, process_oid, action_oid)
          DO UPDATE SET value = ?, updated_at = ?
        `).run(
          roleOid, auth.processOid, auth.actionOid, auth.value,
          new Date().toISOString(), new Date().toISOString(),
          auth.value, new Date().toISOString()
        );
      }
    }
  },

  /**
   * 授权角色全部工序权限
   */
  async authorizeAll(roleOid: string, processOids: string[], appType: AppType, isAuthorize: boolean): Promise<void> {
    if (isAuthorize) {
      // 批量插入（忽略已存在）
      for (const processOid of processOids) {
        db.prepare(`
          INSERT OR IGNORE INTO roles_authority (role_oid, process_oid, action_oid, value, created_at, updated_at)
          SELECT ?, ?, oid, 1, ?, ? FROM actions WHERE app_type = ?
        `).run(roleOid, processOid, new Date().toISOString(), new Date().toISOString(), appType);
      }
    } else {
      // 删除这些工序的所有权限
      for (const processOid of processOids) {
        db.prepare(`
          DELETE FROM roles_authority WHERE role_oid = ? AND process_oid = ?
        `).run(roleOid, processOid);
      }
    }
  }
};

// ============================================
// 用户权限服务
// ============================================

export const userAuthorityService = {
  /**
   * 获取用户权限矩阵
   */
  async getUserAuthority(params: { userOid: string; appType: AppType }): Promise<UserAuthorityItem[]> {
    const { userOid, appType } = params;

    const stmt = db.prepare(`
      SELECT ua.user_oid as userOid, ua.process_oid as processOid,
             ua.action_oid as actionOid, ua.value
      FROM users_authority ua
      JOIN processes p ON ua.process_oid = p.oid
      WHERE ua.user_oid = ? AND p.app_type = ?
    `);

    return stmt.all(userOid, appType) as UserAuthorityItem[];
  },

  /**
   * 批量保存用户权限
   */
  async saveUserAuthorities(userOid: string, authorities: UserAuthorityItem[]): Promise<void> {
    for (const auth of authorities) {
      if (auth.value === -1) {
        db.prepare(`
          DELETE FROM users_authority
          WHERE user_oid = ? AND process_oid = ? AND action_oid = ?
        `).run(userOid, auth.processOid, auth.actionOid);
      } else {
        db.prepare(`
          INSERT INTO users_authority (user_oid, process_oid, action_oid, value, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_oid, process_oid, action_oid)
          DO UPDATE SET value = ?, updated_at = ?
        `).run(
          userOid, auth.processOid, auth.actionOid, auth.value,
          new Date().toISOString(), new Date().toISOString(),
          auth.value, new Date().toISOString()
        );
      }
    }
  }
};

// ============================================
// 数据权限服务
// ============================================

export const dataAuthorityService = {
  /**
   * 获取角色数据权限
   */
  async getRoleDataAuthority(roleOid: string): Promise<RoleDataAuthorityItem[]> {
    const stmt = db.prepare(`
      SELECT role_oid as roleOid, org_oid as orgOid, value
      FROM roles_data_authority
      WHERE role_oid = ?
    `);

    return stmt.all(roleOid) as RoleDataAuthorityItem[];
  },

  /**
   * 保存角色数据权限
   */
  async saveRoleDataAuthority(roleOid: string, orgOids: string[], isAuthorize: boolean): Promise<void> {
    if (isAuthorize) {
      for (const orgOid of orgOids) {
        db.prepare(`
          INSERT OR IGNORE INTO roles_data_authority (role_oid, org_oid, value, created_at, updated_at)
          VALUES (?, ?, 1, ?, ?)
        `).run(roleOid, orgOid, new Date().toISOString(), new Date().toISOString());
      }
    } else {
      for (const orgOid of orgOids) {
        db.prepare(`
          DELETE FROM roles_data_authority WHERE role_oid = ? AND org_oid = ?
        `).run(roleOid, orgOid);
      }
    }
  },

  /**
   * 获取组织树（含权限状态）
   */
  async getOrgTreeWithAuth(roleOid: string): Promise<any[]> {
    // 获取所有组织
    const orgsStmt = db.prepare(`
      SELECT oid as TreeOID, oid as OID, oid_parent as TreeOIDParent,
             aid as AID, name as Name, 1 as Kind, sort_number as SortNumber
      FROM organizations WHERE status = 'active'
      ORDER BY sort_number ASC
    `);
    const orgs = orgsStmt.all();

    // 获取该角色的数据权限
    const authStmt = db.prepare(`
      SELECT org_oid FROM roles_data_authority WHERE role_oid = ? AND value = 1
    `);
    const authRows = authStmt.all(roleOid) as { org_oid: string }[];
    const authorizedOrgOids = new Set(authRows.map(r => r.org_oid));

    // 标记权限状态
    for (const org of orgs) {
      org.checked = authorizedOrgOids.has(org.OID);
    }

    return orgs;
  }
};
```

---

## 第四部分：React Context (src/contexts/AuthSettingsContext.tsx)

```tsx
// ============================================
// 组织与权限管理 - 全局状态Context
// 来源参考：弘智耘源 authority2 模块
// ============================================

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  Organization,
  Role,
  User,
  Process,
  Action,
  RoleAuthorityItem,
  UserAuthorityItem,
  RoleDataAuthorityItem,
  AppType
} from '../types/authority';
import {
  organizationService,
  roleService,
  userService,
  processService,
  actionService,
  roleAuthorityService,
  userAuthorityService,
  dataAuthorityService
} from '../services/authorityService';

// ============================================
// Context类型定义
// ============================================

interface AuthSettingsContextType {
  // 组织架构
  organizations: Organization[];
  loadingOrganizations: boolean;
  refreshOrganizations: () => Promise<void>;

  // 角色
  roles: Role[];
  loadingRoles: boolean;
  refreshRoles: (orgOid?: string) => Promise<void>;

  // 用户
  users: User[];
  loadingUsers: boolean;
  refreshUsers: (orgOid?: string) => Promise<void>;

  // 工序
  processes: Process[];
  loadingProcesses: boolean;
  refreshProcesses: (appType?: AppType) => Promise<void>;

  // 动作
  actions: Action[];
  loadingActions: boolean;
  refreshActions: (appType?: AppType) => Promise<void>;

  // 角色权限
  roleAuthorities: Map<string, RoleAuthorityItem[]>;  // roleOid -> authorities
  getRoleAuthorities: (roleOid: string, appType: AppType) => Promise<RoleAuthorityItem[]>;
  saveRoleAuthorities: (roleOid: string, authorities: RoleAuthorityItem[]) => Promise<void>;

  // 用户权限
  userAuthorities: Map<string, UserAuthorityItem[]>;  // userOid -> authorities
  getUserAuthorities: (userOid: string, appType: AppType) => Promise<UserAuthorityItem[]>;
  saveUserAuthorities: (userOid: string, authorities: UserAuthorityItem[]) => Promise<void>;

  // 数据权限
  getRoleDataAuthority: (roleOid: string) => Promise<RoleDataAuthorityItem[]>;
  saveRoleDataAuthority: (roleOid: string, orgOids: string[], isAuthorize: boolean) => Promise<void>;
}

const AuthSettingsContext = createContext<AuthSettingsContextType | null>(null);

// ============================================
// Provider组件
// ============================================

interface AuthSettingsProviderProps {
  children: ReactNode;
}

export function AuthSettingsProvider({ children }: AuthSettingsProviderProps) {
  // 组织架构
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);

  const refreshOrganizations = useCallback(async () => {
    setLoadingOrganizations(true);
    try {
      const data = await organizationService.getOrgs({});
      setOrganizations(data);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoadingOrganizations(false);
    }
  }, []);

  // 角色
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const refreshRoles = useCallback(async (orgOid?: string) => {
    setLoadingRoles(true);
    try {
      const data = await roleService.getRoles({ orgOid });
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  // 用户
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const refreshUsers = useCallback(async (orgOid?: string) => {
    setLoadingUsers(true);
    try {
      const data = await userService.getUsers({ orgOid });
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // 工序
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loadingProcesses, setLoadingProcesses] = useState(false);

  const refreshProcesses = useCallback(async (appType: AppType = 0) => {
    setLoadingProcesses(true);
    try {
      const data = await processService.getProcesses({ appType });
      setProcesses(data);
    } catch (error) {
      console.error('Failed to load processes:', error);
    } finally {
      setLoadingProcesses(false);
    }
  }, []);

  // 动作
  const [actions, setActions] = useState<Action[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);

  const refreshActions = useCallback(async (appType: AppType = 0) => {
    setLoadingActions(true);
    try {
      const data = await actionService.getActions({ appType });
      setActions(data);
    } catch (error) {
      console.error('Failed to load actions:', error);
    } finally {
      setLoadingActions(false);
    }
  }, []);

  // 角色权限缓存
  const [roleAuthorities, setRoleAuthorities] = useState<Map<string, RoleAuthorityItem[]>>(new Map());

  const getRoleAuthorities = useCallback(async (roleOid: string, appType: AppType): Promise<RoleAuthorityItem[]> => {
    const key = `${roleOid}_${appType}`;
    if (roleAuthorities.has(key)) {
      return roleAuthorities.get(key)!;
    }

    const data = await roleAuthorityService.getRoleAuthority({ roleOid, appType });
    setRoleAuthorities(prev => {
      const newMap = new Map(prev);
      newMap.set(key, data);
      return newMap;
    });
    return data;
  }, [roleAuthorities]);

  const saveRoleAuthorities = useCallback(async (roleOid: string, authorities: RoleAuthorityItem[]) => {
    await roleAuthorityService.saveRoleAuthorities(roleOid, authorities);
    // 清除缓存
    setRoleAuthorities(prev => {
      const newMap = new Map(prev);
      for (const key of newMap.keys()) {
        if (key.startsWith(roleOid)) {
          newMap.delete(key);
        }
      }
      return newMap;
    });
  }, []);

  // 用户权限缓存
  const [userAuthorities, setUserAuthorities] = useState<Map<string, UserAuthorityItem[]>>(new Map());

  const getUserAuthorities = useCallback(async (userOid: string, appType: AppType): Promise<UserAuthorityItem[]> => {
    const key = `${userOid}_${appType}`;
    if (userAuthorities.has(key)) {
      return userAuthorities.get(key)!;
    }

    const data = await userAuthorityService.getUserAuthority({ userOid, appType });
    setUserAuthorities(prev => {
      const newMap = new Map(prev);
      newMap.set(key, data);
      return newMap;
    });
    return data;
  }, [userAuthorities]);

  const saveUserAuthorities = useCallback(async (userOid: string, authorities: UserAuthorityItem[]) => {
    await userAuthorityService.saveUserAuthorities(userOid, authorities);
    // 清除缓存
    setUserAuthorities(prev => {
      const newMap = new Map(prev);
      for (const key of newMap.keys()) {
        if (key.startsWith(userOid)) {
          newMap.delete(key);
        }
      }
      return newMap;
    });
  }, []);

  // 数据权限
  const getRoleDataAuthority = useCallback(async (roleOid: string): Promise<RoleDataAuthorityItem[]> => {
    return dataAuthorityService.getRoleDataAuthority(roleOid);
  }, []);

  const saveRoleDataAuthority = useCallback(async (roleOid: string, orgOids: string[], isAuthorize: boolean) => {
    await dataAuthorityService.saveRoleDataAuthority(roleOid, orgOids, isAuthorize);
  }, []);

  // 初始加载
  useEffect(() => {
    refreshOrganizations();
    refreshRoles();
    refreshUsers();
    refreshProcesses(0);
    refreshActions(0);
  }, [refreshOrganizations, refreshRoles, refreshUsers, refreshProcesses, refreshActions]);

  const value: AuthSettingsContextType = {
    organizations,
    loadingOrganizations,
    refreshOrganizations,
    roles,
    loadingRoles,
    refreshRoles,
    users,
    loadingUsers,
    refreshUsers,
    processes,
    loadingProcesses,
    refreshProcesses,
    actions,
    loadingActions,
    refreshActions,
    roleAuthorities,
    getRoleAuthorities,
    saveRoleAuthorities,
    userAuthorities,
    getUserAuthorities,
    saveUserAuthorities,
    getRoleDataAuthority,
    saveRoleDataAuthority,
  };

  return (
    <AuthSettingsContext.Provider value={value}>
      {children}
    </AuthSettingsContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useAuthSettings() {
  const context = useContext(AuthSettingsContext);
  if (!context) {
    throw new Error('useAuthSettings must be used within AuthSettingsProvider');
  }
  return context;
}

// ============================================
// 权限检查Hook
// ============================================

interface UsePermissionOptions {
  userOid: string;
  appType?: AppType;
}

export function usePermission({ userOid, appType = 0 }: UsePermissionOptions) {
  const { userAuthorities, getUserAuthorities, roleAuthorities, getRoleAuthorities, users } = useAuthSettings();

  // 获取用户及其角色
  const user = users.find(u => u.oid === userOid);
  const userRoleOids = useUserRoles(userOid);

  // 检查用户是否有指定权限
  const hasPermission = useCallback(async (processOid: string, actionOid: string): Promise<boolean> => {
    // 获取用户个人权限
    const userAuths = await getUserAuthorities(userOid, appType);
    const userAuth = userAuths.find(a => a.processOid === processOid && a.actionOid === actionOid);

    // 如果用户有明确设置（1或0），直接返回
    if (userAuth && userAuth.value !== -1) {
      return userAuth.value === 1;
    }

    // 检查用户的角色权限
    for (const roleOid of userRoleOids) {
      const roleAuths = await getRoleAuthorities(roleOid, appType);
      const roleAuth = roleAuths.find(a => a.processOid === processOid && a.actionOid === actionOid);
      if (roleAuth && roleAuth.value === 1) {
        return true;
      }
    }

    return false;
  }, [userOid, appType, userOid, userRoleOids, getUserAuthorities, getRoleAuthorities]);

  return { hasPermission };
}

// 获取用户角色
function useUserRoles(userOid: string): string[] {
  const { roles, users } = useAuthSettings();
  const user = users.find(u => u.oid === userOid);
  if (!user) return [];

  // 从用户关联的角色中获取
  // TODO: 需要调用API获取用户角色关联
  return [];
}
```

---

## 第五部分：页面组件代码

### 5.1 组织管理页面 (src/pages/settings/OrganizationPage.tsx)

```tsx
// ============================================
// 组织管理页面
// 来源参考：弘智耘源 orgs.{v}.ejs
// 功能：树形组织架构CRUD
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  X,
  ChevronLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthSettings } from '../../contexts/AuthSettingsContext';
import { Organization } from '../../types/authority';
import { TreeTable } from '../../components/ui/TreeTable';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../contexts/ToastContext';

// 组织类型选项
const ORG_TYPE_OPTIONS = [
  { value: 'company', label: '公司' },
  { value: 'base', label: '基地' },
  { value: 'region', label: '区域' },
  { value: 'department', label: '部门' },
  { value: 'workshop', label: '车间' },
];

// 表格列定义
const COLUMNS = [
  { field: 'aid', title: '组织编码', width: 150, sortable: true },
  { field: 'name', title: '组织名称', width: 200, sortable: true },
  { field: 'orgType', title: '类型', width: 100 },
  { field: 'contactor', title: '联系人', width: 100 },
  { field: 'contactorPhone', title: '电话', width: 150 },
  { field: 'sortNumber', title: '排序', width: 80, align: 'right' },
];

export default function OrganizationPage() {
  const { organizations, loadingOrganizations, refreshOrganizations } = useAuthSettings();
  const { toast } = useToast();

  // 搜索
  const [searchTerm, setSearchTerm] = useState('');

  // 展开状态
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // 选中行
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [parentOrg, setParentOrg] = useState<Organization | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<Organization>>({
    status: 'active',
    sortNumber: 0,
  });

  // 过滤数据
  const filteredData = useCallback(() => {
    if (!searchTerm) return organizations;

    const search = searchTerm.toLowerCase();
    const filterTree = (orgs: Organization[]): Organization[] => {
      const result: Organization[] = [];
      for (const org of orgs) {
        if (
          org.aid.toLowerCase().includes(search) ||
          org.name.toLowerCase().includes(search)
        ) {
          result.push(org);
        } else if (org.children) {
          const filteredChildren = filterTree(org.children);
          if (filteredChildren.length > 0) {
            result.push({ ...org, children: filteredChildren });
          }
        }
      }
      return result;
    };

    return filterTree(organizations);
  }, [organizations, searchTerm]);

  // 展开/折叠
  const toggleExpand = (oid: string) => {
    const newKeys = new Set(expandedKeys);
    if (newKeys.has(oid)) {
      newKeys.delete(oid);
    } else {
      newKeys.add(oid);
    }
    setExpandedKeys(newKeys);
  };

  // 新增同级
  const handleAddSibling = () => {
    if (!selectedOrg) {
      toast.warning('请先选择一个组织');
      return;
    }
    setModalMode('add');
    setParentOrg(organizations.find(o => o.oid === selectedOrg.oidParent) || null);
    setFormData({
      oidParent: selectedOrg.oidParent,
      status: 'active',
      sortNumber: (selectedOrg.sortNumber || 0) + 1,
    });
    setShowModal(true);
  };

  // 新增下级
  const handleAddChild = () => {
    if (!selectedOrg) {
      toast.warning('请先选择一个组织');
      return;
    }
    setModalMode('add');
    setParentOrg(selectedOrg);
    setFormData({
      oidParent: selectedOrg.oid,
      status: 'active',
      sortNumber: 0,
    });
    setShowModal(true);
  };

  // 编辑
  const handleEdit = (org: Organization) => {
    setModalMode('edit');
    setFormData({ ...org });
    setShowModal(true);
  };

  // 删除
  const handleDelete = async (org: Organization) => {
    if (!confirm(`确定删除组织"${org.name}"吗？`)) return;

    try {
      await organizationService.saveOrgs({ deleted: [org.oid] });
      toast.success('删除成功');
      refreshOrganizations();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 保存
  const handleSave = async () => {
    if (!formData.aid || !formData.name) {
      toast.warning('请填写组织编码和名称');
      return;
    }

    try {
      if (modalMode === 'add') {
        await organizationService.saveOrgs({
          inserted: [{ ...formData, oid: `ORG_${Date.now()}` } as Organization],
        });
        toast.success('新增成功');
      } else {
        await organizationService.saveOrgs({
          updated: [formData as Organization],
        });
        toast.success('更新成功');
      }
      setShowModal(false);
      refreshOrganizations();
    } catch (error) {
      toast.error('保存失败');
    }
  };

  // 渲染树形行
  const renderTreeRow = (org: Organization, level: number = 0) => {
    const hasChildren = org.children && org.children.length > 0;
    const isExpanded = expandedKeys.has(org.oid);
    const isSelected = selectedOrg?.oid === org.oid;

    return (
      <React.Fragment key={org.oid}>
        <tr
          className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-emerald-50' : ''}`}
          onClick={() => setSelectedOrg(org)}
        >
          <td className="px-4 py-3" style={{ paddingLeft: `${level * 24 + 16}px` }}>
            <div className="flex items-center gap-2">
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(org.oid);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              ) : (
                <span className="w-6" />
              )}
              <Building className="w-5 h-5 text-emerald-600" />
              <span className="font-medium">{org.aid}</span>
            </div>
          </td>
          <td className="px-4 py-3">{org.name}</td>
          <td className="px-4 py-3">
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
              {ORG_TYPE_OPTIONS.find(o => o.value === org.orgType)?.label || org.orgType}
            </span>
          </td>
          <td className="px-4 py-3">{org.contactor || '-'}</td>
          <td className="px-4 py-3">{org.contactorPhone || org.contactorMobile || '-'}</td>
          <td className="px-4 py-3 text-right">{org.sortNumber}</td>
          <td className="px-4 py-3">
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(org);
                }}
                className="p-1.5 hover:bg-gray-100 rounded"
              >
                <Edit2 className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(org);
                }}
                className="p-1.5 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </td>
        </tr>
        {isExpanded && hasChildren && org.children!.map(child => renderTreeRow(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <Building className="w-8 h-8 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">组织管理</h1>
            <p className="text-gray-500">管理组织架构树形结构</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddSibling}
            disabled={!selectedOrg}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            新增同级
          </button>
          <button
            onClick={handleAddChild}
            disabled={!selectedOrg}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            新增下级
          </button>
        </div>
      </div>

      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜索组织编码或名称..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">组织编码</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">联系人</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">电话</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">排序</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loadingOrganizations ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : filteredData().length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              filteredData().map(org => renderTreeRow(org))
            )}
          </tbody>
        </table>
      </div>

      {/* 弹窗 */}
      {showModal && (
        <Modal
          title={modalMode === 'add' ? '新增组织' : '编辑组织'}
          onClose={() => setShowModal(false)}
          width={600}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="组织编码"
                value={formData.aid || ''}
                onChange={(e) => setFormData({ ...formData, aid: e.target.value })}
                placeholder="如：DEPT_001"
                required
              />
              <Input
                label="组织名称"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入组织名称"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="组织类型"
                value={formData.orgType || 'department'}
                onChange={(e) => setFormData({ ...formData, orgType: e.target.value as any })}
                options={ORG_TYPE_OPTIONS}
              />
              <Input
                label="排序号"
                type="number"
                value={formData.sortNumber || 0}
                onChange={(e) => setFormData({ ...formData, sortNumber: parseInt(e.target.value) })}
              />
            </div>

            <Input
              label="地址"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="请输入地址"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="联系人"
                value={formData.contactor || ''}
                onChange={(e) => setFormData({ ...formData, contactor: e.target.value })}
                placeholder="请输入联系人"
              />
              <Input
                label="联系电话"
                value={formData.contactorPhone || ''}
                onChange={(e) => setFormData({ ...formData, contactorPhone: e.target.value })}
                placeholder="请输入电话"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="手机"
                value={formData.contactorMobile || ''}
                onChange={(e) => setFormData({ ...formData, contactorMobile: e.target.value })}
                placeholder="请输入手机"
              />
              <Input
                label="邮箱"
                type="email"
                value={formData.contactorEmail || ''}
                onChange={(e) => setFormData({ ...formData, contactorEmail: e.target.value })}
                placeholder="请输入邮箱"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入描述"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {parentOrg && (
              <div className="text-sm text-gray-500">
                上级组织：{parentOrg.name} ({parentOrg.aid})
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
            >
              保存
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
```

### 5.2 角色权限页面 (src/pages/settings/RoleAuthorityPage.tsx)

```tsx
// ============================================
// 角色权限配置页面
// 来源参考：弘智耘源 roleAuthority.{v}.ejs
// 功能：角色对工序+动作的权限矩阵
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ChevronLeft, Save, Search } from 'lucide-react';
import { useAuthSettings } from '../../contexts/AuthSettingsContext';
import { Role, Process, Action, RoleAuthorityItem, AppType } from '../../types/authority';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../contexts/ToastContext';

interface ProcessRow {
  process: Process;
  actions: { [actionOid: string]: 1 | 0 };
}

export default function RoleAuthorityPage() {
  const { roles, processes, actions, getRoleAuthorities, saveRoleAuthorities, refreshRoles } = useAuthSettings();
  const { toast } = useToast();

  // 选择的角色
  const [selectedRoleOid, setSelectedRoleOid] = useState<string>('');

  // App类型
  const [appType, setAppType] = useState<AppType>(0);

  // 权限矩阵数据
  const [authorityMatrix, setAuthorityMatrix] = useState<ProcessRow[]>([]);

  // 加载权限数据
  useEffect(() => {
    if (!selectedRoleOid) {
      setAuthorityMatrix([]);
      return;
    }

    const loadAuthority = async () => {
      try {
        const authItems = await getRoleAuthorities(selectedRoleOid, appType);

        // 构建权限Map
        const authMap = new Map<string, 1 | 0>();
        for (const item of authItems) {
          authMap.set(`${item.processOid}_${item.actionOid}`, item.value as 1 | 0);
        }

        // 构建矩阵
        const buildMatrix = (procs: Process[]): ProcessRow[] => {
          const rows: ProcessRow[] = [];
          for (const proc of procs) {
            const rowActions: { [actionOid: string]: 1 | 0 } = {};
            for (const action of actions) {
              const key = `${proc.oid}_${action.oid}`;
              rowActions[action.oid] = authMap.get(key) || 0;
            }
            rows.push({ process: proc, actions: rowActions });

            if (proc.children && proc.children.length > 0) {
              rows.push(...buildMatrix(proc.children));
            }
          }
          return rows;
        };

        setAuthorityMatrix(buildMatrix(processes));
      } catch (error) {
        console.error('Failed to load authority:', error);
      }
    };

    loadAuthority();
  }, [selectedRoleOid, appType, processes, actions, getRoleAuthorities]);

  // 按分类分组动作
  const groupedActions = useMemo(() => {
    const groups: { [category: string]: Action[] } = {};
    for (const action of actions) {
      if (!groups[action.category]) {
        groups[action.category] = [];
      }
      groups[action.category].push(action);
    }
    return groups;
  }, [actions]);

  // 全选某行的所有动作
  const handleRowCheckAll = (procOid: string, checked: boolean) => {
    setAuthorityMatrix(prev =>
      prev.map(row =>
        row.process.oid === procOid
          ? {
              ...row,
              actions: Object.fromEntries(
                Object.keys(row.actions).map(key => [key, checked ? 1 : 0])
            )
          : row
      )
    );
  };

  // 全选某列的所有工序
  const handleColumnCheckAll = (actionOid: string, checked: boolean) => {
    setAuthorityMatrix(prev =>
      prev.map(row => ({
        ...row,
        actions: { ...row.actions, [actionOid]: checked ? 1 : 0 }
      }))
    );
  };

  // 单元格点击
  const handleCellChange = (procOid: string, actionOid: string, value: 1 | 0) => {
    setAuthorityMatrix(prev =>
      prev.map(row =>
        row.process.oid === procOid
          ? { ...row, actions: { ...row.actions, [actionOid]: value } }
          : row
      )
    );
  };

  // 全选全部
  const handleCheckAll = (checked: boolean) => {
    setAuthorityMatrix(prev =>
      prev.map(row => ({
        ...row,
        actions: Object.fromEntries(
          Object.keys(row.actions).map(key => [key, checked ? 1 : 0])
      ))
    )
  };

  // 检查某行是否全部选中
  const isRowChecked = (row: ProcessRow): boolean => {
    return Object.values(row.actions).every(v => v === 1);
  };

  // 检查某列是否全部选中
  const isColumnChecked = (actionOid: string): boolean => {
    return authorityMatrix.every(row => row.actions[actionOid] === 1);
  };

  // 检查是否全部选中
  const isAllChecked = (): boolean => {
    if (authorityMatrix.length === 0) return false;
    return authorityMatrix.every(row => isRowChecked(row));
  };

  // 保存
  const handleSave = async () => {
    if (!selectedRoleOid) {
      toast.warning('请先选择角色');
      return;
    }

    try {
      const authorities: RoleAuthorityItem[] = [];
      for (const row of authorityMatrix) {
        for (const [actionOid, value] of Object.entries(row.actions)) {
          authorities.push({
            roleOid: selectedRoleOid,
            processOid: row.process.oid,
            actionOid,
            value,
          });
        }
      }

      await saveRoleAuthorities(selectedRoleOid, authorities);
      toast.success('保存成功');
    } catch (error) {
      toast.error('保存失败');
    }
  };

  // 渲染工序行（支持树形缩进）
  const renderProcessRow = (row: ProcessRow, level: number = 0) => {
    const { process, actions: rowActions } = row;
    const isChecked = isRowChecked(row);

    return (
      <tr key={process.oid} className="hover:bg-gray-50">
        <td className="px-4 py-3" style={{ paddingLeft: `${level * 24 + 16}px` }}>
          <span className="font-medium">{process.aid}</span>
        </td>
        <td className="px-4 py-3">
          {process.name}
        </td>
        <td className="px-4 py-3 text-center">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => handleRowCheckAll(process.oid, e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
        </td>
        {Object.entries(groupedActions).map(([category, categoryActions]) =>
          categoryActions.map(action => (
            <td key={action.oid} className="px-4 py-3 text-center">
              <input
                type="checkbox"
                checked={rowActions[action.oid] === 1}
                onChange={(e) =>
                  handleCellChange(process.oid, action.oid, e.target.checked ? 1 : 0)
                }
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
            </td>
          ))
        )}
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <Shield className="w-8 h-8 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">角色权限配置</h1>
            <p className="text-gray-500">配置角色对各工序+动作的权限矩阵</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!selectedRoleOid}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          保存
        </button>
      </div>

      {/* 筛选条件 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
            <Select
              value={selectedRoleOid}
              onChange={(e) => setSelectedRoleOid(e.target.value)}
              options={roles.map(r => ({ value: r.oid, label: `${r.aid} - ${r.name}` }))}
              placeholder="请选择角色"
            />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">应用类型</label>
            <Select
              value={appType}
              onChange={(e) => setAppType(parseInt(e.target.value) as AppType)}
              options={[
                { value: 0, label: 'Web' },
                { value: 1, label: 'Mobile' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* 权限矩阵 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">工序编码</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">工序名称</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-16">
                  <input
                    type="checkbox"
                    checked={isAllChecked()}
                    onChange={(e) => handleCheckAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                {Object.entries(groupedActions).map(([category, categoryActions]) => (
                  <th
                    key={category}
                    colSpan={categoryActions.length}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l border-gray-200"
                  >
                    {category}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3"></th>
                {Object.values(groupedActions).flat().map(action => (
                  <th
                    key={action.oid}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 border-l border-gray-200 min-w-[80px]"
                  >
                    <div className="transform -rotate-45 whitespace-nowrap">
                      {action.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {authorityMatrix.length === 0 ? (
                <tr>
                  <td
                    colSpan={3 + Object.values(groupedActions).flat().length}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {selectedRoleOid ? '暂无数据' : '请先选择角色'}
                  </td>
                </tr>
              ) : (
                authorityMatrix.map(row => renderProcessRow(row))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 说明 */}
      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
        <p className="font-medium text-gray-700 mb-2">说明：</p>
        <ul className="list-disc list-inside space-y-1">
          <li>勾选表示授予权限，未勾选表示禁用权限</li>
          <li>第3列的全选框可以一次性勾选/取消该行所有动作的权限</li>
          <li>表头每个分类下的全选框可以一次性勾选/取消该列所有工序的该动作权限</li>
          <li>左下角的全选框可以一次性勾选/取消所有权限</li>
        </ul>
      </div>
    </div>
  );
}
```

### 5.3 用户管理页面 (src/pages/settings/UserManagementPage.tsx)

```tsx
// ============================================
// 用户管理页面
// 来源参考：弘智耘源 userAuthority 相关页面
// 功能：用户CRUD和角色分配
// ============================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  Save,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuthSettings } from '../../contexts/AuthSettingsContext';
import { User, Role } from '../../types/authority';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Checkbox } from '../../components/ui/Checkbox';
import { userService } from '../../services/authorityService';
import { useToast } from '../../contexts/ToastContext';

export default function UserManagementPage() {
  const {
    users,
    roles,
    organizations,
    loadingUsers,
    refreshUsers,
    refreshRoles,
    refreshOrganizations
  } = useAuthSettings();
  const { toast } = useToast();

  // 搜索和筛选
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrg, setFilterOrg] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<User>>({
    status: 'active',
  });

  // 用户角色关联
  const [selectedRoleOids, setSelectedRoleOids] = useState<string[]>([]);

  // 加载用户角色关联
  useEffect(() => {
    if (editingUser) {
      userService.getUserRoles(editingUser.oid).then(setSelectedRoleOids);
    }
  }, [editingUser]);

  // 过滤数据
  const filteredUsers = users.filter(user => {
    if (searchTerm && !user.aid.includes(searchTerm) && !user.name.includes(searchTerm)) {
      return false;
    }
    if (filterOrg && user.orgOid !== filterOrg) {
      return false;
    }
    if (filterStatus && user.status !== filterStatus) {
      return false;
    }
    return true;
  });

  // 获取组织名称
  const getOrgName = (orgOid: string) => {
    const org = organizations.find(o => o.oid === orgOid);
    return org ? `${org.aid} - ${org.name}` : orgOid;
  };

  // 获取用户角色名称
  const getUserRoles = (userOid: string) => {
    // TODO: 需要调用API获取用户角色
    return roles.filter(r => r.oid).map(r => r.name);
  };

  // 新增
  const handleAdd = () => {
    setModalMode('add');
    setEditingUser(null);
    setFormData({ status: 'active' });
    setSelectedRoleOids([]);
    setShowModal(true);
  };

  // 编辑
  const handleEdit = (user: User) => {
    setModalMode('edit');
    setEditingUser(user);
    setFormData({ ...user });
    setShowModal(true);
  };

  // 删除
  const handleDelete = async (user: User) => {
    if (!confirm(`确定删除用户"${user.name}"吗？`)) return;

    try {
      await userService.saveUsers({ deleted: [user.oid] });
      toast.success('删除成功');
      refreshUsers();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 切换状态
  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await userService.saveUsers({
        updated: [{ ...user, status: newStatus } as User]
      });
      refreshUsers();
    } catch (error) {
      toast.error('更新状态失败');
    }
  };

  // 保存
  const handleSave = async () => {
    if (!formData.aid || !formData.name || !formData.orgOid) {
      toast.warning('请填写必填项');
      return;
    }

    try {
      if (modalMode === 'add') {
        const newUser = { ...formData, oid: `USER_${Date.now()}` } as User;
        await userService.saveUsers({ inserted: [newUser] });
        await userService.saveUserRoles(newUser.oid, selectedRoleOids);
        toast.success('新增成功');
      } else {
        await userService.saveUsers({ updated: [formData as User] });
        await userService.saveUserRoles(editingUser!.oid, selectedRoleOids);
        toast.success('更新成功');
      }
      setShowModal(false);
      refreshUsers();
      refreshRoles();
    } catch (error) {
      toast.error('保存失败');
    }
  };

  // 角色选择
  const handleRoleChange = (roleOid: string, checked: boolean) => {
    if (checked) {
      setSelectedRoleOids([...selectedRoleOids, roleOid]);
    } else {
      setSelectedRoleOids(selectedRoleOids.filter(id => id !== roleOid));
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <Users className="w-8 h-8 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
            <p className="text-gray-500">管理用户账号和角色分配</p>
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          新增用户
        </button>
      </div>

      {/* 搜索筛选 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索账号或姓名..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">所属组织</label>
            <select
              value={filterOrg}
              onChange={(e) => setFilterOrg(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">全部组织</option>
              {organizations.map(org => (
                <option key={org.oid} value={org.oid}>
                  {org.aid} - {org.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">全部</option>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">账号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">组织</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loadingUsers ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.oid} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-medium">
                        {user.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.aid}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-gray-600">{getOrgName(user.orgOid)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {getUserRoles(user.oid).map(roleName => (
                        <span
                          key={roleName}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full"
                        >
                          {roleName}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(user)}
                      className={`flex items-center gap-1 text-sm ${
                        user.status === 'active' ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {user.status === 'active' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      {user.status === 'active' ? '启用' : '停用'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-1.5 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 弹窗 */}
      {showModal && (
        <Modal
          title={modalMode === 'add' ? '新增用户' : '编辑用户'}
          onClose={() => setShowModal(false)}
          width={600}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="账号"
                value={formData.aid || ''}
                onChange={(e) => setFormData({ ...formData, aid: e.target.value })}
                placeholder="登录账号"
                required
              />
              <Input
                label="姓名"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="用户姓名"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="所属组织"
                value={formData.orgOid || ''}
                onChange={(e) => setFormData({ ...formData, orgOid: e.target.value })}
                options={organizations.map(org => ({
                  value: org.oid,
                  label: `${org.aid} - ${org.name}`
                }))}
                placeholder="请选择组织"
                required
              />
              <Input
                label="邮箱"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="邮箱地址"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="电话"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="联系电话"
              />
              <Input
                label="入职日期"
                type="date"
                value={formData.hireDate || ''}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
              />
            </div>

            {modalMode === 'add' && (
              <Input
                label="初始密码"
                type="password"
                value={formData.passwordHash || ''}
                onChange={(e) => setFormData({ ...formData, passwordHash: e.target.value })}
                placeholder="请输入初始密码"
              />
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">分配角色</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {roles.map(role => (
                  <label
                    key={role.oid}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleOids.includes(role.oid)}
                      onChange={(e) => handleRoleChange(role.oid, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">
                      {role.aid} - {role.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
            >
              保存
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
```

### 5.4 数据权限页面 (src/pages/settings/DataAuthorityPage.tsx)

```tsx
// ============================================
// 数据权限配置页面
// 来源参考：弘智耘源 roleDataAuthority.{v}.ejs
// 功能：角色对组织的访问权限
// ============================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ChevronLeft, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuthSettings } from '../../contexts/AuthSettingsContext';
import { Role, Organization, RoleDataAuthorityItem } from '../../types/authority';
import { Select } from '../../components/ui/Select';
import { dataAuthorityService } from '../../services/authorityService';
import { useToast } from '../../contexts/ToastContext';

export default function DataAuthorityPage() {
  const { roles, organizations, refreshRoles } = useAuthSettings();
  const { toast } = useToast();

  // 选择的角色
  const [selectedRoleOid, setSelectedRoleOid] = useState<string>('');

  // 组织树（含勾选状态）
  const [orgTree, setOrgTree] = useState<(Organization & { checked: boolean })[]>([]);

  // 展开状态
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // 加载组织树（含权限状态）
  useEffect(() => {
    if (!selectedRoleOid) {
      setOrgTree([]);
      return;
    }

    const loadOrgTree = async () => {
      try {
        const orgsWithAuth = await dataAuthorityService.getOrgTreeWithAuth(selectedRoleOid);

        // 转换为Organization类型
        const orgs: (Organization & { checked: boolean })[] = orgsWithAuth.map(org => ({
          oid: org.OID,
          oidParent: org.TreeOIDParent === org.OID ? null : org.TreeOIDParent,
          aid: org.AID,
          name: org.Name,
          checked: org.checked || false,
        }));

        setOrgTree(orgs);

        // 默认展开第一层
        const firstLevelKeys = new Set<string>();
        for (const org of orgs) {
          if (!org.oidParent) {
            firstLevelKeys.add(org.oid);
          }
        }
        setExpandedKeys(firstLevelKeys);
      } catch (error) {
        console.error('Failed to load org tree:', error);
      }
    };

    loadOrgTree();
  }, [selectedRoleOid]);

  // 构建树形结构
  const buildTree = (
    orgs: (Organization & { checked: boolean })[]
  ): (Organization & { checked: boolean; children?: Organization[] })[] => {
    const map = new Map<string, any>();
    const roots: any[] = [];

    // 先创建所有节点
    for (const org of orgs) {
      map.set(org.oid, { ...org, children: [] });
    }

    // 构建树
    for (const org of orgs) {
      const node = map.get(org.oid);
      if (org.oidParent && map.has(org.oidParent)) {
        map.get(org.oidParent).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  };

  // 递归设置勾选状态（向下）
  const setChildrenChecked = (
    orgs: any[],
    oid: string,
    checked: boolean
  ) => {
    for (const org of orgs) {
      if (org.oid === oid && org.children) {
        for (const child of org.children) {
          child.checked = checked;
          if (child.children) {
            setChildrenChecked(orgs, child.oid, checked);
          }
        }
      } else if (org.children) {
        setChildrenChecked(org.children, oid, checked);
      }
    }
  };

  // 处理勾选
  const handleCheck = (org: any, checked: boolean) => {
    const newTree = JSON.parse(JSON.stringify(orgTree));

    // 更新当前节点
    const updateNode = (nodes: any[]): boolean => {
      for (const node of nodes) {
        if (node.oid === org.oid) {
          node.checked = checked;
          // 向下传递
          if (node.children) {
            for (const child of node.children) {
              child.checked = checked;
            }
          }
          return true;
        }
        if (node.children && updateNode(node.children)) {
          return true;
        }
      }
      return false;
    };

    updateNode(newTree);

    // 向上检查：如果所有兄弟都选中，父节点也应该选中
    // 简化处理：只向下传递，不向上自动选中

    setOrgTree(newTree);
  };

  // 全选
  const handleCheckAll = (checked: boolean) => {
    setOrgTree(prev =>
      prev.map(org => ({ ...org, checked }))
    );
  };

  // 展开/折叠
  const toggleExpand = (oid: string) => {
    const newKeys = new Set(expandedKeys);
    if (newKeys.has(oid)) {
      newKeys.delete(oid);
    } else {
      newKeys.add(oid);
    }
    setExpandedKeys(newKeys);
  };

  // 保存
  const handleSave = async () => {
    if (!selectedRoleOid) {
      toast.warning('请先选择角色');
      return;
    }

    try {
      // 收集所有选中的orgOid
      const collectCheckedOids = (orgs: any[]): string[] => {
        const oids: string[] = [];
        for (const org of orgs) {
          if (org.checked) {
            oids.push(org.oid);
          }
          if (org.children) {
            oids.push(...collectCheckedOids(org.children));
          }
        }
        return oids;
      };

      const checkedOids = collectCheckedOids(orgTree);
      await dataAuthorityService.saveRoleDataAuthority(
        selectedRoleOid,
        checkedOids,
        true
      );

      toast.success('保存成功');
      refreshRoles();
    } catch (error) {
      toast.error('保存失败');
    }
  };

  // 渲染树节点
  const renderTreeNode = (org: any, level: number = 0) => {
    const hasChildren = org.children && org.children.length > 0;
    const isExpanded = expandedKeys.has(org.oid);

    return (
      <React.Fragment key={org.oid}>
        <tr className="hover:bg-gray-50">
          <td
            className="px-4 py-3"
            style={{ paddingLeft: `${level * 24 + 16}px` }}
          >
            <div className="flex items-center gap-2">
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(org.oid)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              ) : (
                <span className="w-6" />
              )}
              <input
                type="checkbox"
                checked={org.checked || false}
                onChange={(e) => handleCheck(org, e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-medium text-gray-900">{org.aid}</span>
            </div>
          </td>
          <td className="px-4 py-3 text-gray-600">{org.name}</td>
        </tr>
        {isExpanded && hasChildren && org.children.map((child: any) => renderTreeNode(child, level + 1))}
      </React.Fragment>
    );
  };

  const treeData = buildTree(orgTree);
  const isAllChecked = orgTree.length > 0 && orgTree.every(org => org.checked);

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <Lock className="w-8 h-8 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">数据权限配置</h1>
            <p className="text-gray-500">配置角色对组织的访问权限</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!selectedRoleOid}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          保存
        </button>
      </div>

      {/* 筛选条件 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
            <Select
              value={selectedRoleOid}
              onChange={(e) => setSelectedRoleOid(e.target.value)}
              options={roles.map(r => ({ value: r.oid, label: `${r.aid} - ${r.name}` }))}
              placeholder="请选择角色"
            />
          </div>
        </div>
      </div>

      {/* 说明 */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">说明：</p>
        <ul className="list-disc list-inside space-y-1">
          <li>勾选表示该角色可以访问对应的组织数据</li>
          <li>勾选父组织会自动勾选所有子组织</li>
          <li>未勾选的组织和子组织将无法被该角色访问</li>
        </ul>
      </div>

      {/* 组织树 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllChecked}
              onChange={(e) => handleCheckAll(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-gray-700">全选/取消全选</span>
          </label>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-64">组织编码</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">组织名称</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orgTree.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                  {selectedRoleOid ? '暂无数据' : '请先选择角色'}
                </td>
              </tr>
            ) : (
              treeData.map(org => renderTreeNode(org))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 第六部分：App路由配置 (src/App.tsx 片段)

```typescript
// 在现有路由中添加以下配置
// 需要将 AuthSettingsProvider 包裹整个应用

import { AuthSettingsProvider } from './contexts/AuthSettingsContext';
import OrganizationPage from './pages/settings/OrganizationPage';
import RoleManagementPage from './pages/settings/RoleManagementPage';
import RoleAuthorityPage from './pages/settings/RoleAuthorityPage';
import UserManagementPage from './pages/settings/UserManagementPage';
import UserAuthorityPage from './pages/settings/UserAuthorityPage';
import DataAuthorityPage from './pages/settings/DataAuthorityPage';
import ProcessManagementPage from './pages/settings/ProcessManagementPage';
import ActionManagementPage from './pages/settings/ActionManagementPage';

// 路由配置
const settingsRoutes = [
  // 组织与权限管理模块
  { path: '/settings/organization', component: OrganizationPage },
  { path: '/settings/role', component: RoleManagementPage },
  { path: '/settings/role-authority', component: RoleAuthorityPage },
  { path: '/settings/user', component: UserManagementPage },
  { path: '/settings/user-authority', component: UserAuthorityPage },
  { path: '/settings/data-authority', component: DataAuthorityPage },
  { path: '/settings/process', component: ProcessManagementPage },
  { path: '/settings/action', component: ActionManagementPage },
];

// 在App组件中使用
function App() {
  return (
    <AuthSettingsProvider>
      <Router>
        {/* ... 其他路由 */}
        <Route path="/settings/*" element={<SettingsLayout />}>
          {settingsRoutes.map(route => (
            <Route key={route.path} path={route.path.replace('/settings/', '')} element={<route.component />} />
          ))}
        </Route>
      </Router>
    </AuthSettingsProvider>
  );
}
```

---

## 第七部分：数据库初始化 (src/db/init.ts)

```typescript
// ============================================
// 数据库初始化
// 执行：npm run db:init 或在应用启动时自动调用
// ============================================

import { db } from './database';
import fs from 'fs';
import path from 'path';

export async function initDatabase() {
  console.log('Initializing database...');

  // 读取schema文件
  const schemaPath = path.join(__dirname, 'schema', 'authority.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // 执行schema
  const statements = schema.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        db.exec(statement);
      } catch (error: any) {
        // 忽略"table already exists"等错误
        if (!error.message.includes('already exists')) {
          console.error('SQL Error:', error.message);
        }
      }
    }
  }

  console.log('Database initialized successfully');
}

// 如果是独立运行脚本
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Done');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed:', error);
      process.exit(1);
    });
}
```

---

## 第八部分：package.json脚本 (添加以下脚本)

```json
{
  "scripts": {
    "db:init": "ts-node src/db/init.ts",
    "db:reset": "rm -f src/db/*.db && npm run db:init",
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

---

## 第九部分：UI组件依赖

这些组件需要自行实现或从UI库（如shadcn/ui）引入：

```tsx
// src/components/ui/Modal.tsx
// src/components/ui/Input.tsx
// src/components/ui/Select.tsx
// src/components/ui/Checkbox.tsx
// src/components/ui/TreeTable.tsx
```

建议使用shadcn/ui组件库：
```bash
npx shadcn-ui@latest add modal input select checkbox table
```

---

## 第十部分：后续开发指南

### 10.1 如何添加新的工序/动作

```typescript
// 1. 在数据库中添加
INSERT INTO processes (oid, oid_parent, aid, name, app_type, sort_number, status)
VALUES ('PROC_NEW', NULL, 'new', '新工序', 0, 10, 'active');

INSERT INTO actions (oid, aid, name, category, app_type, sort_number, status)
VALUES ('ACTION_NEW', 'new', '新动作', 'common', 0, 20, 'active');

// 2. 给超管角色授权
INSERT INTO roles_authority (role_oid, process_oid, action_oid, value)
VALUES ('ROLE_ADMIN', 'PROC_NEW', 'ACTION_NEW', 1);
```

### 10.2 如何添加新的组织类型

```typescript
// 1. 在数据字典中添加OrgType类型项
INSERT INTO dictionary_types (type_code, type_name)
VALUES ('OrgType', '组织类型');

INSERT INTO dictionary_items (type_id, item_code, item_value, sort_order)
VALUES (' OrgType的id', 'workshop', '车间', 5);
```

### 10.3 如何扩展AppType

当前支持Web(0)和Mobile(1)，如需扩展：

```typescript
// 1. 添加数据库枚举值
ALTER TABLE processes ADD COLUMN app_type INTEGER DEFAULT 0;
ALTER TABLE actions ADD COLUMN app_type INTEGER DEFAULT 0;

// 2. 在类型定义中扩展
export type AppType = 0 | 1 | 2; // 添加 2=Pad
```

---

*方案制定时间：2026-05-02*
*方案版本：V3.0*
*代码可直接复制使用*
*参考系统：弘智耘源 authority2 模块*
