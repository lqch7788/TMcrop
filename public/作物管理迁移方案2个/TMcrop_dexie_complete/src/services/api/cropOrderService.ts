/**
 * 作物订单 Service - API 实现
 */

import { CropOrder, CropOrderStatus } from '@/types/crop';
import { ICropOrderService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixOrder(item: any): CropOrder {
  return {
    ...item,
    instanceIds: typeof item.instance_ids === 'string' ? JSON.parse(item.instance_ids || '[]') : (item.instanceIds || []),
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
    orderCode: item.order_code || item.orderCode,
    customerName: item.customer_name || item.customerName,
    customerContact: item.customer_contact || item.customerContact,
    orderDate: item.order_date || item.orderDate,
    deliveryDate: item.delivery_date || item.deliveryDate,
    totalAmount: item.total_amount || item.totalAmount,
  };
}

export const cropOrderService: ICropOrderService = {
  async initOrders() {
    return this.getOrders();
  },
  async getOrders() {
    const res = await apiClient.get<PaginatedResponse<CropOrder>>('/crop-orders');
    return res.data.map(fixOrder);
  },
  async getOrderById(id) {
    const res = await apiClient.get<any>('/crop-orders/' + id);
    return fixOrder(res);
  },
  async getOrdersByIds(ids) {
    const all = await this.getOrders();
    return all.filter(o => ids.includes(o.id));
  },
  async createOrder(orderData) {
    const res = await apiClient.post<any>('/crop-orders', orderData);
    return fixOrder(res);
  },
  async updateOrder(id, updates) {
    const res = await apiClient.put<any>('/crop-orders/' + id, updates);
    return fixOrder(res);
  },
  async deleteOrder(id) {
    await apiClient.del<any>('/crop-orders/' + id);
    return true;
  },
  async deleteOrders(ids) {
    await apiClient.del<any>('/crop-orders', { ids });
    return true;
  },
  async linkInstances(orderId, instanceIds) {
    await apiClient.put<any>('/crop-orders/' + orderId + '/link-instances', { instanceIds });
    return true;
  },
  async unlinkInstances(orderId, instanceIds) {
    await apiClient.put<any>('/crop-orders/' + orderId + '/unlink-instances', { instanceIds });
    return true;
  },
  async updateOrderStatus(id, status) {
    await apiClient.put<any>('/crop-orders/' + id + '/status', { status });
    return true;
  },
  async getOrderDetail(id) {
    const order = await this.getOrderById(id);
    if (!order) return null;
    return { ...order, instances: order.instanceIds || [] };
  },
  async resetOrders() {
    await apiClient.post<any>('/system/clear-all');
  },
};
