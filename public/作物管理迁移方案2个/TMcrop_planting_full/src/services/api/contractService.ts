/**
 * 合同记录 Service - API 实现
 */

import { ContractRecord } from '@/types';
import { IContractService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): ContractRecord {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const contractService: IContractService = {
  async initContractRecords() {
    return this.getContractRecords();
  },
  async getContractRecords() {
    const res = await apiClient.get<PaginatedResponse<ContractRecord>>('/contracts');
    return res.data.map(fixDates);
  },
  async getContractRecordById(id) {
    const res = await apiClient.get<any>('/contracts/' + id);
    return fixDates(res);
  },
  async addContractRecord(item) {
    const res = await apiClient.post<any>('/contracts', item);
    return fixDates(res);
  },
  async updateContractRecord(id, updates) {
    const res = await apiClient.put<any>('/contracts/' + id, updates);
    return fixDates(res);
  },
  async deleteContractRecord(id) {
    await apiClient.del<any>('/contracts/' + id);
    return true;
  },
  async deleteContractRecords(ids) {
    await apiClient.del<any>('/contracts', { ids });
    return true;
  },
  async resetContractRecords() {
    await apiClient.post<any>('/system/clear-all');
  },
};
