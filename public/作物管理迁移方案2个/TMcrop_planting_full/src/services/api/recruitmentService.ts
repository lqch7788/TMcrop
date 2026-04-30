/**
 * 招聘记录 Service - API 实现
 */

import { RecruitmentRecord } from '@/types';
import { IRecruitmentService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): RecruitmentRecord {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const recruitmentService: IRecruitmentService = {
  async initRecruitmentRecords() {
    return this.getRecruitmentRecords();
  },
  async getRecruitmentRecords() {
    const res = await apiClient.get<PaginatedResponse<RecruitmentRecord>>('/recruitment');
    return res.data.map(fixDates);
  },
  async getRecruitmentRecordById(id) {
    const res = await apiClient.get<any>('/recruitment/' + id);
    return fixDates(res);
  },
  async addRecruitmentRecord(item) {
    const res = await apiClient.post<any>('/recruitment', item);
    return fixDates(res);
  },
  async updateRecruitmentRecord(id, updates) {
    const res = await apiClient.put<any>('/recruitment/' + id, updates);
    return fixDates(res);
  },
  async deleteRecruitmentRecord(id) {
    await apiClient.del<any>('/recruitment/' + id);
    return true;
  },
  async deleteRecruitmentRecords(ids) {
    await apiClient.del<any>('/recruitment', { ids });
    return true;
  },
  async resetRecruitmentRecords() {
    await apiClient.post<any>('/system/clear-all');
  },
};
