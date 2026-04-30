/**
 * 库存产品 Service - API 实现
 */

import { ProduceInventory } from '@/types';
import { IInventoryService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): ProduceInventory {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const inventoryService: IInventoryService = {
  async initProduceInventorys() {
    return this.getProduceInventorys();
  },
  async getProduceInventorys() {
    const res = await apiClient.get<PaginatedResponse<ProduceInventory>>('/inventories');
    return res.data.map(fixDates);
  },
  async getProduceInventoryById(id) {
    const res = await apiClient.get<any>('/inventories/' + id);
    return fixDates(res);
  },
  async addProduceInventory(item) {
    const res = await apiClient.post<any>('/inventories', item);
    return fixDates(res);
  },
  async updateProduceInventory(id, updates) {
    const res = await apiClient.put<any>('/inventories/' + id, updates);
    return fixDates(res);
  },
  async deleteProduceInventory(id) {
    await apiClient.del<any>('/inventories/' + id);
    return true;
  },
  async deleteProduceInventorys(ids) {
    await apiClient.del<any>('/inventories', { ids });
    return true;
  },
  async resetProduceInventorys() {
    await apiClient.post<any>('/system/clear-all');
  },
};
