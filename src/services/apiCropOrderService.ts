/**
 * 作物订单数据 API 服务
 * 对接后端 /api/crop-orders
 */

import { apiClient, USE_API } from './apiClient';
import { CropOrder, CropOrderStatus } from '../types/crop';

// 导入本地服务作为回退
import * as localService from './cropOrderService';

/**
 * 获取所有订单
 */
export async function getOrders(): Promise<CropOrder[]> {
  if (USE_API) {
    return apiClient.get<CropOrder[]>('/crop-orders');
  }
  return localService.getOrders();
}

/**
 * 根据ID获取单个订单
 */
export async function getOrderById(id: string): Promise<CropOrder | undefined> {
  if (USE_API) {
    return apiClient.get<CropOrder>(`/crop-orders/${id}`);
  }
  return localService.getOrderById(id);
}

/**
 * 根据ID数组获取多个订单
 */
export async function getOrdersByIds(ids: string[]): Promise<CropOrder[]> {
  if (USE_API) {
    return apiClient.get<CropOrder[]>(`/crop-orders/batch?ids=${ids.join(',')}`);
  }
  return localService.getOrdersByIds(ids);
}

/**
 * 创建订单
 */
export async function createOrder(
  orderData: Omit<CropOrder, 'id' | 'orderCode' | 'createTime' | 'updateTime'>
): Promise<CropOrder> {
  if (USE_API) {
    const result = await apiClient.post<{ id: string }>('/crop-orders', orderData);
    return { ...orderData, id: result.id } as CropOrder;
  }
  return localService.createOrder(orderData);
}

/**
 * 更新订单
 */
export async function updateOrder(id: string, updates: Partial<CropOrder>): Promise<CropOrder | null> {
  if (USE_API) {
    const result = await apiClient.put<{ id: string }>(`/crop-orders/${id}`, updates);
    return result ? { ...updates, id } as CropOrder : null;
  }
  return localService.updateOrder(id, updates);
}

/**
 * 删除订单
 */
export async function deleteOrder(id: string): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/crop-orders/${id}`);
    return true;
  }
  return localService.deleteOrder(id);
}

/**
 * 批量删除订单
 */
export async function deleteOrders(ids: string[]): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/crop-orders/batch?ids=${ids.join(',')}`);
    return true;
  }
  return localService.deleteOrders(ids);
}

/**
 * 关联实例到订单
 */
export async function linkInstances(orderId: string, instanceIds: string[]): Promise<boolean> {
  if (USE_API) {
    await apiClient.post(`/crop-orders/${orderId}/link-instances`, { instanceIds });
    return true;
  }
  return localService.linkInstances(orderId, instanceIds);
}

/**
 * 从订单取消关联实例
 */
export async function unlinkInstances(orderId: string, instanceIds: string[]): Promise<boolean> {
  if (USE_API) {
    await apiClient.post(`/crop-orders/${orderId}/unlink-instances`, { instanceIds });
    return true;
  }
  return localService.unlinkInstances(orderId, instanceIds);
}

/**
 * 更新订单状态
 */
export async function updateOrderStatus(id: string, status: CropOrderStatus): Promise<boolean> {
  if (USE_API) {
    await apiClient.put(`/crop-orders/${id}/status`, { status });
    return true;
  }
  return localService.updateOrderStatus(id, status);
}

/**
 * 重置数据到默认状态
 */
export async function resetOrders(): Promise<void> {
  if (USE_API) {
    await apiClient.post('/crop-orders/reset');
  }
  return localService.resetOrders();
}
