/**
 * 薪资调整 Service - API 实现
 */

import { SalaryAdjustment } from '@/types';
import { ISalaryAdjustmentService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): SalaryAdjustment {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const salaryAdjustmentService: ISalaryAdjustmentService = {
  async initSalaryAdjustments() {
    return this.getSalaryAdjustments();
  },
  async getSalaryAdjustments() {
    const res = await apiClient.get<PaginatedResponse<SalaryAdjustment>>('/salaryAdjustments');
    return res.data.map(fixDates);
  },
  async getSalaryAdjustmentById(id) {
    const res = await apiClient.get<any>('/salaryAdjustments/' + id);
    return fixDates(res);
  },
  async addSalaryAdjustment(item) {
    const res = await apiClient.post<any>('/salaryAdjustments', item);
    return fixDates(res);
  },
  async updateSalaryAdjustment(id, updates) {
    const res = await apiClient.put<any>('/salaryAdjustments/' + id, updates);
    return fixDates(res);
  },
  async deleteSalaryAdjustment(id) {
    await apiClient.del<any>('/salaryAdjustments/' + id);
    return true;
  },
  async deleteSalaryAdjustments(ids) {
    await apiClient.del<any>('/salaryAdjustments', { ids });
    return true;
  },
  async resetSalaryAdjustments() {
    await apiClient.post<any>('/system/clear-all');
  },
};
