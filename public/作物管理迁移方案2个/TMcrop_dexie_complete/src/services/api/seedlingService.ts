/**
 * 育苗 Service - API 实现
 */

import { Seedling, DailyRecord } from '@/types/crop';
import { ISeedlingService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixSeedling(item: any): Seedling {
  return {
    ...item,
    isFinished: item.is_finished === 1 || item.is_finished === true,
    pictures: typeof item.pictures === 'string' ? JSON.parse(item.pictures || '[]') : (item.pictures || []),
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

function fixRecord(item: any): DailyRecord {
  return {
    ...item,
    seedlingId: item.seedling_id || item.seedlingId,
    watering: item.watering === 1 || item.watering === true,
    recordDate: item.record_date || item.recordDate,
  };
}

export const seedlingService: ISeedlingService = {
  async initSeedlings() {
    return this.getSeedlings();
  },
  async getSeedlings() {
    const res = await apiClient.get<PaginatedResponse<Seedling>>('/seedlings');
    return res.data.map(fixSeedling);
  },
  async getSeedlingById(id) {
    const res = await apiClient.get<any>('/seedlings/' + id);
    return fixSeedling(res);
  },
  async getSeedlingsByIds(ids) {
    const all = await this.getSeedlings();
    return all.filter(s => ids.includes(s.id));
  },
  async getSeedlingsBySourceId(sourceId) {
    const res = await apiClient.get<PaginatedResponse<Seedling>>('/seedlings?source_id=' + sourceId);
    return res.data.map(fixSeedling);
  },
  async addSeedling(seedling) {
    const res = await apiClient.post<any>('/seedlings', seedling);
    return fixSeedling(res);
  },
  async updateSeedling(id, updates) {
    const res = await apiClient.put<any>('/seedlings/' + id, updates);
    return fixSeedling(res);
  },
  async deleteSeedling(id) {
    await apiClient.del<any>('/seedlings/' + id);
    return true;
  },
  async deleteSeedlings(ids) {
    await apiClient.del<any>('/seedlings', { ids });
    return true;
  },
  async addDailyRecord(seedlingId, record) {
    const res = await apiClient.post<any>('/seedlings/' + seedlingId + '/daily-records', record);
    return fixRecord(res);
  },
  async deleteDailyRecord(seedlingId, recordId) {
    await apiClient.del<any>('/seedlings/' + seedlingId + '/daily-records/' + recordId);
    return true;
  },
  async updateDailyRecord(seedlingId, recordId, updates) {
    await apiClient.put<any>('/seedlings/' + seedlingId + '/daily-records/' + recordId, updates);
    return true;
  },
  async increasePlantedCount(id, count) {
    await apiClient.put<any>('/seedlings/' + id + '/plant', { count });
    return true;
  },
  async getTransplantReadySeedlings() {
    const res = await apiClient.get<any>('/seedlings/transplant-ready/list');
    return (res || []).map(fixSeedling);
  },
  async getAvailableTransplantCount(id) {
    const s = await this.getSeedlingById(id);
    if (!s) return 0;
    return s.survivalCount - s.plantedCount;
  },
  async resetSeedlings() {
    await apiClient.post<any>('/system/clear-all');
  },
};
