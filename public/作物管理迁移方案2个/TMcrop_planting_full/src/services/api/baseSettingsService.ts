/**
 * 基地总览 Service - API 实现
 */

import { CompanyGroup, BaseData } from '@/types';
import { IBaseSettingsService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): any {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const baseSettingsService: IBaseSettingsService = {
  async initCompanyGroups() {
    return this.getCompanyGroups();
  },
  async getCompanyGroups() {
    const res = await apiClient.get<PaginatedResponse<CompanyGroup>>('/base-settings/company-groups');
    return res.data.map(fixDates);
  },
  async getCompanyGroupById(id) {
    const res = await apiClient.get<any>('/base-settings/company-groups/' + id);
    return fixDates(res);
  },
  async addCompanyGroup(group) {
    const res = await apiClient.post<any>('/base-settings/company-groups', group);
    return fixDates(res);
  },
  async updateCompanyGroup(id, updates) {
    const res = await apiClient.put<any>('/base-settings/company-groups/' + id, updates);
    return fixDates(res);
  },
  async deleteCompanyGroup(id) {
    await apiClient.del<any>('/base-settings/company-groups/' + id);
    return true;
  },
  async getBases() {
    const res = await apiClient.get<PaginatedResponse<BaseData>>('/base-settings/bases');
    return res.data.map(fixDates);
  },
  async getBaseById(id) {
    const res = await apiClient.get<any>('/base-settings/bases/' + id);
    return fixDates(res);
  },
  async addBase(base) {
    const res = await apiClient.post<any>('/base-settings/bases', base);
    return fixDates(res);
  },
  async updateBase(id, updates) {
    const res = await apiClient.put<any>('/base-settings/bases/' + id, updates);
    return fixDates(res);
  },
  async deleteBase(id) {
    await apiClient.del<any>('/base-settings/bases/' + id);
    return true;
  },
  async getBasesByCompanyId(companyId) {
    const res = await apiClient.get<any>('/base-settings/bases?companyId=' + companyId);
    return res.data.map(fixDates);
  },
  async resetBaseSettings() {
    await apiClient.post<any>('/system/clear-all');
  },
};
