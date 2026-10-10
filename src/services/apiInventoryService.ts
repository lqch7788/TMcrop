/**
 * 库存 API 服务 (V2.1 架构 - 已简化)
 * 对接后端 /api/inventory
 * 数据流：API → 组件 (无缓存层)
 */

import { enhancedApiClient } from '../lib/apiClient';
import type { InventoryStatus } from '../types/inventory';

// 库存记录类型
export interface InventoryRecord {
  id: string;
  product_code: string;
  crop_name: string;
  variety: string;
  quantity: number;
  unit: string;
  grade: string;
  warehouse_name: string;
  storage_location: string;
  harvest_date: string;
  storage_date: string;
  batch_code: string;
  greenhouse_name: string;
  planting_mode: string;
  stock_type: string;
  status: string;
  create_time: string;
  update_time: string;
}

// 库存查询参数
export interface InventoryFilters {
  crop_name?: string;
  stock_type?: 'seed' | 'seedling' | 'product';
  status?: InventoryStatus;
  page?: number;
  limit?: number;
  // 生产计划联动过滤（用于 getRelated* 服务）
  productionPlanId?: string;
}

/**
 * 获取库存列表
 * 2026-08-14：默认 limit=500 — 后端默认 50 会静默截断列表（与育苗/种植同款 bug）
 * 注：作物库存页（store.loadAll）走 inventoryService.getInventoryList（limit=0 全量）；
 *     本函数供 生产计划/生产链路统计 等旧消费方使用
 */
export async function getInventoryList(filters?: InventoryFilters): Promise<InventoryRecord[]> {
  const params: Record<string, string> = {};
  if (filters?.crop_name) params.crop_name = filters.crop_name;
  if (filters?.stock_type) params.stock_type = filters.stock_type;
  if (filters?.status) params.status = filters.status;
  if (filters?.page) params.page = String(filters.page);
  if (filters?.limit) params.limit = String(filters.limit);
  // 未显式传 limit 时兜底 500（避免后端默认 50 截断）
  if (!params.limit) params.limit = '500';

  const query = new URLSearchParams(params).toString();
  return await enhancedApiClient.get<InventoryRecord[]>(`/inventory${query ? `?${query}` : ''}`);
}

// 2026-10-10 死代码清理（0 引用，用户授权）：
// - getInventoryByCropName + InventoryAggregation 类型（唯一使用方）
// - getInventoryById（详情读取统一走 inventoryService.getInventoryByInstanceId）
// - createInventory / deleteInventory（创建走 /inbound-record 与调拨/补录申请；删除走批量删除）

/**
 * 更新库存记录
 * 2026-10-10 修复：原来 catch 后 return false 把真实错误（400 校验/乐观锁/权限）吞掉，
 * 编辑弹窗只能显示无信息量的"编辑失败"；改为向上抛，由 store/组件展示后端消息
 */
export async function updateInventory(id: string, updates: Partial<InventoryRecord>): Promise<boolean> {
  await enhancedApiClient.put(`/inventory/${id}`, updates);
  return true;
}
