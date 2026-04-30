/**
 * 加班记录 Service - API 实现
 */

import { OvertimeRecord } from '@/types';
import { IOvertimeService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): OvertimeRecord {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const overtimeService: IOvertimeService = {
  async initOvertimeRecords() {
    return this.getOvertimeRecords();
  },
  async getOvertimeRecords() {
    const res = await apiClient.get<PaginatedResponse<OvertimeRecord>>('/overtime');
    return res.data.map(fixDates);
  },
  async getOvertimeRecordById(id) {
    const res = await apiClient.get<any>('/overtime/' + id);
    return fixDates(res);
  },
  async addOvertimeRecord(item) {
    const res = await apiClient.post<any>('/overtime', item);
    return fixDates(res);
  },
  async updateOvertimeRecord(id, updates) {
    const res = await apiClient.put<any>('/overtime/' + id, updates);
    return fixDates(res);
  },
  async deleteOvertimeRecord(id) {
    await apiClient.del<any>('/overtime/' + id);
    return true;
  },
  async deleteOvertimeRecords(ids) {
    await apiClient.del<any>('/overtime', { ids });
    return true;
  },
  async resetOvertimeRecords() {
    await apiClient.post<any>('/system/clear-all');
  },
};
