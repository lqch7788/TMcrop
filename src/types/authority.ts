// ============================================
// 组织与权限管理系统类型定义
// 来源参考：弘智耘源 authority2 模块
// 创建日期：2026-05-02
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
  oid?: string;                    // 组织OID（原系统字段）— 2026-06-30 改为可选兼容
  oidParent?: string | null;       // 父组织OID
  aid?: string;                    // 组织编码（OrgAID）— 2026-06-30 改为可选兼容
  name: string;                   // 组织名称
  description?: string;           // 描述
  address?: string;               // 地址
  contactor?: string;             // 联系人
  contactorPhone?: string;        // 联系人电话
  contactorMobile?: string;       // 联系人手机
  contactorEmail?: string;        // 联系人邮箱
  orgType?: OrgType;             // 组织类型
  departmentId?: string;          // 关联部门ID（双向同步桥接字段）
  departmentName?: string;        // 关联部门名称
  viLogo?: string;               // VI Logo
  viName?: string;               // VI名称
  viDescription?: string;         // VI描述
  viBanner?: string;             // VI横幅
  sortNumber?: number;           // 排序号
  status?: OrgStatus;
  createdAt?: string;
  updatedAt?: string;
  children?: Organization[];     // 子组织
  [key: string]: any;            // 兼容任意字段
}

// ============================================
// 角色管理
// ============================================

export interface Role {
  id?: string;
  oid?: string;
  aid?: string;       // 2026-06-30 改为可选兼容
  code?: string;
  name: string;
  orgOid?: string;
  description?: string;
  status?: any;
  sortNumber?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
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
  orgOid?: string;                // 所属组织OID（前端字段）
  org_oid?: string;               // 所属组织OID（后端字段）
  department_oid?: string;        // 所属部门OID（自动从组织关联填充）
  departmentOid?: string;         // 所属部门OID（前端字段）
  aid?: string;                   // 用户账号（UserAID）
  username?: string;              // 用户名（后端字段）
  name?: string;                  // 用户姓名
  real_name?: string;             // 用户姓名（后端字段）
  passwordHash?: string;           // 密码哈希
  email?: string;
  phone?: string;
  avatar?: string;
  status?: OrgStatus;
  isAdmin?: boolean;               // 是否超管
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
  oid?: string;                    // 工序OID — 2026-06-30 改为可选
  oidParent?: string | null;        // 父工序OID
  aid?: string;                    // 工序编码（ProcessAID）— 2026-06-30 改为可选
  name: string;                   // 工序名称
  appType?: AppType;              // App类型
  execName?: string;               // 执行名称
  execMode?: string;               // 执行模式
  description?: string;
  imageAid?: string;              // 图标
  hidden?: boolean;               // 是否隐藏
  sortNumber?: number;
  status?: OrgStatus;
  createdAt?: string;
  updatedAt?: string;
  children?: Process[];            // 子工序
  code?: string;                    // 2026-06-30 兼容
  category?: string;                // 2026-06-30 兼容
  [key: string]: any;
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
  oid?: string;                    // 动作OID — 2026-06-30 改为可选
  aid?: string;                    // 动作编码（ActionAID）— 2026-06-30 改为可选
  name: string;                   // 动作名称
  category?: string;              // 分类（如：查询、编辑、删除、审批）— 2026-06-30 改为可选
  appType?: AppType;              // App类型
  description?: string;
  imageAid?: string;
  sortNumber?: number;
  status?: OrgStatus;
  createdAt?: string;
  updatedAt?: string;
  code?: string;                   // 2026-06-30 兼容
  [key: string]: any;
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
  yjUser?: unknown;
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
