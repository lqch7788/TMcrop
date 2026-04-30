/**
 * 入职记录 Service - API 实现
 */

import { OnboardingRecord } from '@/types';
import { IOnboardingService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): OnboardingRecord {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const onboardingService: IOnboardingService = {
  async initOnboardingRecords() {
    return this.getOnboardingRecords();
  },
  async getOnboardingRecords() {
    const res = await apiClient.get<PaginatedResponse<OnboardingRecord>>('/onboardings');
    return res.data.map(fixDates);
  },
  async getOnboardingRecordById(id) {
    const res = await apiClient.get<any>('/onboardings/' + id);
    return fixDates(res);
  },
  async addOnboardingRecord(item) {
    const res = await apiClient.post<any>('/onboardings', item);
    return fixDates(res);
  },
  async updateOnboardingRecord(id, updates) {
    const res = await apiClient.put<any>('/onboardings/' + id, updates);
    return fixDates(res);
  },
  async deleteOnboardingRecord(id) {
    await apiClient.del<any>('/onboardings/' + id);
    return true;
  },
  async deleteOnboardingRecords(ids) {
    await apiClient.del<any>('/onboardings', { ids });
    return true;
  },
  async resetOnboardingRecords() {
    await apiClient.post<any>('/system/clear-all');
  },
};
