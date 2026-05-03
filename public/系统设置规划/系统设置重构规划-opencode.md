# 系统设置模块重构规划方案 V2.0

> 目标：后台可配置 → 数据存储 SQLite → 页面自动联动
> 框架先行，数据后续由用户填写
>
> **重大更新**：整合弘智耘源系统的完整组织管理、角色权限体系

---

## 一、参考系统：弘智耘源权限管理架构

### 1.1 弘智耘源系统权限模型（完整体系）

```
┌─────────────────────────────────────────────────────────────────┐
│                        权限管理系统架构                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐     ┌──────────┐     ┌──────────────────────┐    │
│  │ 组织管理  │────▶│ 角色管理  │────▶│ 角色权限 (Process×Action)│    │
│  │  Orgs    │     │  Roles   │     │    RolesAuthority      │    │
│  └──────────┘     └──────────┘     └──────────────────────┘    │
│       │                                    │                     │
│       │                                    ▼                     │
│       │            ┌─────────────────────────────────────┐      │
│       │            │         工序树 (Processes)           │      │
│       │            │  ProcessOID, ProcessOIDParent, ...   │      │
│       │            └─────────────────────────────────────┘      │
│       │                                    │                     │
│       │                                    ▼                     │
│       │            ┌─────────────────────────────────────┐      │
│       │            │         动作表 (Actions)             │      │
│       │            │  ActionOID, Category, AppType...     │      │
│       │            └─────────────────────────────────────┘      │
│       │                                                     │
│       │     ┌──────────┐     ┌──────────────────────┐          │
│       └────▶│ 用户管理  │────▶│ 用户权限 (可选Override)│          │
│             │  Users   │     │   UsersAuthority     │          │
│             └──────────┘     └──────────────────────┘          │
│                                      │                          │
│                                      ▼                          │
│             ┌─────────────────────────────────────┐            │
│             │     角色数据权限 (RoleDataAuthority)   │            │
│             │   角色对组织的访问权限（Org层级）      │            │
│             └─────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 核心数据库表（弘智耘源）

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| Orgs | 组织表（树形） | OrgOID, OrgOIDParent, OrgAID, Name, Description, Address, Contactor, OrgType, SortNumber |
| Roles | 角色表 | RoleOID, OrgOID, RoleAID, Name, SortNumber |
| Users | 用户表 | UserOID, OrgOID, UserAID, Name, 等 |
| Processes | 工序表（树形） | ProcessOID, ProcessOIDParent, ProcessAID, Name, AppType, SortNumber |
| Actions | 动作表 | ActionOID, ActionAID, Name, Category, AppType, SortNumber |
| RolesAuthority | 角色权限矩阵 | RoleOID, ProcessOID, ActionOID, Value |
| UsersAuthority | 用户权限矩阵 | UserOID, ProcessOID, ActionOID, Value |
| RolesDataAuthority | 角色数据权限 | RoleOID, OrgOID, Value |

### 1.3 权限模型特点

1. **组织隔离**：角色和用户都归属于某个组织（OrgOID）
2. **工序-动作矩阵**：
   - 行：工序（Process）- 树形结构
   - 列：动作（Action）- 按Category分组
   - 单元格：Value (1/0)
3. **三级权限体系**：
   - 角色权限（Role Authority）
   - 用户权限（User Authority，可覆盖角色权限）
   - 数据权限（Data Authority）- 组织访问控制
4. **AppType区分**：Web / Mobile 两种应用类型

### 1.4 弘智耘源页面功能（需迁移到V1.1）

| 弘智耘源页面 | 功能描述 | 迁移目标 |
|------------|---------|---------|
| orgs.{v}.ejs | 组织管理（树形表格，CRUD） | OrganizationPage.tsx |
| roles.{v}.ejs | 角色管理（按组织过滤） | RoleManagementPage.tsx |
| roleAuthority.{v}.ejs | 角色权限矩阵（Process×Action） | RoleAuthorityPage.tsx |
| userAuthority.{v}.ejs | 用户权限矩阵 | UserAuthorityPage.tsx |
| roleDataAuthority.{v}.ejs | 角色数据权限（组织访问） | RoleDataAuthorityPage.tsx |
| processes.{v}.ejs | 工序管理（树形） | ProcessManagementPage.tsx |
| processAction.{v}.ejs | 动作管理 | ActionManagementPage.tsx |

---

## 二、V1.1现状分析

### 2.1 系统设置菜单结构（18个入口）

| # | 菜单名称 | 路由路径 | 现状 | 问题 |
|---|---------|---------|------|------|
| 1 | 系统配置 | /settings/system-config | ✅ 已有页面 | 硬编码 DEFAULT_CONFIGS |
| 2 | 数据字典 | /settings/dictionary | ✅ 完整实现 | 可作为基础参考 |
| 3 | 用户权限 | /settings/user-permission | ✅ 已有页面 | 硬编码 DEFAULT_ROLES/DEFAULT_USERS |
| 4 | 审批流程 | /settings/approval-workflow | ✅ 已有页面 | 硬编码 DEFAULT_WORKFLOWS |
| 5 | 通知设置 | /settings/notification | ✅ 已有页面 | 硬编码 DEFAULT_CHANNELS/DEFAULT_RULES |
| 6 | 设备管理 | /settings/device | ❓ 待确认 | - |
| 7 | 仓库管理 | /settings/warehouse | ✅ 已有页面 | 硬编码 WAREHOUSE_TYPES |
| 8 | 班组管理 | /settings/team | ❓ 待确认 | - |
| 9 | 基地管理 | /settings/branch | ❌ 路由可能冲突 | - |
| 10 | 区块管理 | /settings/block | ❓ 待确认 | - |
| 11 | 基地设置 | /settings/bases | ✅ 已有页面 | 硬编码 2 公司 + 11 基地 |
| 12 | 区域管理 | /settings/regions | ❓ 待确认 | - |
| 13 | 种植模式 | /settings/modes | ✅ 已有页面 | 硬编码 plantingModes |
| 14 | 作物品种库 | /settings/crop-variety | ❓ 待确认 | - |
| 15 | 物料管理 | /settings/materials | ✅ 已有页面 | 硬编码 materials |
| 16 | 工序管理 | /settings/processes | ✅ 已有页面 | 硬编码 processes |
| 17 | 人事管理 | /settings/personnel | ⚠️ 重导出模式 | 实际指向其他页面 |
| 18 | 部门设置 | /settings/departments | ✅ 已有页面 | 硬编码 departments |
| 19 | 成本核算 | /settings/cost-accounting | ❓ 待确认 | - |
| 20 | 操作日志 | /settings/audit-log | ❓ 待确认 | - |

### 2.2 V1.1现有权限模块 vs 弘智耘源

| 功能 | V1.1现状 | 弘智耘源 | 差距 |
|------|----------|---------|------|
| 组织管理 | 无（只有部门） | 树形组织 | 需新增 |
| 角色管理 | 简单列表 | 按组织隔离 | 需升级 |
| 角色权限 | 无（只有角色概念） | Process×Action矩阵 | 需新增 |
| 用户权限 | 简单列表 | 可Override角色权限 | 需升级 |
| 数据权限 | 无 | Org树形复选框 | 需新增 |
| 工序管理 | 简单列表 | 树形结构+动作 | 需升级 |

---

## 三、重构目标

### 3.1 核心目标

1. **整合弘智耘源完整权限模型**：组织-角色-用户-工序-动作 五级体系
2. **废除所有硬编码**：所有下拉选项、枚举值、状态值从数据库读取
3. **数据存储 SQLite**：本地 SQLite 数据库替代 localStorage
4. **页面自动联动**：后台修改 → 全局状态更新 → 订阅页面自动刷新
5. **框架基础先行**：先搭框架，数据类型/字段设计完整，初始数据由用户填写

### 3.2 预期效果

```
用户场景1（权限管理）：
1. 管理员在「组织管理」新增"华东区"组织
2. 在「角色管理」为"华东区"创建"区域主管"角色
3. 在「角色权限」配置"区域主管"对各工序的权限
4. 在「用户管理」创建用户并分配到"华东区"的"区域主管"角色

用户场景2（数据权限）：
1. 管理员在「角色数据权限」配置"区域主管"角色可访问"华东区"及下级组织
2. 用户登录后只能看到被授权组织的数据
```

---

## 四、重构方案

### 4.1 模块合并与重组

| 原模块 | 合并后模块 | 路由 | 说明 |
|-------|----------|------|------|
| 用户权限 + 人事管理 + 部门设置 | **组织与权限管理** | /settings/org-auth | 整合组织、角色、用户、权限 |
| 基地管理 + 基地设置 + 区块管理 + 区域管理 | 基地与区域 | /settings/base-region | 统一管理公司-基地-区块层级 |
| 物料管理 | 物料管理 | /settings/material | 保留（已有完整实现） |
| 仓库管理 | 仓库管理 | /settings/warehouse | 保留（已有完整实现） |
| 工序管理 | 工序管理 | /settings/process | 升级为树形+动作体系 |
| 种植模式 | 种植模式 | /settings/planting-mode | 保留（已有完整实现） |
| 审批流程 | 审批流程 | /settings/approval | 保留（已有完整实现） |
| 通知设置 | 通知设置 | /settings/notification | 保留（已有完整实现） |
| 系统配置 | 系统配置 | /settings/system-config | 保留（已有完整实现） |
| 数据字典 | 数据字典 | /settings/dictionary | 保留（最佳实践参考） |
| 设备管理 | 设备管理 | /settings/device | 保留（待确认） |
| 班组管理 | 班组管理 | /settings/team | 保留（待确认） |
| 作物品种库 | 作物品种库 | /settings/crop-variety | 保留（待确认） |
| 成本核算 | 成本核算 | /settings/cost-accounting | 保留（待确认） |
| 操作日志 | 操作日志 | /settings/audit-log | 保留（待确认） |

**重组后菜单数量**：15个入口（从18个减少3个重复）

### 4.2 新菜单结构

```typescript
// Settings.tsx 新菜单配置

const settingsSections = [
  // 组织与权限（核心整合模块）
  { icon: Users, label: '组织管理', path: '/settings/organization', desc: '组织架构树形管理' },
  { icon: Shield, label: '角色管理', path: '/settings/role', desc: '按组织隔离的角色配置' },
  { icon: Key, label: '角色权限', path: '/settings/role-authority', desc: '角色对工序+动作的权限矩阵' },
  { icon: UserCheck, label: '用户管理', path: '/settings/user', desc: '用户账号与权限分配' },
  { icon: Lock, label: '用户权限', path: '/settings/user-authority', desc: '用户个人权限（可覆盖角色）' },
  { icon: Building, label: '数据权限', path: '/settings/data-authority', desc: '角色对组织的访问权限' },
  { icon: Settings, label: '工序管理', path: '/settings/process', desc: '工序树与动作配置' },

  // 基地与区域
  { icon: MapPin, label: '基地与区域', path: '/settings/base-region', desc: '公司、基地、区块管理' },

  // 生产相关
  { icon: Leaf, label: '种植模式', path: '/settings/planting-mode', desc: '管理种植模式配置' },
  { icon: Database, label: '作物品种库', path: '/settings/crop-variety', desc: '管理作物品种编码' },
  { icon: Package, label: '物料管理', path: '/settings/material', desc: '管理物资分类和物料' },

  // 仓储相关
  { icon: Warehouse, label: '仓库管理', path: '/settings/warehouse', desc: '仓库信息配置' },
  { icon: Users, label: '班组管理', path: '/settings/team', desc: '班组和班次管理' },

  // 审批与流程
  { icon: GitBranch, label: '审批流程', path: '/settings/approval', desc: '审批流程配置' },
  { icon: Bell, label: '通知设置', path: '/settings/notification', desc: '消息通知渠道和规则' },

  // 系统
  { icon: SettingsCog, label: '系统配置', path: '/settings/system-config', desc: '系统参数和全局配置' },
  { icon: BookOpen, label: '数据字典', path: '/settings/dictionary', desc: '管理所有枚举值和状态' },
  { icon: Monitor, label: '设备管理', path: '/settings/device', desc: 'IoT设备配置' },
  { icon: Calculator, label: '成本核算', path: '/settings/cost-accounting', desc: '成本类别和预算' },
  { icon: FileText, label: '操作日志', path: '/settings/audit-log', desc: '系统操作审计日志' },
];
```

---

## 五、数据库设计（整合版）

### 5.1 核心数据表

```sql
-- ============================================
-- 组织与权限体系（整合弘智耘源模型）
-- ============================================

-- 组织表（树形结构）
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  oid TEXT UNIQUE NOT NULL,           -- OrgOID 兼容原系统
  oid_parent TEXT REFERENCES organizations(oid), -- 父组织OID
  aid TEXT NOT NULL,                   -- OrgAID 组织编码
  name TEXT NOT NULL,                  -- 组织名称
  description TEXT,
  address TEXT,
  contactor TEXT,                      -- 联系人
  contactor_phone TEXT,
  contactor_mobile TEXT,
  contactor_email TEXT,
  org_type TEXT,                       -- 组织类型
  vi_logo TEXT,                        -- VI Logo
  vi_name TEXT,
  vi_description TEXT,
  vi_banner TEXT,
  sort_number INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 角色表（按组织隔离）
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  oid TEXT UNIQUE NOT NULL,           -- RoleOID
  org_oid TEXT NOT NULL,               -- 所属组织
  aid TEXT NOT NULL,                   -- RoleAID 角色编码
  name TEXT NOT NULL,                 -- 角色名称
  description TEXT,
  sort_number INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  oid TEXT UNIQUE NOT NULL,          -- UserOID
  org_oid TEXT NOT NULL,              -- 所属组织
  aid TEXT NOT NULL,                  -- UserAID 用户账号
  name TEXT NOT NULL,                -- 用户姓名
  password_hash TEXT,
  email TEXT,
  phone TEXT,
  avatar TEXT,
  status TEXT DEFAULT 'active',
  is_admin INTEGER DEFAULT 0,          -- 是否超管
  hire_date TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 用户角色关联表
CREATE TABLE user_roles (
  id TEXT PRIMARY KEY,
  user_oid TEXT NOT NULL,
  role_oid TEXT NOT NULL,
  created_at TEXT,
  UNIQUE(user_oid, role_oid)
);

-- 工序表（树形结构）
CREATE TABLE processes (
  id TEXT PRIMARY KEY,
  oid TEXT UNIQUE NOT NULL,           -- ProcessOID
  oid_parent TEXT REFERENCES processes(oid), -- 父工序OID
  aid TEXT NOT NULL,                   -- ProcessAID 工序编码
  name TEXT NOT NULL,                 -- 工序名称
  app_type INTEGER DEFAULT 0,         -- AppType: 0=Web, 1=Mobile
  exec_name TEXT,                     -- 执行名称
  exec_mode TEXT,                     -- 执行模式
  description TEXT,
  image_aid TEXT,                     -- 图标
  hidden INTEGER DEFAULT 0,            -- 是否隐藏
  sort_number INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 动作表
CREATE TABLE actions (
  id TEXT PRIMARY KEY,
  oid TEXT UNIQUE NOT NULL,           -- ActionOID
  aid TEXT NOT NULL,                   -- ActionAID 动作编码
  name TEXT NOT NULL,                 -- 动作名称
  category TEXT NOT NULL,             -- 分类（如：查询、编辑、审批）
  app_type INTEGER DEFAULT 0,          -- AppType: 0=Web, 1=Mobile
  description TEXT,
  image_aid TEXT,
  sort_number INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 角色权限矩阵 (Process × Action)
CREATE TABLE roles_authority (
  id TEXT PRIMARY KEY,
  role_oid TEXT NOT NULL,
  process_oid TEXT NOT NULL,
  action_oid TEXT NOT NULL,
  value INTEGER DEFAULT 0,              -- 1=有权限, 0=无权限
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(role_oid, process_oid, action_oid)
);

-- 用户权限矩阵（可覆盖角色权限）
CREATE TABLE users_authority (
  id TEXT PRIMARY KEY,
  user_oid TEXT NOT NULL,
  process_oid TEXT NOT NULL,
  action_oid TEXT NOT NULL,
  value INTEGER DEFAULT 0,              -- 1=有权限, 0=无权限, -1=未设置（继承角色）
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(user_oid, process_oid, action_oid)
);

-- 角色数据权限（组织访问控制）
CREATE TABLE roles_data_authority (
  id TEXT PRIMARY KEY,
  role_oid TEXT NOT NULL,
  org_oid TEXT NOT NULL,               -- 可访问的组织
  value INTEGER DEFAULT 1,              -- 1=可访问, 0=不可访问
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(role_oid, org_oid)
);

-- ============================================
-- 原有V1.1模块数据表（保留）
-- ============================================

-- 基地表
CREATE TABLE bases (
  id TEXT PRIMARY KEY,
  company_id TEXT,                      -- 关联公司
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  province TEXT,
  city TEXT,
  address TEXT,
  area REAL,                           -- 面积（亩）
  soil_type TEXT,
  ph REAL,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 公司表
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 区块表
CREATE TABLE blocks (
  id TEXT PRIMARY KEY,
  base_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  area REAL,
  greenhouse_count INTEGER,
  field_area REAL,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 部门表（V1.1原有，简化为组织的一种类型）
CREATE TABLE departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  parent_id TEXT,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 职位表
CREATE TABLE positions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  department_id TEXT,
  level INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 种植模式表
CREATE TABLE planting_modes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 物料分类表
CREATE TABLE material_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  parent_id TEXT,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 物料表
CREATE TABLE materials (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id TEXT,
  specification TEXT,
  unit TEXT,
  unit_price REAL,
  safe_stock REAL,
  default_supplier TEXT,
  default_location TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 仓库类型表
CREATE TABLE warehouse_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 仓库表
CREATE TABLE warehouses (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type_id TEXT,
  location TEXT,
  manager_name TEXT,
  capacity REAL,
  current_stock REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  description TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 审批流程表
CREATE TABLE approval_workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  module TEXT,
  trigger_condition TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 审批节点表
CREATE TABLE approval_nodes (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  name TEXT NOT NULL,
  approver_role TEXT,
  timeout_hours INTEGER DEFAULT 24,
  auto_approve_on_timeout INTEGER DEFAULT 0,
  require_comment INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

-- 通知渠道表
CREATE TABLE notification_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 通知规则表
CREATE TABLE notification_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  event TEXT NOT NULL,
  channels TEXT,
  recipients TEXT,
  frequency TEXT DEFAULT 'immediate',
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 系统配置表
CREATE TABLE system_configs (
  id TEXT PRIMARY KEY,
  config_key TEXT UNIQUE NOT NULL,
  config_name TEXT NOT NULL,
  config_value TEXT,
  config_type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 数据字典类型表
CREATE TABLE dictionary_types (
  id TEXT PRIMARY KEY,
  type_code TEXT UNIQUE NOT NULL,
  type_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 数据字典项表
CREATE TABLE dictionary_items (
  id TEXT PRIMARY KEY,
  type_id TEXT NOT NULL,
  item_code TEXT NOT NULL,
  item_value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(type_id, item_code)
);
```

### 5.2 数据联动机制

```typescript
// src/contexts/AuthSettingsContext.tsx

interface AuthSettingsContextType {
  // 组织架构
  organizations: Organization[];
  roles: Role[];
  users: User[];

  // 权限相关
  processes: Process[];
  actions: Action[];
  rolesAuthority: Map<string, Set<string>>;     // role_oid -> Set(process_oid_action_oid)
  usersAuthority: Map<string, Map<string, number>>; // user_oid -> (process_oid_action_oid -> value)
  rolesDataAuthority: Map<string, Set<string>>; // role_oid -> Set(org_oid)

  // 刷新方法
  refreshOrganizations: () => void;
  refreshRoles: () => void;
  refreshUsers: () => void;
  refreshProcesses: () => void;
  refreshActions: () => void;
  refreshRolesAuthority: () => void;
  refreshUsersAuthority: () => void;
  refreshRolesDataAuthority: () => void;

  // 权限检查
  checkProcessAuthority: (userOid: string, processOid: string, actionOid: string) => boolean;
  checkDataAuthority: (userOid: string, orgOid: string) => boolean;
}
```

### 5.3 权限检查逻辑

```typescript
// 权限检查优先级：用户个人权限 > 角色权限

function checkProcessAuthority(
  userOid: string,
  processOid: string,
  actionOid: string,
  usersAuthority: Map<string, Map<string, number>>,
  rolesAuthority: Map<string, Set<string>>,
  userRoles: { role_oid: string }[]
): boolean {
  // 1. 先检查用户个人权限（-1=未设置，0=无权限，1=有权限）
  const userAuth = usersAuthority.get(userOid);
  const userValue = userAuth?.get(`${processOid}_${actionOid}`);
  if (userValue !== undefined && userValue !== -1) {
    return userValue === 1;
  }

  // 2. 检查用户所有角色权限（OR逻辑）
  for (const role of userRoles) {
    const roleAuth = rolesAuthority.get(role.role_oid);
    if (roleAuth?.has(`${processOid}_${actionOid}`)) {
      return true;
    }
  }

  return false;
}
```

---

## 六、页面组件设计

### 6.1 组织管理页面 (OrganizationPage.tsx)

```
功能：
- 树形表格显示组织层级
- 支持新增同级/下级组织
- 支持编辑、删除组织
- 组织类型下拉选择（从数据字典读取）

界面布局：
┌─────────────────────────────────────────────────────────┐
│ [返回] 组织管理                          [+ 新增同级] [+ 新增下级] │
├─────────────────────────────────────────────────────────┤
│ 🔍 搜索: [____________]  [搜索]                          │
├─────────────────────────────────────────────────────────┤
│ ▼ 宁波帮帮忙公司                                      │
│   ├── ▼ 上海松江基地                                  │
│   │     └── 玻璃温室A区                               │
│   └── ▼ 上海崇明基地                                  │
│         └── ...                                       │
├─────────────────────────────────────────────────────────┤
│ 字段：组织编码 | 名称 | 类型 | 联系人 | 电话 | 排序 | 操作 │
└─────────────────────────────────────────────────────────┘
```

### 6.2 角色管理页面 (RoleManagementPage.tsx)

```
功能：
- 按组织过滤的角色列表
- 支持新增、编辑、删除角色
- 角色归属于组织

界面布局：
┌─────────────────────────────────────────────────────────┐
│ [返回] 角色管理                     [+ 新增角色]          │
├─────────────────────────────────────────────────────────┤
│ 所属组织: [▼ 选择组织 ________]                          │
├─────────────────────────────────────────────────────────┤
│ 角色编码    │ 角色名称    │ 排序  │ 操作                │
├─────────────────────────────────────────────────────────┤
│ admin      │ 系统管理员   │ 1    │ [编辑] [删除]       │
│ production │ 生产主管    │ 2    │ [编辑] [删除]       │
│ warehouse  │ 仓库管理员   │ 3    │ [编辑] [删除]       │
└─────────────────────────────────────────────────────────┘
```

### 6.3 角色权限页面 (RoleAuthorityPage.tsx)

```
功能：
- 选择角色 + AppType
- Process × Action 权限矩阵
- 支持水平授权（整行）、垂直授权（整列）、单元格授权
- 全选行/列

界面布局：
┌───────────────────────────────────────────────────────────────────┐
│ 角色: [▼ 选择角色 ________________________]  AppType: [Web▼]       │
├───────────────────────────────────────────────────────────────────┤
│ 工序                    │ 名称     │排序│ 全选 │ 查询 │ 编辑 │ 删除 │
├───────────────────────────────────────────────────────────────────┤
│ ▼ 生产管理              │          │    │  ☐  │  ☐  │  ☐  │  ☐  │
│   ├── 种植计划          │ 种植计划  │ 1  │  ☐  │  ☑  │  ☑  │  ☑  │
│   ├── 施肥任务          │ 施肥任务  │ 2  │  ☐  │  ☑  │  ☐  │  ☐  │
│   └── 采收记录          │ 采收记录  │ 3  │  ☐  │  ☑  │  ☑  │  ☐  │
│ ▼ 仓库管理              │          │    │  ☐  │  ☐  │  ☐  │  ☐  │
│   ├── 入库记录          │ 入库记录  │ 4  │  ☐  │  ☑  │  ☑  │  ☑  │
│   └── 出库记录          │ 出库记录  │ 5  │  ☐  │  ☑  │  ☑  │  ☑  │
├───────────────────────────────────────────────────────────────────┤
│                                            [保存]                  │
└───────────────────────────────────────────────────────────────────┘
```

### 6.4 用户管理页面 (UserManagementPage.tsx)

```
功能：
- 用户列表（按组织筛选）
- 支持新增、编辑、删除用户
- 用户角色分配（多选）
- 用户状态启用/停用

界面布局：
┌───────────────────────────────────────────────────────────────────┐
│ [返回] 用户管理                               [+ 新增用户]          │
├───────────────────────────────────────────────────────────────────┤
│ 组织: [▼ 选择组织 ________]  状态: [▼ 全部 __]  🔍 [搜索____]     │
├───────────────────────────────────────────────────────────────────┤
│ 账号    │ 姓名   │ 组织      │ 角色                    │ 状态  │ 操作│
├───────────────────────────────────────────────────────────────────┤
│ admin   │ 王建华  │ 宁波帮忙  │ [系统管理员]            │ 启用  │ 编辑│
│ zhangsan│ 张三   │ 上海松江  │ [生产主管] [仓库管理]  │ 启用  │ 编辑│
│ lisi    │ 李四   │ 上海崇明  │ [仓库管理员]           │ 停用  │ 编辑│
└───────────────────────────────────────────────────────────────────┘
```

### 6.5 用户权限页面 (UserAuthorityPage.tsx)

```
功能：
- 类似于角色权限，但针对单个用户
- 用户权限可覆盖角色权限（Override）
- 未设置的权限继承自角色

界面布局：
┌───────────────────────────────────────────────────────────────────┐
│ 用户: [▼ 选择用户 ________________________]  AppType: [Web▼]       │
├───────────────────────────────────────────────────────────────────┤
│ 说明: 勾选表示授予权限，留空表示继承角色权限，✗表示禁用权限       │
├───────────────────────────────────────────────────────────────────┤
│ 工序                    │ 名称     │排序│ 全选 │ 查询 │ 编辑 │ 删除 │
├───────────────────────────────────────────────────────────────────┤
│ ▼ 生产管理              │          │    │  ☐  │  ☐  │  ☐  │  ☐  │
│   ├── 种植计划          │ 种植计划  │ 1  │  ☐  │  ☑  │  ✗  │  ☐  │
│   ...                                                           │
└───────────────────────────────────────────────────────────────────┘
```

### 6.6 数据权限页面 (DataAuthorityPage.tsx)

```
功能：
- 选择角色
- 显示组织树
- 复选框控制角色对组织的访问权限

界面布局：
┌───────────────────────────────────────────────────────────────────┐
│ 角色: [▼ 选择角色 ________________________]                       │
├───────────────────────────────────────────────────────────────────┤
│ ☑ 全选/☐ 全不选                                                  │
├───────────────────────────────────────────────────────────────────┤
│ ▼ 宁波帮帮忙公司                                                │
│   ├── ☑ 上海松江基地                                            │
│   │     ├── ☑ 玻璃温室A区                                       │
│   │     └── ☑ 玻璃温室B区                                       │
│   └── ☑ 上海崇明基地                                            │
│         ├── ☐ 日光温室1号（未授权）                              │
│         └── ☐ 日光温室2号（未授权）                              │
├───────────────────────────────────────────────────────────────────┤
│                                            [保存]                  │
└───────────────────────────────────────────────────────────────────┘
```

### 6.7 工序管理页面 (ProcessManagementPage.tsx)

```
功能：
- 树形表格显示工序结构
- 支持新增、编辑、删除工序
- AppType区分（Web/Mobile）

界面布局：
┌───────────────────────────────────────────────────────────────────┐
│ [返回] 工序管理                           [+ 新增工序] [AppType▼] │
├───────────────────────────────────────────────────────────────────┤
│ 工序编码    │ 工序名称    │ 上级工序  │ 类型  │ 排序 │ 操作        │
├───────────────────────────────────────────────────────────────────┤
│ production │ 生产管理    │ (根)      │ Web   │ 1    │ [编辑] [删除]│
│ ├── plan   │ 种植计划    │ 生产管理  │ Web   │ 1.1  │ [编辑] [删除]│
│ ├── fertil │ 施肥任务    │ 生产管理  │ Web   │ 1.2  │ [编辑] [删除]│
│ └── harvest│ 采收记录    │ 生产管理  │ Web   │ 1.3  │ [编辑] [删除]│
│ warehouse  │ 仓库管理    │ (根)      │ Web   │ 2    │ [编辑] [删除]│
└───────────────────────────────────────────────────────────────────┘
```

---

## 七、实施步骤

### 第一阶段：框架搭建（1-2周）

1. **创建数据库层**
   - [ ] 集成 SQLite（使用 sql.js 或 better-sqlite3）
   - [ ] 创建数据库初始化脚本
   - [ ] 定义数据表类型

2. **创建全局状态管理**
   - [ ] 创建 AuthSettingsContext
   - [ ] 实现数据订阅机制
   - [ ] 实现权限检查函数

3. **迁移组织管理**
   - [ ] 创建 OrganizationPage.tsx
   - [ ] 实现树形CRUD

4. **迁移角色管理**
   - [ ] 创建 RoleManagementPage.tsx
   - [ ] 按组织过滤

### 第二阶段：权限体系（2-3周）

5. **迁移工序管理**
   - [ ] 创建 ProcessManagementPage.tsx
   - [ ] 实现树形结构

6. **迁移动作管理**
   - [ ] 创建 ActionManagementPage.tsx
   - [ ] 支持分类显示

7. **迁移角色权限**
   - [ ] 创建 RoleAuthorityPage.tsx
   - [ ] 实现 Process×Action 矩阵

8. **迁移用户权限**
   - [ ] 创建 UserAuthorityPage.tsx
   - [ ] 实现Override机制

9. **迁移数据权限**
   - [ ] 创建 DataAuthorityPage.tsx
   - [ ] 组织树复选框

### 第三阶段：用户与集成（1-2周）

10. **迁移用户管理**
    - [ ] 创建 UserManagementPage.tsx
    - [ ] 角色分配功能

11. **集成权限检查**
    - [ ] 在业务页面添加权限控制
    - [ ] 按钮级别的权限显隐

### 第四阶段：数据填充（持续）

12. **用户填充初始数据**
    - [ ] 提供数据导入模板
    - [ ] 指导用户输入数据
    - [ ] 验证数据完整性

---

## 八、数据迁移对照

### 8.1 V1.1 → 弘智耘源模型映射

| V1.1概念 | 弘智耘源模型 | 说明 |
|---------|-------------|------|
| 部门 | Organization | 组织是更广义的概念 |
| 职位 | Position | 保留独立表 |
| 用户 | User | 基本一致 |
| 角色 | Role | 基本一致 |
| 工序 | Process | 增加树形结构 |
| - | Action | 新增动作表 |
| - | RolesAuthority | 新增权限矩阵 |
| - | UsersAuthority | 新增用户权限 |
| - | RolesDataAuthority | 新增数据权限 |

### 8.2 弘智耘源数据迁移到V1.1

```
来源表 → 目标表：
Orgs → organizations (新增 oid, oid_parent 字段)
Roles → roles (新增 oid 字段)
Users → users (新增 oid 字段)
Processes → processes (新增 oid, oid_parent 字段)
Actions → actions (新增 oid 字段)
RolesAuthority → roles_authority
UsersAuthority → users_authority
RolesDataAuthority → roles_data_authority
```

---

## 九、注意事项

### 9.1 兼容性考虑

1. **V1.1现有数据**：部门、职位等数据需要迁移到新组织架构
2. **localStorage 迁移**：现有 localStorage 数据需要一次性迁移到 SQLite
3. **路由兼容**：保持原有路由可用，逐步切换

### 9.2 性能考虑

1. **权限矩阵查询**：大矩阵使用 Map 缓存，避免每次遍历
2. **组织树加载**：按需加载子节点，支持大量组织
3. **用户权限缓存**：用户登录时一次性加载所有权限到内存

### 9.3 安全考虑

1. **数据权限检查**：所有数据查询前必须检查组织权限
2. **超管用户**：is_admin=1 绕过所有权限检查
3. **默认拒绝**：未配置的权限默认视为无权限

---

## 十、后续工作

- [ ] 确认设备管理、班组管理，成本核算、操作日志页面的具体需求
- [ ] 设计 Excel/CSV 数据导入模板
- [ ] 制定用户培训计划
- [ ] 建立数据验证规则
- [ ] 编写使用文档

---

*方案制定时间：2026-05-02*
*方案版本：V2.0*
*参考系统：弘智耘源权限管理模块*
