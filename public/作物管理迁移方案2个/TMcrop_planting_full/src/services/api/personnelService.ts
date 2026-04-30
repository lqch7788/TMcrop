/**
 * 人员档案 Service - API 实现
 */

import { PersonnelRecord } from '@/types';
import { IPersonnelService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): PersonnelRecord {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const personnelService: IPersonnelService = {
  async initPersonnelRecords() {
    return this.getPersonnelRecords();
  },
  async getPersonnelRecords() {
    const res = await apiClient.get<PaginatedResponse<PersonnelRecord>>('/personnel');
    return res.data.map(fixDates);
  },
  async getPersonnelRecordById(id) {
    const res = await apiClient.get<any>('/personnel/' + id);
    return fixDates(res);
  },
  async addPersonnelRecord(item) {
    const res = await apiClient.post<any>('/personnel', item);
    return fixDates(res);
  },
  async updatePersonnelRecord(id, updates) {
    const res = await apiClient.put<any>('/personnel/' + id, updates);
    return fixDates(res);
  },
  async deletePersonnelRecord(id) {
    await apiClient.del<any>('/personnel/' + id);
    return true;
  },
  async deletePersonnelRecords(ids) {
    await apiClient.del<any>('/personnel', { ids });
    return true;
  },
  async resetPersonnelRecords() {
    await apiClient.post<any>('/system/clear-all');
  },
};
