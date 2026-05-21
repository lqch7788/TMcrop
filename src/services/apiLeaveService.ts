/**
 * 请假管理 API 服务
 * 对接后端 /api/leave
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';

/**
 * 请假记录类型
 */
export interface LeaveRecord {
  id: string;
  workerId: string;
  workerName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'withdrawn';
  statusLabel: string;
  leaveTypeLabel: string;
  departmentId?: string;
  departmentName?: string;
  approver?: string;
  approveTime?: string;
  remarks?: string;
  createTime?: string;
  updateTime?: string;
}

/**
 * 创建请假记录参数
 */
export interface CreateLeaveParams {
  workerId: string;
  workerName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  departmentId?: string;
  departmentName?: string;
  remarks?: string;
}

/**
 * 更新请假记录参数
 */
export interface UpdateLeaveParams {
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  reason?: string;
  status?: string;
  remarks?: string;
}

/**
 * 请假额度类型
 */
export interface LeaveQuota {
  id: string;
  workerId: string;
  workerName: string;
  year: number;
  leaveCategory: string;
  leaveTypeLabel: string;
  totalDays: number;
  usedDays: number;
  frozenDays: number;
  remainingDays: number;
  departmentId?: string;
  departmentName?: string;
}

/**
 * 获取请假记录列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getLeaveRecords(
  filters?: {
    workerName?: string;
    leaveType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  },
  pagination?: { page?: number; limit?: number }
): Promise<{ records: LeaveRecord[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const params: Record<string, string> = {};
  if (filters?.workerName) params.worker_name = filters.workerName;
  if (filters?.leaveType) params.leave_type = filters.leaveType;
  if (filters?.status) params.status = filters.status;
  if (filters?.startDate) params.start_date = filters.startDate;
  if (filters?.endDate) params.end_date = filters.endDate;
  if (pagination?.page) params.page = String(pagination.page);
  if (pagination?.limit) params.limit = String(pagination.limit);

  const paramsStr = new URLSearchParams(params).toString();
  const url = paramsStr ? `/leave?${paramsStr}` : '/leave';
  const response = await enhancedApiClient.get<any>(url);

  // 转换后端数据格式为前端格式
  const records: LeaveRecord[] = (response.data || []).map((item: any) => ({
    id: item.id,
    workerId: item.worker_id,
    workerName: item.worker_name,
    leaveType: item.leave_type,
    leaveTypeLabel: item.leaveTypeLabel || item.leave_type,
    startDate: item.start_date,
    endDate: item.end_date,
    days: item.days,
    reason: item.reason,
    status: item.status,
    statusLabel: item.statusLabel || item.status,
    departmentId: item.department_id,
    departmentName: item.department_name,
    approver: item.approver,
    approveTime: item.approve_time,
    remarks: item.remarks,
    createTime: item.create_time,
    updateTime: item.update_time,
  }));

  return {
    records,
    pagination: response.meta || { page: 1, limit: 50, total: 0, totalPages: 0 },
  };
}

/**
 * 获取单个请假记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getLeaveById(id: string): Promise<LeaveRecord | null> {
  const response = await enhancedApiClient.get<any>(`/leave/${id}`);

  if (!response.data) return null;

  const item = response.data;
  return {
    id: item.id,
    workerId: item.worker_id,
    workerName: item.worker_name,
    leaveType: item.leave_type,
    leaveTypeLabel: item.leaveTypeLabel || item.leave_type,
    startDate: item.start_date,
    endDate: item.end_date,
    days: item.days,
    reason: item.reason,
    status: item.status,
    statusLabel: item.statusLabel || item.status,
    departmentId: item.department_id,
    departmentName: item.department_name,
    approver: item.approver,
    approveTime: item.approve_time,
    remarks: item.remarks,
    createTime: item.create_time,
    updateTime: item.update_time,
  };
}

/**
 * 创建请假记录
 * 降级策略：API → 离线队列
 */
export async function createLeaveRecord(leave: CreateLeaveParams): Promise<LeaveRecord> {
  const snakeData = {
    worker_id: leave.workerId,
    worker_name: leave.workerName,
    leave_type: leave.leaveType,
    start_date: leave.startDate,
    end_date: leave.endDate,
    days: leave.days,
    reason: leave.reason,
    department_id: leave.departmentId,
    department_name: leave.departmentName,
    remarks: leave.remarks,
  };

  const response = await enhancedApiClient.post<any>('/leave', snakeData);

  return {
    ...leave,
    id: response.data?.id || `LV${Date.now()}`,
    status: 'pending',
    statusLabel: '待审批',
    createTime: new Date().toISOString(),
  };
}

/**
 * 更新请假记录
 * 降级策略：API → 离线队列
 */
export async function updateLeaveRecord(id: string, updates: UpdateLeaveParams): Promise<boolean> {
  const snakeData: Record<string, any> = {};
  if (updates.leaveType) snakeData.leave_type = updates.leaveType;
  if (updates.startDate) snakeData.start_date = updates.startDate;
  if (updates.endDate) snakeData.end_date = updates.endDate;
  if (updates.days !== undefined) snakeData.days = updates.days;
  if (updates.reason) snakeData.reason = updates.reason;
  if (updates.status) snakeData.status = updates.status;
  if (updates.remarks !== undefined) snakeData.remarks = updates.remarks;

  await enhancedApiClient.put(`/leave/${id}`, snakeData);

  return true;
}

/**
 * 删除请假记录
 * 降级策略：API → 离线队列
 */
export async function deleteLeaveRecord(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/leave/${id}`);
  return true;
}

/**
 * 批量删除请假记录
 * 降级策略：API → 离线队列
 */
export async function deleteLeaveRecords(ids: string[]): Promise<boolean> {
  for (const id of ids) {
    await enhancedApiClient.delete(`/leave/${id}`);
  }
  return true;
}

/**
 * 获取请假额度列表
 */
export async function getLeaveQuotas(workerId?: string, year?: number): Promise<LeaveQuota[]> {
  const params: Record<string, string> = {};
  if (workerId) params.worker_id = workerId;
  if (year) params.year = String(year);

  const paramsStr = new URLSearchParams(params).toString();
  const url = paramsStr ? `/leave/quotas/list?${paramsStr}` : '/leave/quotas/list';
  const response = await enhancedApiClient.get<any>(url);

  return (response.data || []).map((item: any) => ({
    id: item.id,
    workerId: item.worker_id,
    workerName: item.worker_name,
    year: item.year,
    leaveCategory: item.leave_category,
    leaveTypeLabel: item.leaveTypeLabel || item.leave_category,
    totalDays: item.total_days,
    usedDays: item.used_days,
    frozenDays: item.frozen_days,
    remainingDays: item.remaining_days,
    departmentId: item.department_id,
    departmentName: item.department_name,
  }));
}

/**
 * 冻结请假额度
 */
export async function freezeLeaveQuota(
  workerId: string,
  leaveType: string,
  days: number,
  year?: number
): Promise<boolean> {
  await enhancedApiClient.post('/leave/quotas/freeze', {
    worker_id: workerId,
    leave_type: leaveType,
    days,
    year: year || new Date().getFullYear(),
  });
  return true;
}

/**
 * 释放请假额度
 */
export async function releaseLeaveQuota(
  workerId: string,
  leaveType: string,
  days: number,
  year?: number
): Promise<boolean> {
  await enhancedApiClient.post('/leave/quotas/release', {
    worker_id: workerId,
    leave_type: leaveType,
    days,
    year: year || new Date().getFullYear(),
  });
  return true;
}

/**
 * 扣减请假额度
 */
export async function deductLeaveQuota(
  workerId: string,
  leaveType: string,
  days: number,
  year?: number
): Promise<boolean> {
  await enhancedApiClient.post('/leave/quotas/deduct', {
    worker_id: workerId,
    leave_type: leaveType,
    days,
    year: year || new Date().getFullYear(),
  });
  return true;
}
