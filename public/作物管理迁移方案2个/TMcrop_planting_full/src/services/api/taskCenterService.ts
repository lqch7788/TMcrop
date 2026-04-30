/**
 * 任务中心 Service - API 实现
 */

import { TaskCenterRecord } from '@/types';
import { ITaskCenterService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): TaskCenterRecord {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const taskCenterService: ITaskCenterService = {
  async initTaskCenterRecords() {
    return this.getTaskCenterRecords();
  },
  async getTaskCenterRecords() {
    const res = await apiClient.get<PaginatedResponse<TaskCenterRecord>>('/taskCenter');
    return res.data.map(fixDates);
  },
  async getTaskCenterRecordById(id) {
    const res = await apiClient.get<any>('/taskCenter/' + id);
    return fixDates(res);
  },
  async addTaskCenterRecord(item) {
    const res = await apiClient.post<any>('/taskCenter', item);
    return fixDates(res);
  },
  async updateTaskCenterRecord(id, updates) {
    const res = await apiClient.put<any>('/taskCenter/' + id, updates);
    return fixDates(res);
  },
  async deleteTaskCenterRecord(id) {
    await apiClient.del<any>('/taskCenter/' + id);
    return true;
  },
  async deleteTaskCenterRecords(ids) {
    await apiClient.del<any>('/taskCenter', { ids });
    return true;
  },
  async resetTaskCenterRecords() {
    await apiClient.post<any>('/system/clear-all');
  },
};
