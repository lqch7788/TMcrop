/**
 * 考勤补卡 Service - API 实现
 */

import { AttendanceRepair } from '@/types';
import { IAttendanceRepairService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): AttendanceRepair {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const attendanceRepairService: IAttendanceRepairService = {
  async initAttendanceRepairs() {
    return this.getAttendanceRepairs();
  },
  async getAttendanceRepairs() {
    const res = await apiClient.get<PaginatedResponse<AttendanceRepair>>('/attendanceRepairs');
    return res.data.map(fixDates);
  },
  async getAttendanceRepairById(id) {
    const res = await apiClient.get<any>('/attendanceRepairs/' + id);
    return fixDates(res);
  },
  async addAttendanceRepair(item) {
    const res = await apiClient.post<any>('/attendanceRepairs', item);
    return fixDates(res);
  },
  async updateAttendanceRepair(id, updates) {
    const res = await apiClient.put<any>('/attendanceRepairs/' + id, updates);
    return fixDates(res);
  },
  async deleteAttendanceRepair(id) {
    await apiClient.del<any>('/attendanceRepairs/' + id);
    return true;
  },
  async deleteAttendanceRepairs(ids) {
    await apiClient.del<any>('/attendanceRepairs', { ids });
    return true;
  },
  async resetAttendanceRepairs() {
    await apiClient.post<any>('/system/clear-all');
  },
};
