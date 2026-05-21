/**
 * 离职管理 API 服务
 * 对接后端 /api/resignation
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';

/**
 * 离职记录类型
 */
export interface ResignationRecord {
  id: string;
  resignationCode: string;
  workerId: string;
  workerName: string;
  department?: string;
  position?: string;
  resignationType: string;
  reason: string;
  expectedLastDay: string;
  actualLastDay?: string;
  handoverUserId?: string;
  handoverUserName?: string;
  handoverNote?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  statusLabel: string;
  approver?: string;
  approveTime?: string;
  remarks?: string;
  createTime: string;
  updateTime?: string;
}

/**
 * 创建离职记录参数
 */
export interface CreateResignationParams {
  workerId: string;
  workerName: string;
  department?: string;
  position?: string;
  resignationType: string;
  reason: string;
  expectedLastDay: string;
  handoverUserId?: string;
  handoverUserName?: string;
  handoverNote?: string;
  remarks?: string;
}

/**
 * 更新离职记录参数
 */
export interface UpdateResignationParams {
  resignationType?: string;
  reason?: string;
  expectedLastDay?: string;
  actualLastDay?: string;
  handoverUserId?: string;
  handoverUserName?: string;
  handoverNote?: string;
  status?: string;
  remarks?: string;
}

/**
 * 获取离职记录列表
 */
export async function getResignationRecords(
  filters?: {
    workerName?: string;
    resignationType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  },
  pagination?: { page?: number; limit?: number }
): Promise<{ records: ResignationRecord[]; pagination: { page: number; limit: number; total: number } }> {
  const params: Record<string, string> = {};
  if (filters?.workerName) params.worker_name = filters.workerName;
  if (filters?.resignationType) params.resignation_type = filters.resignationType;
  if (filters?.status) params.status = filters.status;
  if (filters?.startDate) params.start_date = filters.startDate;
  if (filters?.endDate) params.end_date = filters.endDate;
  if (pagination?.page) params.page = String(pagination.page);
  if (pagination?.limit) params.limit = String(pagination.limit);

  const paramsStr = new URLSearchParams(params).toString();
  const url = paramsStr ? `/resignation?${paramsStr}` : '/resignation';
  const response = await enhancedApiClient.get<any>(url);

  // 转换后端数据格式为前端格式
  const records: ResignationRecord[] = (response.data || []).map((item: any) => ({
    id: item.id,
    resignationCode: item.resignation_code,
    workerId: item.worker_id,
    workerName: item.worker_name,
    department: item.department,
    position: item.position,
    resignationType: item.resignation_type,
    reason: item.reason,
    expectedLastDay: item.expected_last_day,
    actualLastDay: item.actual_last_day,
    handoverUserId: item.handover_user_id,
    handoverUserName: item.handover_user_name,
    handoverNote: item.handover_note,
    status: item.status,
    statusLabel: item.statusLabel || item.status,
    approver: item.approver,
    approveTime: item.approve_time,
    remarks: item.remarks,
    createTime: item.create_time,
    updateTime: item.update_time,
  }));

  return {
    records,
    pagination: response.meta || { page: 1, limit: 50, total: 0 },
  };
}

/**
 * 获取单个离职记录
 */
export async function getResignationById(id: string): Promise<ResignationRecord | null> {
  const response = await enhancedApiClient.get<any>(`/resignation/${id}`);

  if (!response.data) return null;

  const item = response.data;
  return {
    id: item.id,
    resignationCode: item.resignation_code,
    workerId: item.worker_id,
    workerName: item.worker_name,
    department: item.department,
    position: item.position,
    resignationType: item.resignation_type,
    reason: item.reason,
    expectedLastDay: item.expected_last_day,
    actualLastDay: item.actual_last_day,
    handoverUserId: item.handover_user_id,
    handoverUserName: item.handover_user_name,
    handoverNote: item.handover_note,
    status: item.status,
    statusLabel: item.statusLabel || item.status,
    approver: item.approver,
    approveTime: item.approve_time,
    remarks: item.remarks,
    createTime: item.create_time,
    updateTime: item.update_time,
  };
}

/**
 * 创建离职记录
 */
export async function createResignationRecord(resignation: CreateResignationParams): Promise<ResignationRecord> {
  const snakeData = {
    worker_id: resignation.workerId,
    worker_name: resignation.workerName,
    department: resignation.department,
    position: resignation.position,
    resignation_type: resignation.resignationType,
    reason: resignation.reason,
    expected_last_day: resignation.expectedLastDay,
    handover_user_id: resignation.handoverUserId,
    handover_user_name: resignation.handoverUserName,
    handover_note: resignation.handoverNote,
    remarks: resignation.remarks,
  };

  const response = await enhancedApiClient.post<any>('/resignation', snakeData);

  return {
    ...resignation,
    id: response.data?.id || `RSG${Date.now()}`,
    resignationCode: response.data?.resignation_code || `RSG-${Date.now()}`,
    status: 'pending',
    statusLabel: '待审批',
    createTime: new Date().toISOString(),
  };
}

/**
 * 更新离职记录
 */
export async function updateResignationRecord(id: string, updates: UpdateResignationParams): Promise<boolean> {
  const snakeData: Record<string, any> = {};
  if (updates.resignationType) snakeData.resignation_type = updates.resignationType;
  if (updates.reason) snakeData.reason = updates.reason;
  if (updates.expectedLastDay) snakeData.expected_last_day = updates.expectedLastDay;
  if (updates.actualLastDay) snakeData.actual_last_day = updates.actualLastDay;
  if (updates.handoverUserId) snakeData.handover_user_id = updates.handoverUserId;
  if (updates.handoverUserName) snakeData.handover_user_name = updates.handoverUserName;
  if (updates.handoverNote) snakeData.handover_note = updates.handoverNote;
  if (updates.status) snakeData.status = updates.status;
  if (updates.remarks !== undefined) snakeData.remarks = updates.remarks;

  await enhancedApiClient.put(`/resignation/${id}`, snakeData);

  return true;
}

/**
 * 删除离职记录
 */
export async function deleteResignationRecord(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/resignation/${id}`);
  return true;
}

/**
 * 复职操作
 */
export async function rejoinWorker(workerId: string, rejoinDate: string): Promise<boolean> {
  await enhancedApiClient.post(
    `/labor/workers/${workerId}/rejoin`,
    { rejoin_date: rejoinDate }
  );
  return true;
}
