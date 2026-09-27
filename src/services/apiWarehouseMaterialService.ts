/**
 * 仓库物料 API 服务
 * 对接后端 /api/materials
 *
 * 数据流：API → enhancedApiClient → 组件（无缓存层，V2.1 铁律）
 *
 * 降级策略：
 * - GET 请求：API 直连（V2.1 铁律：无缓存降级）
 * - POST/PUT/DELETE：API 直连（无离线队列）
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
  /** 备注（2026-09-27 新增列） */
  remarks?: string;
  /** 有效批次数（batch_inventory 聚合） */
  batchCount?: number;
  /** 最早有效批次效期（FEFO 临期预警） */
  earliestExpiry?: string;
}

// 入库物料明细 / 入库记录类型
// 2026-09-27：统一引用 types/warehouseInbound.types，消除双重定义
// （此前两份字段不一致：service 版含 bigCategory/midCategory/subCategory 死字段、
//  缺 supplier/minStock/maxStock，导致 store 与页面类型互不兼容）
import type { InboundMaterial, InboundRecord } from '../types/warehouseInbound.types';
export type { InboundMaterial, InboundRecord };

/**
 * 获取物料列表
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getMaterials(): Promise<Material[]> {
  return await enhancedApiClient.get<Material[]>('/materials');
}

/**
 * 获取入库记录列表
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getInboundRecords(): Promise<InboundRecord[]> {
  return await enhancedApiClient.get<InboundRecord[]>('/materials/inbound');
}

/**
 * 创建入库记录
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function createInboundRecord(record: Omit<InboundRecord, 'id'>): Promise<InboundRecord> {
  return await enhancedApiClient.post<InboundRecord>('/materials/inbound', record);
}

/**
 * 更新入库记录
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function updateInboundRecord(id: number, updates: Partial<InboundRecord>): Promise<InboundRecord | null> {
  return await enhancedApiClient.put<InboundRecord>(`/materials/inbound/${id}`, updates);
}

/**
 * 创建物料
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 * 修复：返回完整物料记录（后端 POST 已改为 SELECT * 后返回），符合"POST 必须返回完整记录"铁律
 */
export async function createMaterial(material: Omit<Material, 'id'>): Promise<Material> {
  const result = await enhancedApiClient.post<Material | { id: number }>('/materials', material);
  // 防御兜底：万一后端又退回只返回 id，至少用入参 + id 拼出完整对象
  if (result && 'code' in result) {
    return result as Material;
  }
  return { ...material, id: (result as { id: number })?.id ?? 0 } as Material;
}

/**
 * 更新物料
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function updateMaterial(id: number, updates: Partial<Material>): Promise<Material | null> {
  const result = await enhancedApiClient.put<Material>(`/materials/${id}`, updates);
  return result;
}

/**
 * 删除物料
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function deleteMaterial(id: number): Promise<boolean> {
  await enhancedApiClient.delete(`/materials/${id}`);
  return true;
}

/**
 * 删除入库记录
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function deleteInboundRecord(id: number): Promise<boolean> {
  await enhancedApiClient.delete(`/materials/inbound/${id}`);
  return true;
}

// ========== 入库冲销（红字单，2026-09-27）==========

/** 冲销预览：原单每条明细的原入库量 / 批次剩余 / 实际可冲回量 */
export interface ReversalPreviewItem {
  code: string;
  name: string;
  unit: string;
  batchNo: string;
  quantity: number;
  batchRemain: number;
  reversible: number;
}

export interface ReversalPreview {
  recordId: number;
  recordCode: string;
  supplier: string;
  items: ReversalPreviewItem[];
  totalReversible: number;
  /** 2026-09-27：该单是否已被冲销（已冲销不可重复操作） */
  alreadyReversed?: boolean;
  /** 已存在的冲销单号 */
  existingReversalCode?: string;
}

/** 查询冲销预览（已完成单可冲回的实际数量） */
export async function getReversalPreview(inboundId: number): Promise<ReversalPreview> {
  const res = await enhancedApiClient.get<{ success: boolean; data: ReversalPreview }>(
    `/materials/inbound/${inboundId}/reversal-preview`
  );
  return ((res as any)?.data ?? res) as ReversalPreview;
}

/** 创建冲销单（直接生效；原单保留，冲销量=实际可冲回量） */
export async function createInboundReversal(inboundId: number, reason: string): Promise<{ message: string }> {
  const res = await enhancedApiClient.post<{ success: boolean; message: string }>(
    `/materials/inbound/${inboundId}/reversal`,
    { reason }
  );
  return res as unknown as { message: string };
}

// ========== V14.0: FEFO 批次库存 ==========

export interface BatchAllocation {
  batchNo: string;
  expiryDate: string;
  quantity: number;
  unit: string;
}

export interface FefoAllocationResult {
  allocations: BatchAllocation[];
  fulfilled: number;
}

/** FEFO 自动分配 */
export async function fefoAllocate(materialCode: string, quantity: number): Promise<FefoAllocationResult> {
  const res = await enhancedApiClient.post<any>('/materials/batch-allocate', { materialCode, quantity });
  return (res.data ?? res) as FefoAllocationResult;
}

/** 扣减批次库存 */
export async function batchDeduct(allocations: Array<{ materialCode: string; batchNo: string; quantity: number }>): Promise<void> {
  await enhancedApiClient.post('/materials/batch-deduct', { allocations });
}

/** 恢复批次库存（退料） */
export async function batchRestore(returns: Array<{ materialCode: string; batchNo: string; quantity: number }>): Promise<void> {
  await enhancedApiClient.post('/materials/batch-restore', { returns });
}

/** 查询批次库存 */
export async function getBatchStock(materialCode: string): Promise<any[]> {
  const res = await enhancedApiClient.get<any>(`/materials/batches/${materialCode}`);
  return Array.isArray(res) ? res : (res.data ?? []);
}
