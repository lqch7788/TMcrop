/**
 * 仓库 Service - API 实现
 */

import { Warehouse } from '@/types';
import { IWarehouseService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): Warehouse {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const warehouseService: IWarehouseService = {
  async initWarehouses() {
    return this.getWarehouses();
  },
  async getWarehouses() {
    const res = await apiClient.get<PaginatedResponse<Warehouse>>('/warehouses');
    return res.data.map(fixDates);
  },
  async getWarehouseById(id) {
    const res = await apiClient.get<any>('/warehouses/' + id);
    return fixDates(res);
  },
  async addWarehouse(item) {
    const res = await apiClient.post<any>('/warehouses', item);
    return fixDates(res);
  },
  async updateWarehouse(id, updates) {
    const res = await apiClient.put<any>('/warehouses/' + id, updates);
    return fixDates(res);
  },
  async deleteWarehouse(id) {
    await apiClient.del<any>('/warehouses/' + id);
    return true;
  },
  async deleteWarehouses(ids) {
    await apiClient.del<any>('/warehouses', { ids });
    return true;
  },
  async resetWarehouses() {
    await apiClient.post<any>('/system/clear-all');
  },
};
