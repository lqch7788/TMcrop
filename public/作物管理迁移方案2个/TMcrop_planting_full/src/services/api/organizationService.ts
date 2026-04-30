/**
 * organization Service - API 实现
 */

import { Department, Position, Staff } from '@/types';
import { IOrganizationService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): any {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const organizationService: IOrganizationService = {
  // Department
  async initDepartments() { return this.getDepartments(); },
  async getDepartments() {
    const res = await apiClient.get<PaginatedResponse<Department>>('/departments/departments');
    return res.data.map(fixDates);
  },
  async getDepartmentById(id) {
    const res = await apiClient.get<any>('/departments/departments/' + id);
    return fixDates(res);
  },
  async addDepartment(item) {
    const res = await apiClient.post<any>('/departments/departments', item);
    return fixDates(res);
  },
  async updateDepartment(id, updates) {
    const res = await apiClient.put<any>('/departments/departments/' + id, updates);
    return fixDates(res);
  },
  async deleteDepartment(id) {
    await apiClient.del<any>('/departments/departments/' + id);
    return true;
  },
  async deleteDepartments(ids) {
    await apiClient.del<any>('/departments/departments', { ids });
    return true;
  },
  async resetDepartments() {
    await apiClient.post<any>('/system/clear-all');
  },
  // Position
  async initPositions() { return this.getPositions(); },
  async getPositions() {
    const res = await apiClient.get<PaginatedResponse<Position>>('/departments/positions');
    return res.data.map(fixDates);
  },
  async getPositionById(id) {
    const res = await apiClient.get<any>('/departments/positions/' + id);
    return fixDates(res);
  },
  async addPosition(item) {
    const res = await apiClient.post<any>('/departments/positions', item);
    return fixDates(res);
  },
  async updatePosition(id, updates) {
    const res = await apiClient.put<any>('/departments/positions/' + id, updates);
    return fixDates(res);
  },
  async deletePosition(id) {
    await apiClient.del<any>('/departments/positions/' + id);
    return true;
  },
  async deletePositions(ids) {
    await apiClient.del<any>('/departments/positions', { ids });
    return true;
  },
  async resetPositions() {
    await apiClient.post<any>('/system/clear-all');
  },
  // Staff
  async initStaffs() { return this.getStaffs(); },
  async getStaffs() {
    const res = await apiClient.get<PaginatedResponse<Staff>>('/departments/staff');
    return res.data.map(fixDates);
  },
  async getStaffById(id) {
    const res = await apiClient.get<any>('/departments/staff/' + id);
    return fixDates(res);
  },
  async addStaff(item) {
    const res = await apiClient.post<any>('/departments/staff', item);
    return fixDates(res);
  },
  async updateStaff(id, updates) {
    const res = await apiClient.put<any>('/departments/staff/' + id, updates);
    return fixDates(res);
  },
  async deleteStaff(id) {
    await apiClient.del<any>('/departments/staff/' + id);
    return true;
  },
  async deleteStaffs(ids) {
    await apiClient.del<any>('/departments/staff', { ids });
    return true;
  },
  async resetStaffs() {
    await apiClient.post<any>('/system/clear-all');
  },
};
