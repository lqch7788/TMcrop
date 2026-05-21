/**
 * 加班管理 API 服务
 * 对接后端 /api/overtime
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';

/**
 * 加班记录类型
 */
export interface OvertimeRecord {
  id: string;
  workerId: string;
  workerName: string;
  overtimeType: 'workday' | 'weekend' | 'holiday';
  overtimeTypeLabel: string;
  workDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  baseSalary: number;
  hourlyRate: number;
  overtimePay: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  statusLabel: string;
  approvalCode?: string;
  approvedAt?: string;
  departmentId?: string;
  departmentName?: string;
  greenhouseId?: string;
  greenhouseName?: string;
  remarks?: string;
  version?: number;
  createTime?: string;
  updateTime?: string;
}

/**
 * 创建加班记录参数
 */
export interface CreateOvertimeParams {
  workerId: string;
  workerName: string;
  overtimeType: 'workday' | 'weekend' | 'holiday';
  workDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  baseSalary?: number;
  hourlyRate?: number;
  overtimePay?: number;
  reason: string;
  departmentId?: string;
  departmentName?: string;
  greenhouseId?: string;
  greenhouseName?: string;
  remarks?: string;
}

/**
 * 更新加班记录参数
 */
export interface UpdateOvertimeParams {
  overtimeType?: 'workday' | 'weekend' | 'holiday';
  workDate?: string;
  startTime?: string;
  endTime?: string;
  hours?: number;
  baseSalary?: number;
  hourlyRate?: number;
  overtimePay?: number;
  reason?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  remarks?: string;
}

/**
 * 加班类型映射（中文 -> 英文枚举）
 */
export const OVERTIME_TYPE_MAP: Record<string, 'workday' | 'weekend' | 'holiday'> = {
  '工作日加班': 'workday',
  '休息日加班': 'weekend',
  '节假日加班': 'holiday',
};

/**
 * 加班类型映射（英文枚举 -> 中文标签）
 */
export const OVERTIME_TYPE_LABELS: Record<string, string> = {
  workday: '工作日加班',
  weekend: '休息日加班',
  holiday: '节假日加班',
};

/**
 * 状态映射（英文 -> 中文标签）
 */
export const STATUS_LABELS: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  cancelled: '已取消',
};

/**
 * 获取加班记录列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getOvertimeRecords(
  filters?: {
    workerName?: string;
    overtimeType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
  },
  pagination?: { page?: number; limit?: number }
): Promise<{ records: OvertimeRecord[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const params: Record<string, string> = {};
  if (filters?.workerName) params.worker_name = filters.workerName;
  if (filters?.overtimeType) params.overtime_type = filters.overtimeType;
  if (filters?.status) params.status = filters.status;
  if (filters?.startDate) params.start_date = filters.startDate;
  if (filters?.endDate) params.end_date = filters.endDate;
  if (filters?.departmentId) params.department_id = filters.departmentId;
  if (pagination?.page) params.page = String(pagination.page);
  if (pagination?.limit) params.limit = String(pagination.limit);

  const paramsStr = new URLSearchParams(params).toString();
  const url = paramsStr ? `/overtime?${paramsStr}` : '/overtime';
  const response = await enhancedApiClient.get<any>(url);

  // 转换后端数据格式为前端格式
  const records: OvertimeRecord[] = (response.data || []).map((item: any) => ({
    id: item.id,
    workerId: item.worker_id,
    workerName: item.worker_name,
    overtimeType: item.overtime_type,
    overtimeTypeLabel: item.overtimeTypeLabel || OVERTIME_TYPE_LABELS[item.overtime_type] || item.overtime_type,
    workDate: item.work_date,
    startTime: item.start_time,
    endTime: item.end_time,
    hours: item.hours,
    baseSalary: item.base_salary,
    hourlyRate: item.hourly_rate,
    overtimePay: item.overtime_pay,
    reason: item.reason,
    status: item.status,
    statusLabel: item.statusLabel || STATUS_LABELS[item.status] || item.status,
    approvalCode: item.approval_code,
    approvedAt: item.approved_at,
    departmentId: item.department_id,
    departmentName: item.department_name,
    greenhouseId: item.greenhouse_id,
    greenhouseName: item.greenhouse_name,
    remarks: item.remarks,
    version: item.version,
    createTime: item.create_time,
    updateTime: item.update_time,
  }));

  return {
    records,
    pagination: response.meta || { page: 1, limit: 50, total: 0, totalPages: 0 },
  };
}

/**
 * 获取单个加班记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getOvertimeById(id: string): Promise<OvertimeRecord | null> {
  const response = await enhancedApiClient.get<any>(`/overtime/${id}`);

  if (!response.data) return null;

  const item = response.data;
  return {
    id: item.id,
    workerId: item.worker_id,
    workerName: item.worker_name,
    overtimeType: item.overtime_type,
    overtimeTypeLabel: item.overtimeTypeLabel || OVERTIME_TYPE_LABELS[item.overtime_type] || item.overtime_type,
    workDate: item.work_date,
    startTime: item.start_time,
    endTime: item.end_time,
    hours: item.hours,
    baseSalary: item.base_salary,
    hourlyRate: item.hourly_rate,
    overtimePay: item.overtime_pay,
    reason: item.reason,
    status: item.status,
    statusLabel: item.statusLabel || STATUS_LABELS[item.status] || item.status,
    approvalCode: item.approval_code,
    approvedAt: item.approved_at,
    departmentId: item.department_id,
    departmentName: item.department_name,
    greenhouseId: item.greenhouse_id,
    greenhouseName: item.greenhouse_name,
    remarks: item.remarks,
    version: item.version,
    createTime: item.create_time,
    updateTime: item.update_time,
  };
}

/**
 * 创建加班记录
 * 降级策略：API → 离线队列
 */
export async function createOvertimeRecord(overtime: CreateOvertimeParams): Promise<OvertimeRecord> {
  const snakeData = {
    worker_id: overtime.workerId,
    worker_name: overtime.workerName,
    overtime_type: overtime.overtimeType,
    work_date: overtime.workDate,
    start_time: overtime.startTime,
    end_time: overtime.endTime,
    hours: overtime.hours,
    base_salary: overtime.baseSalary,
    hourly_rate: overtime.hourlyRate,
    overtime_pay: overtime.overtimePay,
    reason: overtime.reason,
    department_id: overtime.departmentId,
    department_name: overtime.departmentName,
    greenhouse_id: overtime.greenhouseId,
    greenhouse_name: overtime.greenhouseName,
    remarks: overtime.remarks,
  };

  const response = await enhancedApiClient.post<any>('/overtime', snakeData);

  return {
    ...overtime,
    id: response.data?.id || `OT${Date.now()}`,
    overtimeTypeLabel: OVERTIME_TYPE_LABELS[overtime.overtimeType] || overtime.overtimeType,
    status: 'pending',
    statusLabel: '待审批',
    createTime: new Date().toISOString(),
  };
}

/**
 * 更新加班记录
 * 降级策略：API → 离线队列
 */
export async function updateOvertimeRecord(id: string, updates: UpdateOvertimeParams): Promise<boolean> {
  const snakeData: Record<string, any> = {};
  if (updates.overtimeType) snakeData.overtime_type = updates.overtimeType;
  if (updates.workDate) snakeData.work_date = updates.workDate;
  if (updates.startTime) snakeData.start_time = updates.startTime;
  if (updates.endTime) snakeData.end_time = updates.endTime;
  if (updates.hours !== undefined) snakeData.hours = updates.hours;
  if (updates.baseSalary !== undefined) snakeData.base_salary = updates.baseSalary;
  if (updates.hourlyRate !== undefined) snakeData.hourly_rate = updates.hourlyRate;
  if (updates.overtimePay !== undefined) snakeData.overtime_pay = updates.overtimePay;
  if (updates.reason) snakeData.reason = updates.reason;
  if (updates.status) snakeData.status = updates.status;
  if (updates.remarks !== undefined) snakeData.remarks = updates.remarks;

  await enhancedApiClient.put(`/overtime/${id}`, snakeData);

  return true;
}

/**
 * 删除加班记录
 * 降级策略：API → 离线队列
 */
export async function deleteOvertimeRecord(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/overtime/${id}`);
  return true;
}

/**
 * 批量删除加班记录
 * 降级策略：API → 离线队列
 */
export async function deleteOvertimeRecords(ids: string[]): Promise<boolean> {
  for (const id of ids) {
    await enhancedApiClient.delete(`/overtime/${id}`);
  }
  return true;
}

/**
 * 审批加班记录
 * 降级策略：API → 离线队列
 */
export async function approveOvertimeRecord(id: string, approved: boolean, comment?: string): Promise<boolean> {
  await enhancedApiClient.put(`/overtime/${id}`, {
    status: approved ? 'approved' : 'rejected',
    approved_at: new Date().toISOString(),
    approval_comment: comment,
  });
  return true;
}
