/**
 * plantingConfig Service - API 实现
 */

import { PlantingMode, PlantArea, Block } from '@/types';
import { IPlantingConfigService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): any {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const plantingConfigService: IPlantingConfigService = {
  // PlantingMode
  async initPlantingModes() { return this.getPlantingModes(); },
  async getPlantingModes() {
    const res = await apiClient.get<PaginatedResponse<PlantingMode>>('/plantingModes/plantingModes');
    return res.data.map(fixDates);
  },
  async getPlantingModeById(id) {
    const res = await apiClient.get<any>('/plantingModes/plantingModes/' + id);
    return fixDates(res);
  },
  async addPlantingMode(item) {
    const res = await apiClient.post<any>('/plantingModes/plantingModes', item);
    return fixDates(res);
  },
  async updatePlantingMode(id, updates) {
    const res = await apiClient.put<any>('/plantingModes/plantingModes/' + id, updates);
    return fixDates(res);
  },
  async deletePlantingMode(id) {
    await apiClient.del<any>('/plantingModes/plantingModes/' + id);
    return true;
  },
  async deletePlantingModes(ids) {
    await apiClient.del<any>('/plantingModes/plantingModes', { ids });
    return true;
  },
  async resetPlantingModes() {
    await apiClient.post<any>('/system/clear-all');
  },
  // PlantArea
  async initPlantAreas() { return this.getPlantAreas(); },
  async getPlantAreas() {
    const res = await apiClient.get<PaginatedResponse<PlantArea>>('/plantingModes/plantAreas');
    return res.data.map(fixDates);
  },
  async getPlantAreaById(id) {
    const res = await apiClient.get<any>('/plantingModes/plantAreas/' + id);
    return fixDates(res);
  },
  async addPlantArea(item) {
    const res = await apiClient.post<any>('/plantingModes/plantAreas', item);
    return fixDates(res);
  },
  async updatePlantArea(id, updates) {
    const res = await apiClient.put<any>('/plantingModes/plantAreas/' + id, updates);
    return fixDates(res);
  },
  async deletePlantArea(id) {
    await apiClient.del<any>('/plantingModes/plantAreas/' + id);
    return true;
  },
  async deletePlantAreas(ids) {
    await apiClient.del<any>('/plantingModes/plantAreas', { ids });
    return true;
  },
  async resetPlantAreas() {
    await apiClient.post<any>('/system/clear-all');
  },
  // Block
  async initBlocks() { return this.getBlocks(); },
  async getBlocks() {
    const res = await apiClient.get<PaginatedResponse<Block>>('/plantingModes/blocks');
    return res.data.map(fixDates);
  },
  async getBlockById(id) {
    const res = await apiClient.get<any>('/plantingModes/blocks/' + id);
    return fixDates(res);
  },
  async addBlock(item) {
    const res = await apiClient.post<any>('/plantingModes/blocks', item);
    return fixDates(res);
  },
  async updateBlock(id, updates) {
    const res = await apiClient.put<any>('/plantingModes/blocks/' + id, updates);
    return fixDates(res);
  },
  async deleteBlock(id) {
    await apiClient.del<any>('/plantingModes/blocks/' + id);
    return true;
  },
  async deleteBlocks(ids) {
    await apiClient.del<any>('/plantingModes/blocks', { ids });
    return true;
  },
  async resetBlocks() {
    await apiClient.post<any>('/system/clear-all');
  },
};
