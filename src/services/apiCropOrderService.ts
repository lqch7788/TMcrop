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
 * - L2：（未使用）无 IndexedDB 缓存
 * - L3：（未使用）订单管理页面不读取 localStorage
 *
 * 网络策略：失败时 3 次指数退避重试，无离线队列
 */

import { enhancedApiClient } from '../lib/apiClient';
import type { CropOrder, CropOrderStatus } from '../types/crop';

/**
 * 将前端驼峰命名字段转换为后端蛇形命名字段
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
    unitPrice: 'unit_price',
    totalAmount: 'total_amount',
    customerId: 'customer_id',
    customerName: 'customer_name',
    customerContact: 'customer_contact',
    customerPhone: 'customer_phone',
    deliveryAddress: 'delivery_address',
    orderDate: 'order_date',
    expectedDeliveryDate: 'expected_delivery_date',
    actualDeliveryDate: 'actual_delivery_date',
    expectedCompletionDate: 'expected_completion_date',
    completedQuantity: 'completed_quantity',
    unit: 'unit',
    remarks: 'remarks',
    status: 'status',
    createBy: 'create_by',
    updateTime: 'update_time',
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
 * 批量删除订单
 */
export async function deleteOrders(ids: string[]): Promise<boolean> {
  for (const id of ids) {
    await enhancedApiClient.delete(`/crop-orders/${id}`);
  }
  return true;
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
 * 订单统计数据
 */
export interface OrderStats {
  total: number;
  inProgress: number;
  completed: number;
  thisMonth: number;
}

/**
 * 从后端获取订单统计数据
 * 注意：后端API使用pending/confirmed/processing/shipped/delivered状态，
 * 与前端CropOrderStatus的planned/in_progress/completed/cancelled不匹配，
 * 因此直接返回null，使用前端本地数据计算
 */
export async function getOrderStats(): Promise<null> {
  // 后端状态与前端 CropOrderStatus 枚举不匹配，无法正确映射
  // 前端已有 fallback 逻辑基于 orders 本地计算统计
  return null;
}
