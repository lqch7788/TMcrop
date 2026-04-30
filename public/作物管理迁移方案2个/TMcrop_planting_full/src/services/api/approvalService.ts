/**
 * 审批单 Service - API 实现
 */

import { Approval } from '@/types';
import { IApprovalService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): Approval {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const approvalService: IApprovalService = {
  async initApprovals() {
    return this.getApprovals();
  },
  async getApprovals() {
    const res = await apiClient.get<PaginatedResponse<Approval>>('/approvals');
    return res.data.map(fixDates);
  },
  async getApprovalById(id) {
    const res = await apiClient.get<any>('/approvals/' + id);
    return fixDates(res);
  },
  async addApproval(item) {
    const res = await apiClient.post<any>('/approvals', item);
    return fixDates(res);
  },
  async updateApproval(id, updates) {
    const res = await apiClient.put<any>('/approvals/' + id, updates);
    return fixDates(res);
  },
  async deleteApproval(id) {
    await apiClient.del<any>('/approvals/' + id);
    return true;
  },
  async deleteApprovals(ids) {
    await apiClient.del<any>('/approvals', { ids });
    return true;
  },
  async resetApprovals() {
    await apiClient.post<any>('/system/clear-all');
  },
};
