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
  sortNumber?: number;
  status?: string;
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
  const data = await enhancedApiClient.get<Department[]>('/basic-data/departments', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  return data || [];
}

// ============================================
// 仓库 API
// ============================================

/**
 * 获取所有仓库
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWarehouses(): Promise<Warehouse[]> {
  const data = await enhancedApiClient.get<Warehouse[]>('/basic-data/warehouses', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  return data || [];
}

/**
 * 创建仓库
 * 降级策略：API → 离线队列
 */
export async function createWarehouse(warehouse: Partial<Warehouse>): Promise<Warehouse> {
  const result = await enhancedApiClient.post<Warehouse>('/basic-data/warehouses', warehouse, {
    offlineQueue: true,
  });
  return result;
}

/**
 * 更新仓库
 * 降级策略：API → 离线队列
 */
export async function updateWarehouse(id: string, warehouse: Partial<Warehouse>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/warehouses/${id}`, warehouse, {
    offlineQueue: true,
  });
}

/**
 * 删除仓库
 * 降级策略：API → 离线队列
 */
export async function deleteWarehouse(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/warehouses/${id}`, {
    offlineQueue: true,
  });
}

// ============================================
// 温室/基地 API
// ============================================

/**
 * 获取所有温室
 * 降级策略：API → IndexedDB 缓存
 */
export async function getGreenhouses(): Promise<Greenhouse[]> {
  const data = await enhancedApiClient.get<Greenhouse[]>('/basic-data/greenhouses', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  return data || [];
}

/**
 * 创建温室
 * 降级策略：API → 离线队列
 */
export async function createGreenhouse(greenhouse: Partial<Greenhouse>): Promise<Greenhouse> {
  const result = await enhancedApiClient.post<Greenhouse>('/basic-data/greenhouses', greenhouse, {
    offlineQueue: true,
  });
  return result;
}

/**
 * 更新温室
 * 降级策略：API → 离线队列
 */
export async function updateGreenhouse(id: string, greenhouse: Partial<Greenhouse>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/greenhouses/${id}`, greenhouse, {
    offlineQueue: true,
  });
}

/**
 * 删除温室
 * 降级策略：API → 离线队列
 */
export async function deleteGreenhouse(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/greenhouses/${id}`, {
    offlineQueue: true,
  });
}

// ============================================
// 区域 API
// ============================================

/**
 * 获取所有区域
 * 降级策略：API → IndexedDB 缓存
 */
export async function getZones(): Promise<Zone[]> {
  const data = await enhancedApiClient.get<Zone[]>('/basic-data/zones', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  return data || [];
}

/**
 * 创建区域
 * 降级策略：API → 离线队列
 */
export async function createZone(zone: Partial<Zone>): Promise<Zone> {
  const result = await enhancedApiClient.post<Zone>('/basic-data/zones', zone, {
    offlineQueue: true,
  });
  return result;
}

/**
 * 更新区域
 * 降级策略：API → 离线队列
 */
export async function updateZone(id: string, zone: Partial<Zone>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/zones/${id}`, zone, {
    offlineQueue: true,
  });
}

/**
 * 删除区域
 * 降级策略：API → 离线队列
 */
export async function deleteZone(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/zones/${id}`, {
    offlineQueue: true,
  });
}

// ============================================
// 地块 API
// ============================================

/**
 * 获取所有地块
 * 降级策略：API → IndexedDB 缓存
 */
export async function getBlocks(): Promise<Block[]> {
  const data = await enhancedApiClient.get<Block[]>('/basic-data/blocks', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  return data || [];
}

/**
 * 创建地块
 * 降级策略：API → 离线队列
 */
export async function createBlock(block: Partial<Block>): Promise<Block> {
  const result = await enhancedApiClient.post<Block>('/basic-data/blocks', block, {
    offlineQueue: true,
  });
  return result;
}

/**
 * 更新地块
 * 降级策略：API → 离线队列
 */
export async function updateBlock(id: string, block: Partial<Block>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/blocks/${id}`, block, {
    offlineQueue: true,
  });
}

/**
 * 删除地块
 * 降级策略：API → 离线队列
 */
export async function deleteBlock(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/blocks/${id}`, {
    offlineQueue: true,
  });
}

// ============================================
// 编码规则 API
// ============================================

/**
 * 获取所有编码规则
 * 降级策略：API → IndexedDB 缓存
 */
export async function getCodeRules(): Promise<CodeRule[]> {
  const data = await enhancedApiClient.get<CodeRule[]>('/basic-data/code-rules', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
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
  const data = await enhancedApiClient.get<SystemConfig[]>('/basic-data/system-configs', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  return data || [];
}

/**
 * 创建系统配置
 * 降级策略：API → 离线队列
 */
export async function createSystemConfig(config: Partial<SystemConfig>): Promise<SystemConfig> {
  const result = await enhancedApiClient.post<SystemConfig>('/basic-data/system-configs', config, {
    offlineQueue: true,
  });
  return result;
}

/**
 * 更新系统配置
 * 降级策略：API → 离线队列
 */
export async function updateSystemConfig(id: string, config: Partial<SystemConfig>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/system-configs/${id}`, config, {
    offlineQueue: true,
  });
}

/**
 * 删除系统配置
 * 降级策略：API → 离线队列
 */
export async function deleteSystemConfig(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/system-configs/${id}`, {
    offlineQueue: true,
  });
}

// ============================================
// 字典 API
// ============================================

/**
 * 获取所有字典项
 * 降级策略：API → IndexedDB 缓存
 */
export async function getDictionaries(category?: string): Promise<Dictionary[]> {
  const params: Record<string, string> = {};
  if (category) params.category = category;

  const data = await enhancedApiClient.get<Dictionary[]>('/dictionary/dictionaries', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  return data || [];
}

/**
 * 获取字典分类列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getDictionaryCategories(): Promise<string[]> {
  const data = await enhancedApiClient.get<string[]>('/dictionary/dictionaries/categories', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
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
  const data = await enhancedApiClient.get<Team[]>('/basic-data/teams', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  return data || [];
}

/**
 * 创建班组
 * 降级策略：API → 离线队列
 */
export async function createTeam(team: Partial<Team>): Promise<Team> {
  const result = await enhancedApiClient.post<Team>('/basic-data/teams', team, {
    offlineQueue: true,
  });
  return result;
}

/**
 * 更新班组
 * 降级策略：API → 离线队列
 */
export async function updateTeam(id: string, team: Partial<Team>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/teams/${id}`, team, {
    offlineQueue: true,
  });
}

/**
 * 删除班组
 * 降级策略：API → 离线队列
 */
export async function deleteTeam(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/teams/${id}`, {
    offlineQueue: true,
  });
}

// ============================================
// 职位 API
// ============================================

/**
 * 获取所有职位
 * 降级策略：API → IndexedDB 缓存
 */
export async function getPositions(): Promise<Position[]> {
  const data = await enhancedApiClient.get<Position[]>('/basic-data/positions', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  return data || [];
}

/**
 * 创建职位
 * 降级策略：API → 离线队列
 */
export async function createPosition(position: Partial<Position>): Promise<Position> {
  const result = await enhancedApiClient.post<Position>('/basic-data/positions', position, {
    offlineQueue: true,
  });
  return result;
}

/**
 * 更新职位
 * 降级策略：API → 离线队列
 */
export async function updatePosition(id: string, position: Partial<Position>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/positions/${id}`, position, {
    offlineQueue: true,
  });
}

/**
 * 删除职位
 * 降级策略：API → 离线队列
 */
export async function deletePosition(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/positions/${id}`, {
    offlineQueue: true,
  });
}

// ============================================
// 设备 API
// ============================================

/**
 * 获取所有设备
 * 降级策略：API → IndexedDB 缓存
 */
export async function getDevices(): Promise<Device[]> {
  const data = await enhancedApiClient.get<Device[]>('/basic-data/devices', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  return data || [];
}

/**
 * 创建设备
 * 降级策略：API → 离线队列
 */
export async function createDevice(device: Partial<Device>): Promise<Device> {
  const result = await enhancedApiClient.post<Device>('/basic-data/devices', device, {
    offlineQueue: true,
  });
  return result;
}

/**
 * 更新设备
 * 降级策略：API → 离线队列
 */
export async function updateDevice(id: string, device: Partial<Device>): Promise<void> {
  await enhancedApiClient.put(`/basic-data/devices/${id}`, device, {
    offlineQueue: true,
  });
}

/**
 * 删除设备
 * 降级策略：API → 离线队列
 */
export async function deleteDevice(id: string): Promise<void> {
  await enhancedApiClient.delete(`/basic-data/devices/${id}`, {
    offlineQueue: true,
  });
}
