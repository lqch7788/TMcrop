/**
 * 作物订单数据 API 服务
 * 对接后端 /api/crop-orders
 */

import { apiClient } from './apiClient';
import { CropOrder, CropOrderStatus } from '../types/crop';

// 导入本地服务作为回退
import * as localService from './cropOrderService';

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
 */
export async function getOrders(): Promise<CropOrder[]> {
  try {
    return await apiClient.get<CropOrder[]>('/crop-orders');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getOrders();
  }
}

/**
 * 根据ID获取单个订单
 */
export async function getOrderById(id: string): Promise<CropOrder | undefined> {
  try {
    return await apiClient.get<CropOrder>(`/crop-orders/${id}`);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getOrderById(id);
  }
}

/**
 * 根据ID数组获取多个订单
 */
export async function getOrdersByIds(ids: string[]): Promise<CropOrder[]> {
  try {
    return await apiClient.get<CropOrder[]>(`/crop-orders/batch?ids=${ids.join(',')}`);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getOrdersByIds(ids);
  }
}

/**
 * 创建订单
 */
export async function createOrder(
  orderData: Omit<CropOrder, 'id' | 'orderCode' | 'createTime' | 'updateTime'>
): Promise<CropOrder> {
  try {
    // 转换字段名为蛇形格式以匹配后端期望
    const snakeData = toSnakeCase(orderData as Record<string, unknown>);
    console.log('[createOrder] 发送的数据:', JSON.stringify(snakeData, null, 2));
    const result = await apiClient.post<CropOrder>('/crop-orders', snakeData);
    console.log('[createOrder] 返回的数据:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.createOrder(orderData);
  }
}

/**
 * 更新订单
 */
export async function updateOrder(id: string, updates: Partial<CropOrder>): Promise<CropOrder | null> {
  try {
    // 转换字段名为蛇形格式以匹配后端期望
    const snakeData = toSnakeCase(updates as Record<string, unknown>);
    const result = await apiClient.put<{ id: string }>(`/crop-orders/${id}`, snakeData);
    return result ? { ...updates, id } as CropOrder : null;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.updateOrder(id, updates);
  }
}

/**
 * 删除订单
 */
export async function deleteOrder(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/crop-orders/${id}`);
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.deleteOrder(id);
  }
}

/**
 * 批量删除订单
 */
export async function deleteOrders(ids: string[]): Promise<boolean> {
  try {
    await apiClient.post('/crop-orders/batch/delete', { ids });
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.deleteOrders(ids);
  }
}

/**
 * 关联实例到订单
 */
export async function linkInstances(orderId: string, instanceIds: string[]): Promise<boolean> {
  try {
    await apiClient.post(`/crop-orders/${orderId}/link-instances`, { instanceIds });
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.linkInstances(orderId, instanceIds);
  }
}

/**
 * 从订单取消关联实例
 */
export async function unlinkInstances(orderId: string, instanceIds: string[]): Promise<boolean> {
  try {
    await apiClient.post(`/crop-orders/${orderId}/unlink-instances`, { instanceIds });
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.unlinkInstances(orderId, instanceIds);
  }
}

/**
 * 更新订单状态
 */
export async function updateOrderStatus(id: string, status: CropOrderStatus): Promise<boolean> {
  try {
    await apiClient.put(`/crop-orders/${id}/status`, { status });
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.updateOrderStatus(id, status);
  }
}

/**
 * 重置数据到默认状态
 */
export async function resetOrders(): Promise<void> {
  try {
    await apiClient.post('/crop-orders/reset');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
  }
  return localService.resetOrders();
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
 * 如果API调用失败，则返回null，前端需要自行计算
 */
export async function getOrderStats(): Promise<OrderStats | null> {
  try {
    // 后端返回: { total, pending, confirmed, processing, shipped, delivered, cancelled, total_amount }
    // 前端期望: { total, inProgress, completed, thisMonth }
    const backendStats = await apiClient.get<{
      total: number;
      pending: number;
      confirmed: number;
      processing: number;
      shipped: number;
      delivered: number;
      cancelled: number;
      total_amount: number;
    }>('/crop-orders/stats/summary');

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
