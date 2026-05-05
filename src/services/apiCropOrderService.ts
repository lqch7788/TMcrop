/**
 * 作物订单数据 API 服务
 * 对接后端 /api/crop-orders
 */

import { apiClient } from './apiClient';
import { CropOrder, CropOrderStatus } from '../types/crop';

// 导入本地服务作为回退
import * as localService from './cropOrderService';

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
    // 充分利用API返回的完整订单数据
    const result = await apiClient.post<CropOrder>('/crop-orders', orderData);
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
    const result = await apiClient.put<{ id: string }>(`/crop-orders/${id}`, updates);
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
    await apiClient.delete(`/crop-orders/batch?ids=${ids.join(',')}`);
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
    const stats = await apiClient.get<OrderStats>('/crop-orders/stats');
    return stats;
  } catch (error) {
    console.warn('获取订单统计失败:', error);
    return null;
  }
}
