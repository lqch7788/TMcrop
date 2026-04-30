/**
 * systemConfig Service - API 实现
 */

import { SystemConfig, Dictionary } from '@/types';
import { ISystemConfigService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): any {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const systemConfigService: ISystemConfigService = {
  // SystemConfig
  async initSystemConfigs() { return this.getSystemConfigs(); },
  async getSystemConfigs() {
    const res = await apiClient.get<PaginatedResponse<SystemConfig>>('/systemConfigs/systemConfigs');
    return res.data.map(fixDates);
  },
  async getSystemConfigById(id) {
    const res = await apiClient.get<any>('/systemConfigs/systemConfigs/' + id);
    return fixDates(res);
  },
  async addSystemConfig(item) {
    const res = await apiClient.post<any>('/systemConfigs/systemConfigs', item);
    return fixDates(res);
  },
  async updateSystemConfig(id, updates) {
    const res = await apiClient.put<any>('/systemConfigs/systemConfigs/' + id, updates);
    return fixDates(res);
  },
  async deleteSystemConfig(id) {
    await apiClient.del<any>('/systemConfigs/systemConfigs/' + id);
    return true;
  },
  async deleteSystemConfigs(ids) {
    await apiClient.del<any>('/systemConfigs/systemConfigs', { ids });
    return true;
  },
  async resetSystemConfigs() {
    await apiClient.post<any>('/system/clear-all');
  },
  // Dictionary
  async initDictionarys() { return this.getDictionarys(); },
  async getDictionarys() {
    const res = await apiClient.get<PaginatedResponse<Dictionary>>('/systemConfigs/dictionaries');
    return res.data.map(fixDates);
  },
  async getDictionaryById(id) {
    const res = await apiClient.get<any>('/systemConfigs/dictionaries/' + id);
    return fixDates(res);
  },
  async addDictionary(item) {
    const res = await apiClient.post<any>('/systemConfigs/dictionaries', item);
    return fixDates(res);
  },
  async updateDictionary(id, updates) {
    const res = await apiClient.put<any>('/systemConfigs/dictionaries/' + id, updates);
    return fixDates(res);
  },
  async deleteDictionary(id) {
    await apiClient.del<any>('/systemConfigs/dictionaries/' + id);
    return true;
  },
  async deleteDictionarys(ids) {
    await apiClient.del<any>('/systemConfigs/dictionaries', { ids });
    return true;
  },
  async resetDictionarys() {
    await apiClient.post<any>('/system/clear-all');
  },
};
