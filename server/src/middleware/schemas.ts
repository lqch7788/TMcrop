/**
 * 常用验证 Schema
 * 提供登录、用户创建等常用数据的验证定义
 */

import { z } from 'zod';

// ============================================
// 登录验证
// ============================================

/**
 * 用户登录 Schema
 */
export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

/**
 * 登录响应 Schema
 */
export type LoginInput = z.infer<typeof loginSchema>;

// ============================================
// 用户管理验证
// ============================================

/**
 * 用户基本信息 Schema
 */
export const userBaseSchema = z.object({
  oid: z.string().optional(),
  aid: z.string().min(1, '用户账号不能为空'), // username -> aid
  name: z.string().min(1, '用户姓名不能为空'), // real_name -> name
  passwordHash: z.string().optional(),
  orgOid: z.string().optional(),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

/**
 * 保存用户 Schema（新增或更新）
 */
export const saveUserSchema = z.object({
  inserted: z.array(userBaseSchema).optional(),
  updated: z.array(userBaseSchema.extend({
    oid: z.string().min(1, '更新时 oid 不能为空'),
  })).optional(),
  deleted: z.array(z.string()).optional(),
});

/**
 * 用户角色关联 Schema
 */
export const userRolesSchema = z.object({
  roleOids: z.array(z.string()).min(1, '至少选择一个角色'),
});

// ============================================
// 组织管理验证
// ============================================

/**
 * 组织节点 Schema
 */
export const organizationSchema = z.object({
  oid: z.string().optional(),
  oidParent: z.string().optional(),
  aid: z.string().min(1, '组织编码不能为空'),
  name: z.string().min(1, '组织名称不能为空'),
  description: z.string().optional(),
  address: z.string().optional(),
  contactor: z.string().optional(),
  contactorPhone: z.string().optional(),
  contactorMobile: z.string().optional(),
  contactorEmail: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  orgType: z.enum(['company', 'department', 'team']).optional(),
  sortNumber: z.number().optional(),
});

/**
 * 保存组织 Schema
 */
export const saveOrganizationSchema = z.object({
  inserted: z.array(organizationSchema).optional(),
  updated: z.array(organizationSchema.extend({
    oid: z.string().min(1, '更新时 oid 不能为空'),
  })).optional(),
  deleted: z.array(z.string()).optional(),
});

// ============================================
// 角色管理验证
// ============================================

/**
 * 角色 Schema
 */
export const roleSchema = z.object({
  oid: z.string().optional(),
  aid: z.string().min(1, '角色编码不能为空'), // role_code -> aid
  name: z.string().min(1, '角色名称不能为空'), // role_name -> name
  description: z.string().optional(),
  isSystem: z.boolean().optional(),
});

/**
 * 保存角色 Schema
 */
export const saveRoleSchema = z.object({
  inserted: z.array(roleSchema).optional(),
  updated: z.array(roleSchema.extend({
    oid: z.string().min(1, '更新时 oid 不能为空'),
  })).optional(),
  deleted: z.array(z.string()).optional(),
});

// ============================================
// 工序管理验证
// ============================================

/**
 * 工序 Schema
 */
export const processSchema = z.object({
  oid: z.string().optional(),
  oidParent: z.string().optional(),
  aid: z.string().min(1, '工序编码不能为空'),
  name: z.string().min(1, '工序名称不能为空'),
  appType: z.number().optional(),
  execName: z.string().optional(),
  execMode: z.string().optional(),
  description: z.string().optional(),
  imageAid: z.string().optional(),
  hidden: z.boolean().optional(),
  sortNumber: z.number().optional(),
});

/**
 * 保存工序 Schema
 */
export const saveProcessSchema = z.object({
  inserted: z.array(processSchema).optional(),
  updated: z.array(processSchema.extend({
    oid: z.string().min(1, '更新时 oid 不能为空'),
  })).optional(),
  deleted: z.array(z.string()).optional(),
});

// ============================================
// 角色权限验证
// ============================================

/**
 * 角色权限项 Schema
 */
export const authorityItemSchema = z.object({
  processOid: z.string().min(1, '工序 oid 不能为空'),
  actionOid: z.string().min(1, '动作 oid 不能为空'),
  value: z.number().int().min(-1).max(1),
});

/**
 * 保存角色权限 Schema
 */
export const saveRoleAuthoritySchema = z.object({
  authorities: z.array(authorityItemSchema),
});

// ============================================
// 角色数据权限验证
// ============================================

/**
 * 保存角色数据权限 Schema
 */
export const saveRoleDataAuthoritySchema = z.object({
  orgOids: z.array(z.string()).min(1, '至少选择一个组织'),
  isAuthorize: z.boolean(),
});

// ============================================
// 通用分页查询验证
// ============================================

/**
 * 分页查询 Schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * ID 查询 Schema
 */
export const idQuerySchema = z.object({
  id: z.string().min(1, 'ID 不能为空'),
});
