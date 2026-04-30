/**
 * 种源 Service - API 实现
 */

import { SeedSource } from '@/types/crop';
import { ISeedSourceService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): SeedSource {
  return {
    ...item,
    pictures: typeof item.pictures === 'string' ? JSON.parse(item.pictures || '[]') : (item.pictures || []),
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const seedSourceService: ISeedSourceService = {
  async initSeedSources() {
    return this.getSeedSources();
  },
  async getSeedSources() {
    const res = await apiClient.get<PaginatedResponse<SeedSource>>('/seed-sources');
    return res.data.map(fixDates);
  },
  async getSeedSourceById(id) {
    const res = await apiClient.get<any>('/seed-sources/' + id);
    return fixDates(res);
  },
  async getSeedSourcesByIds(ids) {
    const all = await this.getSeedSources();
    return all.filter(s => ids.includes(s.id));
  },
  async addSeedSource(source) {
    const res = await apiClient.post<any>('/seed-sources', source);
    return fixDates(res);
  },
  async updateSeedSource(id, updates) {
    const res = await apiClient.put<any>('/seed-sources/' + id, updates);
    return fixDates(res);
  },
  async deleteSeedSource(id) {
    await apiClient.del<any>('/seed-sources/' + id);
    return true;
  },
  async deleteSeedSources(ids) {
    await apiClient.del<any>('/seed-sources', { ids });
    return true;
  },
  async decreaseAvailableCount(id, count) {
    await apiClient.put<any>('/seed-sources/' + id + '/decrease', { count });
    return true;
  },
  async resetSeedSources() {
    await apiClient.post<any>('/system/clear-all');
  },
  async getTodayMaxSeedCodeSerial(dateStr) {
    const res = await apiClient.get<any>('/seed-sources/seed-code/max-serial?dateStr=' + dateStr);
    return res.maxSerial || 0;
  },
  async generateSeedCode(dateStr) {
    const maxSerial = await this.getTodayMaxSeedCodeSerial(dateStr);
    const newSerial = maxSerial + 1;
    return 'ZZ' + dateStr + '-' + String(newSerial).padStart(3, '0');
  },
};
