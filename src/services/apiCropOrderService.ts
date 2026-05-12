/**
 * 作物订单数据 API 服务
 * 对接后端 /api/crop-orders
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { CropOrder, CropOrderStatus } from '../types/crop';

/**
 * 将前端驼峰命名字段转换为后端蛇形命名字段（用于创建/更新订单）
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
    customerName: 'customer_name',
    customerContact: 'customer_contact',
    deliveryAddress: 'delivery_address',
    orderDate: 'order_date',
    expectedDeliveryDate: 'expected_delivery_date',
    actualDeliveryDate: 'actual_delivery_date',
    expectedHarvestDate: 'expected_harvest_date',
    createBy: 'create_by',
    updateTime: 'update_time',
    supplierName: 'customer_name',  // 前端供应商名称对应后端客户名称
  };

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    // 跳过 instanceIds，前端用于关联实例，后端不需要
    if (key === 'instanceIds') continue;
    const snakeKey = snakeMap[key] || key;
    result[snakeKey] = value;
  }
  return result;
}

/**
 * 获取所有订单
 * 降级策略：API → IndexedDB 缓存
 */
export async function getOrders(): Promise<CropOrder[]> {
  // 使用 network-first 策略：优先从 API 获取，失败时从缓存读取
  return await enhancedApiClient.get<CropOrder[]>('/crop-orders', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
}

/**
 * 根据ID获取单个订单
 * 降级策略：API → IndexedDB 缓存
 */
export async function getOrderById(id: string): Promise<CropOrder | undefined> {
  return await enhancedApiClient.get<CropOrder>(`/crop-orders/${id}`, {
    useCache: true,
    cacheStrategy: 'network-first',
  });
}

/**
 * 根据ID数组获取多个订单
 * 降级策略：API → IndexedDB 缓存
 */
export async function getOrdersByIds(ids: string[]): Promise<CropOrder[]> {
  return await enhancedApiClient.get<CropOrder[]>(`/crop-orders/batch?ids=${ids.join(',')}`, {
    useCache: true,
    cacheStrategy: 'network-first',
  });
}

/**
 * 创建订单
 * 降级策略：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */
export async function createOrder(
  orderData: Omit<CropOrder, 'id' | 'orderCode' | 'createTime' | 'updateTime'>
): Promise<CropOrder> {
  // 转换字段名为蛇形格式以匹配后端期望
  const snakeData = toSnakeCase(orderData as Record<string, unknown>);
  console.log('[createOrder] 发送的数据:', JSON.stringify(snakeData, null, 2));

  const result = await enhancedApiClient.post<CropOrder>('/crop-orders', snakeData, {
    offlineQueue: true,
    useCache: true,
  });

  console.log('[createOrder] 返回的数据:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * 更新订单
 * 降级策略：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */
export async function updateOrder(id: string, updates: Partial<CropOrder>): Promise<CropOrder | null> {
  // 转换字段名为蛇形格式以匹配后端期望
  const snakeData = toSnakeCase(updates as Record<string, unknown>);
  const result = await enhancedApiClient.put<{ id: string }>(`/crop-orders/${id}`, snakeData, {
    offlineQueue: true,
  });
  return result ? { ...updates, id } as CropOrder : null;
}

/**
 * 删除订单
 * 降级策略：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */
export async function deleteOrder(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/crop-orders/${id}`, {
    offlineQueue: true,
  });
  return true;
}

/**
 * 批量删除订单
 * 降级策略：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */
export async function deleteOrders(ids: string[]): Promise<boolean> {
  await enhancedApiClient.post('/crop-orders/batch/delete', { ids }, {
    offlineQueue: true,
  });
  return true;
}

/**
 * 关联实例到订单
 * 降级策略：API → 离线队列
 */
export async function linkInstances(orderId: string, instanceIds: string[]): Promise<boolean> {
  await enhancedApiClient.post(`/crop-orders/${orderId}/link-instances`, { instanceIds }, {
    offlineQueue: true,
  });
  return true;
}

/**
 * 从订单取消关联实例
 * 降级策略：API → 离线队列
 */
export async function unlinkInstances(orderId: string, instanceIds: string[]): Promise<boolean> {
  await enhancedApiClient.post(`/crop-orders/${orderId}/unlink-instances`, { instanceIds }, {
    offlineQueue: true,
  });
  return true;
}

/**
 * 更新订单状态
 * 降级策略：API → 离线队列
 */
export async function updateOrderStatus(id: string, status: CropOrderStatus): Promise<boolean> {
  await enhancedApiClient.put(`/crop-orders/${id}/status`, { status }, {
    offlineQueue: true,
  });
  return true;
}

/**
 * 重置数据到默认状态
 * 仅调用后端，不做降级处理
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
 * 从后端获取订单统计数据（感知后端stats路由）
 * 降级策略：API 失败时返回 null，让前端自行计算
 */
export async function getOrderStats(): Promise<OrderStats | null> {
  try {
    // 后端返回: { total, pending, confirmed, processing, shipped, delivered, cancelled, total_amount }
    // 前端期望: { total, inProgress, completed, thisMonth }
    const backendStats = await enhancedApiClient.get<{
      total: number;
      pending: number;
      confirmed: number;
      processing: number;
      shipped: number;
      delivered: number;
      cancelled: number;
      total_amount: number;
    }>('/crop-orders/stats/summary', {
      useCache: true,
      cacheStrategy: 'stale-while-revalidate',
    });

    return {
      total: backendStats.total,
      inProgress: backendStats.confirmed + backendStats.processing,
      completed: backendStats.delivered + backendStats.shipped,
      thisMonth: 0 // 后端没有提供月度统计，返回0让前端自行计算
    };
  } catch (error) {
    console.warn('获取订单统计失败:', error);
    return null;
  }
}
