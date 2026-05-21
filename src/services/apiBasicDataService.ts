/**
 * 基础数据 API 服务
 * 对接后端 /api/basic-data 和 /api/dictionary
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 */

import { enhancedApiClient } from '../lib/apiClient';

// ============================================
// 类型定义
// ============================================

/**
 * 部门
 */
export interface Department {
  id: string;
  oid: string;
  code: string;
  name: string;
  managerId?: string;
  managerName?: string;
  parentOid?: string;
  parentName?: string;
  sortNumber?: number;
  description?: string;
  status?: string;
  staffCount?: number;
  createdAt?: string;
}

/**
 * 仓库
 */
export interface Warehouse {
  id: string;
  oid: string;
  code: string;
  name: string;
  warehouseType?: string;
  location?: string;
  capacity?: number;
  currentStock?: number;
  managerId?: string;
  managerName?: string;
  status?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 温室/基地
 */
export interface Greenhouse {
  id: string;
  oid: string;
  code: string;
  name: string;
  greenhouseType?: string;
  area?: number;
  location?: string;
  baseOid?: string;
  baseName?: string;
  companyId?: string;
  companyName?: string;
  lng?: number;
  lat?: number;
  crop?: string;
  growthDay?: number;
  manager?: string;
  phone?: string;
  soilType?: string;
  ph?: number;
  intro?: string;
  greenhouseCount?: number;
  fieldArea?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 区域
 */
export interface Zone {
  id: string;
  oid: string;
  zoneCode: string;
  zoneName: string;
  greenhouseOid?: string;
  baseOid?: string;
  baseName?: string;
  zoneType?: string;
  area?: number;
  sortOrder?: number;
  status?: string;
  description?: string;
  createdAt?: string;
}

/**
 * 地块
 */
export interface Block {
  id: string;
  oid: string;
  blockCode: string;
  blockName: string;
  zoneOid?: string;
  zoneName?: string;
  zoneCode?: string;
  blockType?: string;
  area?: number;
  sortOrder?: number;
  status?: string;
  description?: string;
  createdAt?: string;
}

/**
 * 编码规则
 */
export interface CodeRule {
  id: string;
  entityType: string;
  prefix: string;
  seqLength: number;
  currentSeq: number;
  datePattern?: string;
  description?: string;
  status?: string;
  createdAt?: string;
}

/**
 * 系统配置
 */
export interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  configType: string;
  category?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 字典项
 */
export interface Dictionary {
  id: string;
  categoryCode: string;
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  sortOrder?: number;
  color?: string;
  status?: string;
  createdAt?: string;
}

/**
 * 字典分类
 */
export interface DictionaryCategory {
  id: string;
  code: string;
  name: string;
  module?: string;
  description?: string;
  sortOrder?: number;
  status?: string;
  createdAt?: string;
}

/**
 * 班组
 */
export interface Team {
  id: string;
  oid: string;
  teamCode: string;
  teamName: string;
  departmentOid?: string;
  departmentName?: string;
  leaderId?: string;
  leaderName?: string;
  shiftType?: string;
  memberCount?: number;
  description?: string;
  status?: string;
  createdAt?: string;
}

/**
 * 职位
 */
export interface Position {
  id: string;
  oid: string;
  code: string;
  name: string;
  departmentOid?: string;
  departmentName?: string;
  level?: number;
  description?: string;
  sortOrder?: number;
  status?: string;
  createdAt?: string;
}

/**
 * 设备
 */
export interface Device {
  id: string;
  oid: string;
  deviceCode: string;
  deviceName: string;
  deviceType?: string;
  manufacturer?: string;
  serialNumber?: string;
  greenhouseOid?: string;
  greenhouseName?: string;
  location?: string;
  installDate?: string;
  status?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  description?: string;
  createdAt?: string;
}

// ============================================
// 部门 API
// ============================================

/**
 * 获取所有部门
 * 降级策略：API → IndexedDB 缓存
 */
export async function getDepartments(): Promise<Department[]> {
  const data = await enhancedApiClient.get<Department[]>('/basic-data/departments');
  return data || [];
}

/** 创建部门 */
export async function createDepartment(dept: Partial<Department>): Promise<Department> {
  const result = await enhancedApiClient.post<Department>('/basic-data/departments', dept);
  return result;
}

/** 更新部门 */
export async function updateDepartment(id: string, dept: Partial<Department>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/departments/${id}`, dept);
}

/** 删除部门 */
export async function deleteDepartment(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/departments/${id}`);
}

// ============================================
// 仓库 API
// ============================================

/**
 * 获取所有仓库
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWarehouses(): Promise<Warehouse[]> {
  const data = await enhancedApiClient.get<Warehouse[]>('/basic-data/warehouses');
  return data || [];
}

/**
 * 创建仓库
 * 降级策略：API → 离线队列
 */
export async function createWarehouse(warehouse: Partial<Warehouse>): Promise<Warehouse> {
  const result = await enhancedApiClient.post<Warehouse>('/basic-data/warehouses', warehouse);
  return result;
}

/**
 * 更新仓库
 * 降级策略：API → 离线队列
 */
export async function updateWarehouse(id: string, warehouse: Partial<Warehouse>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/warehouses/${id}`, warehouse);
}

/**
 * 删除仓库
 * 降级策略：API → 离线队列
 */
export async function deleteWarehouse(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/warehouses/${id}`);
}

// ============================================
// 温室/基地 API
// ============================================

/**
 * 获取所有温室
 * 降级策略：API → IndexedDB 缓存
 */
export async function getGreenhouses(): Promise<Greenhouse[]> {
  const data = await enhancedApiClient.get<Greenhouse[]>('/basic-data/greenhouses');
  return data || [];
}

/**
 * 创建温室
 * 降级策略：API → 离线队列
 */
export async function createGreenhouse(greenhouse: Partial<Greenhouse>): Promise<Greenhouse> {
  const result = await enhancedApiClient.post<Greenhouse>('/basic-data/greenhouses', greenhouse);
  return result;
}

/**
 * 更新温室
 * 降级策略：API → 离线队列
 */
export async function updateGreenhouse(id: string, greenhouse: Partial<Greenhouse>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/greenhouses/${id}`, greenhouse);
}

/**
 * 删除温室
 * 降级策略：API → 离线队列
 */
export async function deleteGreenhouse(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/greenhouses/${id}`);
}

// ============================================
// 区域 API
// ============================================

/**
 * 获取所有区域
 * 降级策略：API → IndexedDB 缓存
 */
export async function getZones(): Promise<Zone[]> {
  const data = await enhancedApiClient.get<Zone[]>('/basic-data/zones');
  return data || [];
}

/**
 * 创建区域
 * 降级策略：API → 离线队列
 */
export async function createZone(zone: Partial<Zone>): Promise<Zone> {
  const result = await enhancedApiClient.post<Zone>('/basic-data/zones', zone);
  return result;
}

/**
 * 更新区域
 * 降级策略：API → 离线队列
 */
export async function updateZone(id: string, zone: Partial<Zone>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/zones/${id}`, zone);
}

/**
 * 删除区域
 * 降级策略：API → 离线队列
 */
export async function deleteZone(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/zones/${id}`);
}

// ============================================
// 地块 API
// ============================================

/**
 * 获取所有地块
 * 降级策略：API → IndexedDB 缓存
 */
export async function getBlocks(): Promise<Block[]> {
  const data = await enhancedApiClient.get<Block[]>('/basic-data/blocks');
  return data || [];
}

/**
 * 创建地块
 * 降级策略：API → 离线队列
 */
export async function createBlock(block: Partial<Block>): Promise<Block> {
  const result = await enhancedApiClient.post<Block>('/basic-data/blocks', block);
  return result;
}

/**
 * 更新地块
 * 降级策略：API → 离线队列
 */
export async function updateBlock(id: string, block: Partial<Block>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/blocks/${id}`, block);
}

/**
 * 删除地块
 * 降级策略：API → 离线队列
 */
export async function deleteBlock(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/blocks/${id}`);
}

// ============================================
// 编码规则 API
// ============================================

/**
 * 获取所有编码规则
 * 降级策略：API → IndexedDB 缓存
 */
export async function getCodeRules(): Promise<CodeRule[]> {
  const data = await enhancedApiClient.get<CodeRule[]>('/basic-data/code-rules');
  return data || [];
}

// ============================================
// 系统配置 API
// ============================================

/**
 * 获取所有系统配置
 * 降级策略：API → IndexedDB 缓存
 */
export async function getSystemConfigs(): Promise<SystemConfig[]> {
  const data = await enhancedApiClient.get<SystemConfig[]>('/basic-data/system-configs');
  return data || [];
}

/**
 * 创建系统配置
 * 降级策略：API → 离线队列
 */
export async function createSystemConfig(config: Partial<SystemConfig>): Promise<SystemConfig> {
  const result = await enhancedApiClient.post<SystemConfig>('/basic-data/system-configs', config);
  return result;
}

/**
 * 更新系统配置
 * 降级策略：API → 离线队列
 */
export async function updateSystemConfig(id: string, config: Partial<SystemConfig>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/system-configs/${id}`, config);
}

/**
 * 删除系统配置
 * 降级策略：API → 离线队列
 */
export async function deleteSystemConfig(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/system-configs/${id}`);
}

// ============================================
// 字典 API
// ============================================

/**
 * 获取所有字典项
 * 降级策略：API → IndexedDB 缓存
 *
 * 注意：后端返回 snake_case (category_code, dict_code)，
 * 需要转换为前端使用的 camelCase (categoryCode, dictCode)
 */
export async function getDictionaries(category?: string): Promise<Dictionary[]> {
  // 临时禁用缓存，确保获取最新数据
  const response = await enhancedApiClient.get<Record<string, any>[]>('/dictionary/dictionaries');

  if (!response) return [];

  // 转换 snake_case 为 camelCase
  return response.map(item => ({
    id: item.id,
    categoryCode: item.category_code,
    dictCode: item.dict_code,
    dictLabel: item.dict_label,
    dictValue: item.dict_value,
    sortOrder: item.sort_order,
    color: item.color,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
}

/**
 * 获取字典分类列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getDictionaryCategories(): Promise<string[]> {
  const data = await enhancedApiClient.get<string[]>('/dictionary/dictionaries/categories');
  return data || [];
}

// ============================================
// 班组 API
// ============================================

/**
 * 获取所有班组
 * 降级策略：API → IndexedDB 缓存
 */
export async function getTeams(): Promise<Team[]> {
  const data = await enhancedApiClient.get<Team[]>('/basic-data/teams');
  return data || [];
}

/**
 * 创建班组
 * 降级策略：API → 离线队列
 */
export async function createTeam(team: Partial<Team>): Promise<Team> {
  const result = await enhancedApiClient.post<Team>('/basic-data/teams', team);
  return result;
}

/**
 * 更新班组
 * 降级策略：API → 离线队列
 */
export async function updateTeam(id: string, team: Partial<Team>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/teams/${id}`, team);
}

/**
 * 删除班组
 * 降级策略：API → 离线队列
 */
export async function deleteTeam(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/teams/${id}`);
}

// ============================================
// 职位 API
// ============================================

/**
 * 获取所有职位
 * 降级策略：API → IndexedDB 缓存
 */
export async function getPositions(): Promise<Position[]> {
  const data = await enhancedApiClient.get<Position[]>('/basic-data/positions');
  return data || [];
}

/**
 * 创建职位
 * 降级策略：API → 离线队列
 */
export async function createPosition(position: Partial<Position>): Promise<Position> {
  const result = await enhancedApiClient.post<Position>('/basic-data/positions', position);
  return result;
}

/**
 * 更新职位
 * 降级策略：API → 离线队列
 */
export async function updatePosition(id: string, position: Partial<Position>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/positions/${id}`, position);
}

/**
 * 删除职位
 * 降级策略：API → 离线队列
 */
export async function deletePosition(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/positions/${id}`);
}

// ============================================
// 设备 API
// ============================================

/**
 * 获取所有设备
 * 降级策略：API → IndexedDB 缓存
 */
export async function getDevices(): Promise<Device[]> {
  const data = await enhancedApiClient.get<Device[]>('/basic-data/devices');
  return data || [];
}

/**
 * 创建设备
 * 降级策略：API → 离线队列
 */
export async function createDevice(device: Partial<Device>): Promise<Device> {
  const result = await enhancedApiClient.post<Device>('/basic-data/devices', device);
  return result;
}

/**
 * 更新设备
 * 降级策略：API → 离线队列
 */
export async function updateDevice(id: string, device: Partial<Device>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/devices/${id}`, device);
}

/**
 * 删除设备
 * 降级策略：API → 离线队列
 */
export async function deleteDevice(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/devices/${id}`);
}

// ============================================
// 工序定义类型
// ============================================

export interface ProcessDefinition {
  id: number;
  oid: string;
  processCode: string;
  processName: string;
  processType?: string;
  unit?: string;
  defaultPrice?: number;
  defaultBonus?: number;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// 工序定义 API
// ============================================

/** 获取所有工序定义 */
export async function getProcessDefinitions(): Promise<ProcessDefinition[]> {
  const data = await enhancedApiClient.get<ProcessDefinition[]>('/basic-data/process-definitions');
  return data || [];
}

/** 创建工序定义 */
export async function createProcessDefinition(item: Partial<ProcessDefinition>): Promise<ProcessDefinition> {
  const result = await enhancedApiClient.post<ProcessDefinition>('/basic-data/process-definitions', item);
  return result;
}

/** 更新工序定义 */
export async function updateProcessDefinition(id: number | string, item: Partial<ProcessDefinition>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/process-definitions/${id}`, item);
}

/** 删除工序定义 */
export async function deleteProcessDefinition(id: number | string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/process-definitions/${id}`);
}

// ============================================
// 分级审批 — 审批级别配置
// ============================================

export interface ApprovalLevelConfigItem {
  id: number;
  oid: string;
  levelCode: string;
  levelName: string;
  description: string;
  approverCount: number;
  requireMultiApprover: number;
  approverRoles: string[] | null;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** 获取所有审批级别配置 */
export async function getApprovalLevelConfigs(): Promise<ApprovalLevelConfigItem[]> {
  const data = await enhancedApiClient.get<ApprovalLevelConfigItem[]>('/basic-data/approval-level-configs');
  return data || [];
}

/** 更新审批级别配置 */
export async function updateApprovalLevelConfig(id: number, item: Partial<ApprovalLevelConfigItem>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/approval-level-configs/${id}`, item);
}

// ============================================
// 分级审批 — 审批金额阈值
// ============================================

export interface ApprovalAmountThresholdItem {
  id: number;
  oid: string;
  maxAmount: number;
  levelCode: string;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** 获取所有金额阈值 */
export async function getApprovalAmountThresholds(): Promise<ApprovalAmountThresholdItem[]> {
  const data = await enhancedApiClient.get<ApprovalAmountThresholdItem[]>('/basic-data/approval-amount-thresholds');
  return data || [];
}

/** 创建金额阈值 */
export async function createApprovalAmountThreshold(item: Partial<ApprovalAmountThresholdItem>): Promise<ApprovalAmountThresholdItem> {
  const result = await enhancedApiClient.post<ApprovalAmountThresholdItem>('/basic-data/approval-amount-thresholds', item);
  return result;
}

/** 更新金额阈值 */
export async function updateApprovalAmountThreshold(id: number, item: Partial<ApprovalAmountThresholdItem>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/approval-amount-thresholds/${id}`, item);
}

/** 删除金额阈值 */
export async function deleteApprovalAmountThreshold(id: number): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/approval-amount-thresholds/${id}`);
}

// ============================================
// 分级审批 — 审批类型规则
// ============================================

export interface ApprovalTypeRuleItem {
  id: number;
  oid: string;
  approvalType: string;
  forceExempt: number;
  forceStrict: number;
  forcedLevel: string | null;
  batchApprovalSupported: number;
  customApproverCount: number | null;
  remark: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** 获取所有审批类型规则 */
export async function getApprovalTypeRules(): Promise<ApprovalTypeRuleItem[]> {
  const data = await enhancedApiClient.get<ApprovalTypeRuleItem[]>('/basic-data/approval-type-rules');
  return data || [];
}

/** 更新审批类型规则 */
export async function updateApprovalTypeRule(id: number, item: Partial<ApprovalTypeRuleItem>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/approval-type-rules/${id}`, item);
}

// ============================================
// 班次管理
// ============================================

/** 班次 */
export interface Shift {
  id: number;
  oid: string;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  shiftType?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 获取所有班次 */
export async function getShifts(): Promise<Shift[]> {
  const data = await enhancedApiClient.get<Shift[]>('/basic-data/shifts');
  return data || [];
}

/** 创建班次 */
export async function createShift(shift: Partial<Shift>): Promise<Shift> {
  const result = await enhancedApiClient.post<Shift>('/basic-data/shifts', shift);
  return result;
}

/** 更新班次 */
export async function updateShift(id: number, shift: Partial<Shift>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/shifts/${id}`, shift);
}

/** 删除班次 */
export async function deleteShift(id: number): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/shifts/${id}`);
}

// ============================================
// 成本核算管理
// ============================================

/** 成本类别 */
export interface CostCategoryItem {
  id: number;
  oid: string;
  categoryCode: string;
  categoryName: string;
  categoryType: string;
  unit?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 成本预算 */
export interface CostBudgetItem {
  id: number;
  oid: string;
  budgetName: string;
  categoryOid: string;
  budgetYear: number;
  budgetMonth?: number;
  budgetAmount: number;
  usedAmount: number;
  status?: string;
  categoryName?: string;
  categoryCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getCostCategories(): Promise<CostCategoryItem[]> {
  const data = await enhancedApiClient.get<CostCategoryItem[]>('/basic-data/cost-categories');
  return data || [];
}

export async function createCostCategory(item: Partial<CostCategoryItem>): Promise<CostCategoryItem> {
  return await enhancedApiClient.post<CostCategoryItem>('/basic-data/cost-categories', item);
}

export async function updateCostCategory(id: number, item: Partial<CostCategoryItem>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/cost-categories/${id}`, item);
}

export async function deleteCostCategory(id: number): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/cost-categories/${id}`);
}

export async function getCostBudgets(): Promise<CostBudgetItem[]> {
  const data = await enhancedApiClient.get<CostBudgetItem[]>('/basic-data/cost-budgets');
  return data || [];
}

export async function createCostBudget(item: Partial<CostBudgetItem>): Promise<CostBudgetItem> {
  return await enhancedApiClient.post<CostBudgetItem>('/basic-data/cost-budgets', item);
}

export async function updateCostBudget(id: number, item: Partial<CostBudgetItem>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/cost-budgets/${id}`, item);
}

export async function deleteCostBudget(id: number): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/cost-budgets/${id}`);
}

// ========== 物料类型 & API ==========

export interface MaterialType {
  id: number;
  oid: string;
  typeCode: string;
  typeName: string;
  category?: string;
  defaultUnit?: string;
  defaultPrice?: number;
  specifications?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getMaterialTypes(): Promise<MaterialType[]> {
  const data = await enhancedApiClient.get<MaterialType[]>('/basic-data/material-types');
  return data || [];
}

export async function createMaterialType(item: Partial<MaterialType>): Promise<MaterialType> {
  return await enhancedApiClient.post<MaterialType>('/basic-data/material-types', item);
}

export async function updateMaterialType(id: number, item: Partial<MaterialType>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/material-types/${id}`, item);
}

export async function deleteMaterialType(id: number): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/material-types/${id}`);
}

// ============================================
// 基地管理 API（基地空间架构 V1.0）
// ============================================

/** 基地 */
export interface Base {
  id: number;
  oid: string;
  code: string;
  name: string;
  companyOid: string;
  companyName: string;
  area: number;
  unit: string;
  province: string;
  city: string;
  lng: number;
  lat: number;
  manager: string;
  phone: string;
  soilType: string;
  ph: number;
  status: string;
  intro: string;
  greenhouseCount: number;
  fieldArea: number;
  createdAt?: string;
  updatedAt?: string;
}

/** 获取基地列表 */
export async function getBases(companyOid?: string): Promise<Base[]> {
  let url = '/basic-data/bases';
  if (companyOid) url += `?company_oid=${companyOid}`;
  const data = await enhancedApiClient.get<Base[]>(url);
  return data || [];
}

/** 创建基地 */
export async function createBase(base: Partial<Base>): Promise<Base> {
  const result = await enhancedApiClient.post<Base>('/basic-data/bases', base);
  return result;
}

/** 更新基地 */
export async function updateBase(oid: string, base: Partial<Base>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/bases/${oid}`, base);
}

/** 删除基地 */
export async function deleteBase(oid: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/bases/${oid}`);
}
