/**
 * 物料 Service - API 实现
 */

import { Material, MaterialReceivingRecord, MaterialUsage, MaterialReturn } from '@/types';
import { IMaterialService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): any {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const materialService: IMaterialService = {
  async initMaterials() {
    return this.getMaterials();
  },
  async getMaterials() {
    const res = await apiClient.get<PaginatedResponse<Material>>('/materials');
    return res.data.map(fixDates);
  },
  async getMaterialById(id) {
    const res = await apiClient.get<any>('/materials/' + id);
    return fixDates(res);
  },
  async addMaterial(material) {
    const res = await apiClient.post<any>('/materials', material);
    return fixDates(res);
  },
  async updateMaterial(id, updates) {
    const res = await apiClient.put<any>('/materials/' + id, updates);
    return fixDates(res);
  },
  async deleteMaterial(id) {
    await apiClient.del<any>('/materials/' + id);
    return true;
  },
  async deleteMaterials(ids) {
    await apiClient.del<any>('/materials', { ids });
    return true;
  },
  async getMaterialsByCategory(category) {
    const res = await apiClient.get<any>('/materials?category=' + category);
    return res.data.map(fixDates);
  },
  async resetMaterials() {
    await apiClient.post<any>('/system/clear-all');
  },

  async getMaterialReceivingRecords() {
    const res = await apiClient.get<PaginatedResponse<MaterialReceivingRecord>>('/materials/receiving');
    return res.data.map(fixDates);
  },
  async getMaterialReceivingRecordById(id) {
    const res = await apiClient.get<any>('/materials/receiving/' + id);
    return fixDates(res);
  },
  async addMaterialReceivingRecord(record) {
    const res = await apiClient.post<any>('/materials/receiving', record);
    return fixDates(res);
  },
  async updateMaterialReceivingRecord(id, updates) {
    const res = await apiClient.put<any>('/materials/receiving/' + id, updates);
    return fixDates(res);
  },
  async deleteMaterialReceivingRecord(id) {
    await apiClient.del<any>('/materials/receiving/' + id);
    return true;
  },

  async getMaterialUsages() {
    const res = await apiClient.get<PaginatedResponse<MaterialUsage>>('/materials/usages');
    return res.data.map(fixDates);
  },
  async addMaterialUsage(usage) {
    const res = await apiClient.post<any>('/materials/usages', usage);
    return fixDates(res);
  },

  async getMaterialReturns() {
    const res = await apiClient.get<PaginatedResponse<MaterialReturn>>('/materials/returns');
    return res.data.map(fixDates);
  },
  async addMaterialReturn(ret) {
    const res = await apiClient.post<any>('/materials/returns', ret);
    return fixDates(res);
  },
};
