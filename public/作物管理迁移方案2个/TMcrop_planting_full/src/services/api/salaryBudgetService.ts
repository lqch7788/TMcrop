/**
 * 薪资预算 Service - API 实现
 */

import { SalaryBudget } from '@/types';
import { ISalaryBudgetService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): SalaryBudget {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const salaryBudgetService: ISalaryBudgetService = {
  async initSalaryBudgets() {
    return this.getSalaryBudgets();
  },
  async getSalaryBudgets() {
    const res = await apiClient.get<PaginatedResponse<SalaryBudget>>('/salaryBudgets');
    return res.data.map(fixDates);
  },
  async getSalaryBudgetById(id) {
    const res = await apiClient.get<any>('/salaryBudgets/' + id);
    return fixDates(res);
  },
  async addSalaryBudget(item) {
    const res = await apiClient.post<any>('/salaryBudgets', item);
    return fixDates(res);
  },
  async updateSalaryBudget(id, updates) {
    const res = await apiClient.put<any>('/salaryBudgets/' + id, updates);
    return fixDates(res);
  },
  async deleteSalaryBudget(id) {
    await apiClient.del<any>('/salaryBudgets/' + id);
    return true;
  },
  async deleteSalaryBudgets(ids) {
    await apiClient.del<any>('/salaryBudgets', { ids });
    return true;
  },
  async resetSalaryBudgets() {
    await apiClient.post<any>('/system/clear-all');
  },
};
