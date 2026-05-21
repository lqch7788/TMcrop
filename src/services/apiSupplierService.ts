/**
 * 供应商 API 服务
 * 对接后端 /api/suppliers
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { Supplier } from '../components/supplier/types';

/**
 * 初始化供应商数据
 */
export async function initSuppliers(): Promise<Supplier[]> {
  return await enhancedApiClient.get<Supplier[]>('/suppliers/init');
}

/**
 * 获取所有供应商
 * 降级策略：API → IndexedDB 缓存
 */
export async function getAllSuppliers(): Promise<Supplier[]> {
  return await enhancedApiClient.get<Supplier[]>('/suppliers');
}

/**
 * 搜索供应商（按名称、编码、联系人搜索）
 * 降级策略：API → IndexedDB 缓存
 */
export async function searchSuppliers(keyword: string): Promise<Supplier[]> {
  return await enhancedApiClient.get<Supplier[]>(`/suppliers/search?keyword=${encodeURIComponent(keyword)}`);
}

/**
 * 根据ID获取供应商
 * 降级策略：API → IndexedDB 缓存
 */
export async function getSupplierById(id: number): Promise<Supplier | undefined> {
  return await enhancedApiClient.get<Supplier>(`/suppliers/${id}`);
}

/**
 * 获取合作中的供应商（用于下拉选择）
 * 降级策略：API → IndexedDB 缓存
 */
export async function getActiveSuppliers(): Promise<Array<{ value: string; label: string; code: string }>> {
  return await enhancedApiClient.get<Array<{ value: string; label: string; code: string }>>('/suppliers/active');
}
