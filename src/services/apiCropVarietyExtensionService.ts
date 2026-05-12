/**
 * 作物品种库扩展 API 服务
 * 对接后端 API 存储用户新增的类型、品种，子品种
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';

const API_BASE = '/api/crop-varieties/extensions';

// 类型扩展
export interface TypeExtension {
  id: string;
  category_code: string;
  category_name?: string;
  type_code: string;
  type_name: string;
  sort_order?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// 品种扩展
export interface VarietyExtension {
  id: string;
  category_code: string;
  type_code: string;
  variety_code: string;
  variety_name: string;
  sort_order?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// 子品种1扩展
export interface SubVariety1Extension {
  id: string;
  category_code: string;
  type_code: string;
  variety_code: string;
  sub_variety1_code: string;
  sub_variety1_name: string;
  sort_order?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// ==================== 类型扩展 ====================

/**
 * 获取所有类型扩展
 * 降级策略：API → IndexedDB 缓存
 */
export async function getAllTypeExtensions(): Promise<TypeExtension[]> {
  return await enhancedApiClient.get<TypeExtension[]>(`${API_BASE}/types`, {
    useCache: true,
    cacheStrategy: 'network-first',
  });
}

/**
 * 获取指定类别的类型扩展
 * 降级策略：API → IndexedDB 缓存
 */
export async function getTypeExtensionsByCategory(categoryCode: string): Promise<TypeExtension[]> {
  return await enhancedApiClient.get<TypeExtension[]>(`${API_BASE}/types/${categoryCode}`, {
    useCache: true,
    cacheStrategy: 'network-first',
  });
}

/**
 * 创建类型扩展
 * 降级策略：API → 离线队列
 */
export async function addTypeExtension(
  categoryCode: string,
  categoryName: string,
  typeCode: string,
  typeName: string
): Promise<TypeExtension> {
  return await enhancedApiClient.post<TypeExtension>(`${API_BASE}/types`, {
    category_code: categoryCode,
    category_name: categoryName,
    type_code: typeCode,
    type_name: typeName
  }, {
    offlineQueue: true,
    useCache: true,
  });
}

/**
 * 删除类型扩展
 * 降级策略：API → 离线队列
 */
export async function deleteTypeExtension(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`${API_BASE}/types/${id}`, {
    offlineQueue: true,
  });
  return true;
}

/**
 * 更新类型扩展
 * 降级策略：API → 离线队列
 */
export async function updateTypeExtension(
  id: string,
  typeName: string,
  sortOrder?: number,
  status?: string
): Promise<boolean> {
  await enhancedApiClient.put(`${API_BASE}/types/${id}`, {
    type_name: typeName,
    sort_order: sortOrder,
    status
  }, {
    offlineQueue: true,
  });
  return true;
}

// ==================== 品种扩展 ====================

/**
 * 获取所有品种扩展
 * 降级策略：API → IndexedDB 缓存
 */
export async function getAllVarietyExtensions(): Promise<VarietyExtension[]> {
  return await enhancedApiClient.get<VarietyExtension[]>(`${API_BASE}/varieties`, {
    useCache: true,
    cacheStrategy: 'network-first',
  });
}

/**
 * 获取指定类型的品种扩展
 * 降级策略：API → IndexedDB 缓存
 */
export async function getVarietyExtensionsByType(categoryCode: string, typeCode: string): Promise<VarietyExtension[]> {
  return await enhancedApiClient.get<VarietyExtension[]>(`${API_BASE}/varieties/${categoryCode}/${typeCode}`, {
    useCache: true,
    cacheStrategy: 'network-first',
  });
}

/**
 * 创建品种扩展
 * 降级策略：API → 离线队列
 */
export async function addVarietyExtension(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  varietyName: string
): Promise<VarietyExtension> {
  return await enhancedApiClient.post<VarietyExtension>(`${API_BASE}/varieties`, {
    category_code: categoryCode,
    type_code: typeCode,
    variety_code: varietyCode,
    variety_name: varietyName
  }, {
    offlineQueue: true,
    useCache: true,
  });
}

/**
 * 删除品种扩展
 * 降级策略：API → 离线队列
 */
export async function deleteVarietyExtension(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`${API_BASE}/varieties/${id}`, {
    offlineQueue: true,
  });
  return true;
}

/**
 * 更新品种扩展
 * 降级策略：API → 离线队列
 */
export async function updateVarietyExtension(
  id: string,
  varietyName: string,
  sortOrder?: number,
  status?: string
): Promise<boolean> {
  await enhancedApiClient.put(`${API_BASE}/varieties/${id}`, {
    variety_name: varietyName,
    sort_order: sortOrder,
    status
  }, {
    offlineQueue: true,
  });
  return true;
}

// ==================== 子品种1扩展 ====================

/**
 * 获取所有子品种1扩展
 * 降级策略：API → IndexedDB 缓存
 */
export async function getAllSubVariety1Extensions(): Promise<SubVariety1Extension[]> {
  return await enhancedApiClient.get<SubVariety1Extension[]>(`${API_BASE}/subvariety1`, {
    useCache: true,
    cacheStrategy: 'network-first',
  });
}

/**
 * 获取指定品种的子品种1扩展
 * 降级策略：API → IndexedDB 缓存
 */
export async function getSubVariety1ExtensionsByVariety(
  categoryCode: string,
  typeCode: string,
  varietyCode: string
): Promise<SubVariety1Extension[]> {
  return await enhancedApiClient.get<SubVariety1Extension[]>(`${API_BASE}/subvariety1/${categoryCode}/${typeCode}/${varietyCode}`, {
    useCache: true,
    cacheStrategy: 'network-first',
  });
}

/**
 * 创建子品种1扩展
 * 降级策略：API → 离线队列
 */
export async function addSubVariety1Extension(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code: string,
  subVariety1Name: string
): Promise<SubVariety1Extension> {
  return await enhancedApiClient.post<SubVariety1Extension>(`${API_BASE}/subvariety1`, {
    category_code: categoryCode,
    type_code: typeCode,
    variety_code: varietyCode,
    sub_variety1_code: subVariety1Code,
    sub_variety1_name: subVariety1Name
  }, {
    offlineQueue: true,
    useCache: true,
  });
}

/**
 * 删除子品种1扩展
 * 降级策略：API → 离线队列
 */
export async function deleteSubVariety1Extension(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`${API_BASE}/subvariety1/${id}`, {
    offlineQueue: true,
  });
  return true;
}

/**
 * 更新子品种1扩展
 * 降级策略：API → 离线队列
 */
export async function updateSubVariety1Extension(
  id: string,
  subVariety1Name: string,
  sortOrder?: number,
  status?: string
): Promise<boolean> {
  await enhancedApiClient.put(`${API_BASE}/subvariety1/${id}`, {
    sub_variety1_name: subVariety1Name,
    sort_order: sortOrder,
    status
  }, {
    offlineQueue: true,
  });
  return true;
}
