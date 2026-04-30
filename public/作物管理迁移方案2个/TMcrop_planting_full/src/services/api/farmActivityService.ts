/**
 * 农事活动 Service - API 实现
 */

import { FarmActivity } from '@/types';
import { IFarmActivityService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): FarmActivity {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const farmActivityService: IFarmActivityService = {
  async initFarmActivitys() {
    return this.getFarmActivitys();
  },
  async getFarmActivitys() {
    const res = await apiClient.get<PaginatedResponse<FarmActivity>>('/farmActivities');
    return res.data.map(fixDates);
  },
  async getFarmActivityById(id) {
    const res = await apiClient.get<any>('/farmActivities/' + id);
    return fixDates(res);
  },
  async addFarmActivity(item) {
    const res = await apiClient.post<any>('/farmActivities', item);
    return fixDates(res);
  },
  async updateFarmActivity(id, updates) {
    const res = await apiClient.put<any>('/farmActivities/' + id, updates);
    return fixDates(res);
  },
  async deleteFarmActivity(id) {
    await apiClient.del<any>('/farmActivities/' + id);
    return true;
  },
  async deleteFarmActivitys(ids) {
    await apiClient.del<any>('/farmActivities', { ids });
    return true;
  },
  async resetFarmActivitys() {
    await apiClient.post<any>('/system/clear-all');
  },
};
