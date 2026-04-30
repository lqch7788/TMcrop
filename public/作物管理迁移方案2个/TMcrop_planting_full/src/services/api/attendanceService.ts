/**
 * 考勤记录 Service - API 实现
 */

import { AttendanceRecord } from '@/types';
import { IAttendanceService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixDates(item: any): AttendanceRecord {
  return {
    ...item,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const attendanceService: IAttendanceService = {
  async initAttendanceRecords() {
    return this.getAttendanceRecords();
  },
  async getAttendanceRecords() {
    const res = await apiClient.get<PaginatedResponse<AttendanceRecord>>('/attendance');
    return res.data.map(fixDates);
  },
  async getAttendanceRecordById(id) {
    const res = await apiClient.get<any>('/attendance/' + id);
    return fixDates(res);
  },
  async addAttendanceRecord(item) {
    const res = await apiClient.post<any>('/attendance', item);
    return fixDates(res);
  },
  async updateAttendanceRecord(id, updates) {
    const res = await apiClient.put<any>('/attendance/' + id, updates);
    return fixDates(res);
  },
  async deleteAttendanceRecord(id) {
    await apiClient.del<any>('/attendance/' + id);
    return true;
  },
  async deleteAttendanceRecords(ids) {
    await apiClient.del<any>('/attendance', { ids });
    return true;
  },
  async resetAttendanceRecords() {
    await apiClient.post<any>('/system/clear-all');
  },
};
