/**
 * 作物订单数据 API 服务
 * 对接后端 /api/crop-orders
 *
 * 核心原则：服务器数据是唯一真相来源
 *
 * 数据流：API → enhancedApiClient（无缓存，仅 3 次重试）→ 组件
 *
 * 缓存策略（已确认无三级缓存）：
 * - L1：Zustand Store 内存数组
 * - L2：（未使用）无 API
 * - L3：（未使用）订单管理页面不读取 localStorage
 *
 * 网络策略：失败时 3 次指数退避重试，无离线队列
 */

import { enhancedApiClient } from '../lib/apiClient';
import type { CropOrder, CropOrderStatus } from '../types/crop';

/**
 * 将前端驼峰命名字段转换为后端蛇形命名字段
 *
 * [M-1] 2026-06-06 补全字段映射：customerContact / expectedDeliveryDate / actualDeliveryDate /
 *     cropName / orderName 之前已在表中，现再补 quantity / deliveryPlan / totalDeliveredQuantity /
 *     expectedHarvestDate / createTime / id 等后端 schema 中存在的列，确保 PUT 全量字段不丢
 */
function toSnakeCase(data: Record<string, unknown>): Record<string, unknown> {
  const snakeMap: Record<string, string> = {
    orderCode: 'order_code',
    orderName: 'order_name',
    orderType: 'order_type',
    cropName: 'crop_name',
    cropVariety: 'crop_variety',
    cropCategory: 'crop_category',
    plannedQuantity: 'planned_quantity',
    actualQuantity: 'actual_quantity',
    quantity: 'quantity',
    unitPrice: 'unit_price',
    totalAmount: 'total_amount',
    customerId: 'customer_id',
    customerName: 'customer_name',
    customerContact: 'customer_contact',
    customerPhone: 'customer_phone',
    deliveryAddress: 'delivery_address',
    deliveryPlan: 'delivery_plan',
    totalDeliveredQuantity: 'total_delivered_quantity',
    orderDate: 'order_date',
    expectedDeliveryDate: 'expected_delivery_date',
    actualDeliveryDate: 'actual_delivery_date',
    expectedHarvestDate: 'expected_harvest_date',
    expectedCompletionDate: 'expected_completion_date',
    completedQuantity: 'completed_quantity',
    unit: 'unit',
    remarks: 'remarks',
    status: 'status',
    createBy: 'create_by',
    createTime: 'create_time',
    updateTime: 'update_time',
    id: 'id',
  };

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'instanceIds') continue;
    const snakeKey = snakeMap[key] || key;
    result[snakeKey] = value;
  }
  return result;
}

/**
 * 获取所有订单
 */
export async function getOrders(): Promise<CropOrder[]> {
  const data = await enhancedApiClient.get<CropOrder[]>('/crop-orders');
  return Array.isArray(data) ? data : [];
}

/**
 * 根据ID获取单个订单
 */
export async function getOrderById(id: string): Promise<CropOrder | undefined> {
  return await enhancedApiClient.get<CropOrder>(`/crop-orders/${id}`);
}

/**
 * 创建订单
 */
export async function createOrder(
  orderData: Omit<CropOrder, 'id' | 'orderCode' | 'createTime' | 'updateTime'>
): Promise<CropOrder> {
  const snakeData = toSnakeCase(orderData as Record<string, unknown>);
  return await enhancedApiClient.post<CropOrder>('/crop-orders', snakeData);
}

/**
 * 更新订单
 */
export async function updateOrder(
  id: string,
  updates: Partial<CropOrder>
): Promise<CropOrder | null> {
  const snakeData = toSnakeCase(updates as Record<string, unknown>);
  return await enhancedApiClient.put<CropOrder>(`/crop-orders/${id}`, snakeData);
}

/**
 * 删除订单
 */
export async function deleteOrder(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/crop-orders/${id}`);
  return true;
}

/**
 * 批量删除订单（P0-2：改为一次批量接口，避免串行 N 次网络往返）
 * 后端已提供 POST /api/crop-orders/batch/delete
 */
export async function deleteOrders(ids: string[]): Promise<boolean> {
  if (!Array.isArray(ids) || ids.length === 0) return true;
  await enhancedApiClient.post('/crop-orders/batch/delete', { ids });
  return true;
}

/**
 * 同步待处理订单（C 阶段 DD-1 修复）
 * 修复 useOrderDataStore.ts:100 + OrderPage.tsx:74 启动时静默抛错
 * （原函数未定义 → uncaught promise rejection → console error）
 *
 * 当前实现：stub 返回 { success: 0, failed: 0 }，消除启动报错。
 * 真实同步逻辑（按 status=pending 拉取 → 业务处理）待后续单独 PR 接入。
 */
export async function syncPendingOrders(): Promise<{ success: number; failed: number }> {
  return { success: 0, failed: 0 };
}

/**
 * 关联实例到订单
 */
export async function linkInstances(orderId: string, instanceIds: string[]): Promise<boolean> {
  await enhancedApiClient.post(`/crop-orders/${orderId}/link-instances`, { instanceIds });
  return true;
}

/**
 * 从订单取消关联实例
 */
export async function unlinkInstances(orderId: string, instanceIds: string[]): Promise<boolean> {
  await enhancedApiClient.post(`/crop-orders/${orderId}/unlink-instances`, { instanceIds });
  return true;
}

/**
 * 更新订单状态
 */
export async function updateOrderStatus(id: string, status: CropOrderStatus): Promise<boolean> {
  await enhancedApiClient.put(`/crop-orders/${id}/status`, { status });
  return true;
}

/**
 * 重置数据到默认状态（仅调用后端）
 */
export async function resetOrders(): Promise<void> {
  await enhancedApiClient.post('/crop-orders/reset');
}

/**
 * 订单统计数据（P0-3：改为真实调后端 API）
 * 后端 stats 路由已按前端 CropOrderStatus 枚举（planned/in_progress/completed/cancelled）统计，
 * 同时计算本月新增（thisMonth）以兼容 OrderStats.tsx 的 prop 形状
 */
export interface OrderStats {
  total: number;
  inProgress: number;
  completed: number;
  thisMonth: number;
  /** 扩展字段：后端多返回的，方便后续业务使用 */
  planned?: number;
  cancelled?: number;
  totalAmount?: number;
}

/**
 * 从后端获取订单统计数据
 * 解析响应 data 字段直接返回；Store 端可按需 setState
 */
export async function getOrderStats(): Promise<OrderStats | null> {
  // 网络失败由 enhancedApiClient 3 次重试后自动抛出；Store 端 catch 弹 toast
  const data = await enhancedApiClient.get<OrderStats>('/crop-orders/stats/summary');
  if (!data || typeof data !== 'object') return null;
  return data;
}
