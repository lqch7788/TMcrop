/**
 * 种植 Service - API 实现
 */

import { Planting } from '@/types/crop';
import { IPlantingService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixPlanting(item: any): Planting {
  return {
    ...item,
    isHarvest: item.is_harvest === 1 || item.is_harvest === true,
    pictures: typeof item.pictures === 'string' ? JSON.parse(item.pictures || '[]') : (item.pictures || []),
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const plantingService: IPlantingService = {
  async initPlantings() {
    return this.getPlantings();
  },
  async getPlantings() {
    const res = await apiClient.get<PaginatedResponse<Planting>>('/plantings');
    return res.data.map(fixPlanting);
  },
  async getPlantingById(id) {
    const res = await apiClient.get<any>('/plantings/' + id);
    return fixPlanting(res);
  },
  async getPlantingsByIds(ids) {
    const all = await this.getPlantings();
    return all.filter(p => ids.includes(p.id));
  },
  async getPlantingsBySourceId(sourceId) {
    const res = await apiClient.get<PaginatedResponse<Planting>>('/plantings?source_id=' + sourceId);
    return res.data.map(fixPlanting);
  },
  async addPlanting(planting) {
    const res = await apiClient.post<any>('/plantings', planting);
    return fixPlanting(res);
  },
  async updatePlanting(id, updates) {
    const res = await apiClient.put<any>('/plantings/' + id, updates);
    return fixPlanting(res);
  },
  async deletePlanting(id) {
    await apiClient.del<any>('/plantings/' + id);
    return true;
  },
  async deletePlantings(ids) {
    await apiClient.del<any>('/plantings', { ids });
    return true;
  },
  async harvestPlanting(id, harvestDate, harvestCount) {
    await apiClient.put<any>('/plantings/' + id + '/harvest', { harvest_date: harvestDate, harvest_count: harvestCount });
    return true;
  },
  async getUnharvestedPlantings() {
    const res = await apiClient.get<any>('/plantings/status/unharvested');
    return (res || []).map(fixPlanting);
  },
  async getHarvestedPlantings() {
    const res = await apiClient.get<any>('/plantings/status/harvested');
    return (res || []).map(fixPlanting);
  },
  async generatePlantCode(sourceCode) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    return sourceCode + '-' + dateStr;
  },
  async resetPlantings() {
    await apiClient.post<any>('/system/clear-all');
  },
};
