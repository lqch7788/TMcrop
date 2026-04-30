/**
 * 离职记录 Service - API 实现
 */

import { ResignationRecord } from '@/types';
import { IResignationService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): ResignationRecord {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const resignationService: IResignationService = {
  async initResignationRecords() {
    return this.getResignationRecords();
  },
  async getResignationRecords() {
    const res = await apiClient.get<PaginatedResponse<ResignationRecord>>('/resignations');
    return res.data.map(fixDates);
  },
  async getResignationRecordById(id) {
    const res = await apiClient.get<any>('/resignations/' + id);
    return fixDates(res);
  },
  async addResignationRecord(item) {
    const res = await apiClient.post<any>('/resignations', item);
    return fixDates(res);
  },
  async updateResignationRecord(id, updates) {
    const res = await apiClient.put<any>('/resignations/' + id, updates);
    return fixDates(res);
  },
  async deleteResignationRecord(id) {
    await apiClient.del<any>('/resignations/' + id);
    return true;
  },
  async deleteResignationRecords(ids) {
    await apiClient.del<any>('/resignations', { ids });
    return true;
  },
  async resetResignationRecords() {
    await apiClient.post<any>('/system/clear-all');
  },
};
