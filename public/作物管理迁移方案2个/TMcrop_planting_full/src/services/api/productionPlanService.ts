/**
 * productionPlan Service - API 实现
 */

import { ProductionPlan, DailyPlan, MonthlyPlan } from '@/types';
import { IProductionPlanService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): any {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const productionPlanService: IProductionPlanService = {
  // ProductionPlan
  async initProductionPlans() { return this.getProductionPlans(); },
  async getProductionPlans() {
    const res = await apiClient.get<PaginatedResponse<ProductionPlan>>('/productionPlans/productionPlans');
    return res.data.map(fixDates);
  },
  async getProductionPlanById(id) {
    const res = await apiClient.get<any>('/productionPlans/productionPlans/' + id);
    return fixDates(res);
  },
  async addProductionPlan(item) {
    const res = await apiClient.post<any>('/productionPlans/productionPlans', item);
    return fixDates(res);
  },
  async updateProductionPlan(id, updates) {
    const res = await apiClient.put<any>('/productionPlans/productionPlans/' + id, updates);
    return fixDates(res);
  },
  async deleteProductionPlan(id) {
    await apiClient.del<any>('/productionPlans/productionPlans/' + id);
    return true;
  },
  async deleteProductionPlans(ids) {
    await apiClient.del<any>('/productionPlans/productionPlans', { ids });
    return true;
  },
  async resetProductionPlans() {
    await apiClient.post<any>('/system/clear-all');
  },
  // DailyPlan
  async initDailyPlans() { return this.getDailyPlans(); },
  async getDailyPlans() {
    const res = await apiClient.get<PaginatedResponse<DailyPlan>>('/productionPlans/dailyPlans');
    return res.data.map(fixDates);
  },
  async getDailyPlanById(id) {
    const res = await apiClient.get<any>('/productionPlans/dailyPlans/' + id);
    return fixDates(res);
  },
  async addDailyPlan(item) {
    const res = await apiClient.post<any>('/productionPlans/dailyPlans', item);
    return fixDates(res);
  },
  async updateDailyPlan(id, updates) {
    const res = await apiClient.put<any>('/productionPlans/dailyPlans/' + id, updates);
    return fixDates(res);
  },
  async deleteDailyPlan(id) {
    await apiClient.del<any>('/productionPlans/dailyPlans/' + id);
    return true;
  },
  async deleteDailyPlans(ids) {
    await apiClient.del<any>('/productionPlans/dailyPlans', { ids });
    return true;
  },
  async resetDailyPlans() {
    await apiClient.post<any>('/system/clear-all');
  },
  // MonthlyPlan
  async initMonthlyPlans() { return this.getMonthlyPlans(); },
  async getMonthlyPlans() {
    const res = await apiClient.get<PaginatedResponse<MonthlyPlan>>('/productionPlans/monthlyPlans');
    return res.data.map(fixDates);
  },
  async getMonthlyPlanById(id) {
    const res = await apiClient.get<any>('/productionPlans/monthlyPlans/' + id);
    return fixDates(res);
  },
  async addMonthlyPlan(item) {
    const res = await apiClient.post<any>('/productionPlans/monthlyPlans', item);
    return fixDates(res);
  },
  async updateMonthlyPlan(id, updates) {
    const res = await apiClient.put<any>('/productionPlans/monthlyPlans/' + id, updates);
    return fixDates(res);
  },
  async deleteMonthlyPlan(id) {
    await apiClient.del<any>('/productionPlans/monthlyPlans/' + id);
    return true;
  },
  async deleteMonthlyPlans(ids) {
    await apiClient.del<any>('/productionPlans/monthlyPlans', { ids });
    return true;
  },
  async resetMonthlyPlans() {
    await apiClient.post<any>('/system/clear-all');
  },
};
