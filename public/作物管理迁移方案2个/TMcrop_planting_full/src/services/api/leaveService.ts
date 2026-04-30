/**
 * 请假记录 Service - API 实现
 */

import { LeaveRecord } from '@/types';
import { ILeaveService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): LeaveRecord {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const leaveService: ILeaveService = {
  async initLeaveRecords() {
    return this.getLeaveRecords();
  },
  async getLeaveRecords() {
    const res = await apiClient.get<PaginatedResponse<LeaveRecord>>('/leave');
    return res.data.map(fixDates);
  },
  async getLeaveRecordById(id) {
    const res = await apiClient.get<any>('/leave/' + id);
    return fixDates(res);
  },
  async addLeaveRecord(item) {
    const res = await apiClient.post<any>('/leave', item);
    return fixDates(res);
  },
  async updateLeaveRecord(id, updates) {
    const res = await apiClient.put<any>('/leave/' + id, updates);
    return fixDates(res);
  },
  async deleteLeaveRecord(id) {
    await apiClient.del<any>('/leave/' + id);
    return true;
  },
  async deleteLeaveRecords(ids) {
    await apiClient.del<any>('/leave', { ids });
    return true;
  },
  async resetLeaveRecords() {
    await apiClient.post<any>('/system/clear-all');
  },
};
