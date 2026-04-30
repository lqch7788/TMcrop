/**
 * 管理指标 Service - API 实现
 */

import { Indicator } from '@/types';
import { IIndicatorService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): Indicator {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const indicatorService: IIndicatorService = {
  async initIndicators() {
    return this.getIndicators();
  },
  async getIndicators() {
    const res = await apiClient.get<PaginatedResponse<Indicator>>('/indicators');
    return res.data.map(fixDates);
  },
  async getIndicatorById(id) {
    const res = await apiClient.get<any>('/indicators/' + id);
    return fixDates(res);
  },
  async addIndicator(item) {
    const res = await apiClient.post<any>('/indicators', item);
    return fixDates(res);
  },
  async updateIndicator(id, updates) {
    const res = await apiClient.put<any>('/indicators/' + id, updates);
    return fixDates(res);
  },
  async deleteIndicator(id) {
    await apiClient.del<any>('/indicators/' + id);
    return true;
  },
  async deleteIndicators(ids) {
    await apiClient.del<any>('/indicators', { ids });
    return true;
  },
  async resetIndicators() {
    await apiClient.post<any>('/system/clear-all');
  },
};
