/**
 * 仓库物料 API 服务
 * 对接后端 /api/materials
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';

// 物料类型
export interface Material {
  id: number;
  code: string;
  name: string;
  category: string;
  specification: string;
  unit: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  price: string;
  supplier: string;
  location: string;
  barcode: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  lastUpdateTime: string;
  dataStatus: string;
}

// 入库物料明细类型
export interface InboundMaterial {
  id: number;
  code: string;
  name: string;
  category: string;
  bigCategory: string;
  midCategory: string;
  subCategory: string;
  specification: string;
  barcode: string;
  unit: string;
  quantity: number;
  price: string;
  location: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  remarks: string;
}

// 入库记录类型
export interface InboundRecord {
  id: number;
  code: string;
  inboundDate: string;
  supplier: string;
  operator: string;
  status: 'completed' | 'pending' | 'voided';
  materials: InboundMaterial[];
  voidedDate?: string;
}

/**
 * 获取物料列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getMaterials(): Promise<Material[]> {
  return await enhancedApiClient.get<Material[]>('/materials');
}

/**
 * 获取入库记录列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getInboundRecords(): Promise<InboundRecord[]> {
  return await enhancedApiClient.get<InboundRecord[]>('/materials/inbound');
}

/**
 * 创建入库记录
 * 降级策略：API → 离线队列
 */
export async function createInboundRecord(record: Omit<InboundRecord, 'id'>): Promise<InboundRecord> {
  return await enhancedApiClient.post<InboundRecord>('/materials/inbound', record);
}

/**
 * 更新入库记录
 * 降级策略：API → 离线队列
 */
export async function updateInboundRecord(id: number, updates: Partial<InboundRecord>): Promise<InboundRecord | null> {
  return await enhancedApiClient.put<InboundRecord>(`/materials/inbound/${id}`, updates);
}

/**
 * 创建物料
 * 降级策略：API → 离线队列
 */
export async function createMaterial(material: Omit<Material, 'id'>): Promise<{ id: number }> {
  return await enhancedApiClient.post<{ id: number }>('/materials', material);
}

/**
 * 更新物料
 * 降级策略：API → 离线队列
 */
export async function updateMaterial(id: number, updates: Partial<Material>): Promise<Material | null> {
  const result = await enhancedApiClient.put<Material>(`/materials/${id}`, updates);
  return result;
}

/**
 * 删除物料
 * 降级策略：API → 离线队列
 */
export async function deleteMaterial(id: number): Promise<boolean> {
  await enhancedApiClient.delete(`/materials/${id}`);
  return true;
}

/**
 * 删除入库记录
 * 降级策略：API → 离线队列
 */
export async function deleteInboundRecord(id: number): Promise<boolean> {
  await enhancedApiClient.delete(`/materials/inbound/${id}`);
  return true;
}
