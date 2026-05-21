/**
 * 调薪申请 API 服务
 * 对接后端 /api/salary_adjustment (如后端无此接口则返回空数据)
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';

/**
 * 调薪记录类型
 */
export interface SalaryAdjustmentRecord {
  id: string;
  workerId: string;
  workerName: string;
  department: string;
  position: string;
  currentSalary: number;
  proposedSalary: number;
  adjustmentAmount: number;
  adjustmentRatio: number;
  adjustmentType: string;
  effectiveDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  statusLabel: '待审批' | '已通过' | '已拒绝' | '已取消';
  approver?: string;
  approveTime?: string;
  remarks?: string;
  createTime?: string;
  updateTime?: string;
}

/**
 * 创建调薪记录参数
 */
export interface CreateSalaryAdjustmentParams {
  workerId: string;
  workerName: string;
  department: string;
  position: string;
  currentSalary: number;
  proposedSalary: number;
  adjustmentType: string;
  effectiveDate: string;
  reason: string;
  remarks?: string;
}

/**
 * 更新调薪记录参数
 */
export interface UpdateSalaryAdjustmentParams {
  currentSalary?: number;
  proposedSalary?: number;
  adjustmentType?: string;
  effectiveDate?: string;
  reason?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  remarks?: string;
}

/**
 * 获取调薪记录列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getSalaryAdjustmentRecords(
  filters?: { status?: string; keyword?: string; department?: string },
  pagination?: { page?: number; limit?: number }
): Promise<{ records: SalaryAdjustmentRecord[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.keyword) params.keyword = filters.keyword;
  if (filters?.department) params.department = filters.department;
  if (pagination?.page) params.page = String(pagination.page);
  if (pagination?.limit) params.limit = String(pagination.limit);

  try {
    const paramsStr = new URLSearchParams(params).toString();
    const url = paramsStr ? `/salary_adjustment?${paramsStr}` : '/salary_adjustment';
    return await enhancedApiClient.get(url);
  } catch (error) {
    // 后端无此接口时返回空数据
    console.warn('调薪记录 API 不可用，返回空数据:', error);
    return {
      records: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

/**
 * 获取单个调薪记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getSalaryAdjustmentById(id: string): Promise<SalaryAdjustmentRecord | null> {
  try {
    return await enhancedApiClient.get<SalaryAdjustmentRecord>(`/salary_adjustment/${id}`);
  } catch (error) {
    console.warn('调薪记录详情 API 不可用:', error);
    return null;
  }
}

/**
 * 创建调薪记录
 * 降级策略：API → 离线队列
 */
export async function createSalaryAdjustmentRecord(record: CreateSalaryAdjustmentParams): Promise<SalaryAdjustmentRecord> {
  try {
    return await enhancedApiClient.post<SalaryAdjustmentRecord>('/salary_adjustment', record);
  } catch (error) {
    // 离线模式下创建本地记录
    console.warn('调薪记录创建 API 不可用，使用本地记录:', error);
    const localRecord: SalaryAdjustmentRecord = {
      id: `SA-${Date.now()}`,
      workerId: record.workerId,
      workerName: record.workerName,
      department: record.department,
      position: record.position,
      currentSalary: record.currentSalary,
      proposedSalary: record.proposedSalary,
      adjustmentAmount: record.proposedSalary - record.currentSalary,
      adjustmentRatio: record.currentSalary > 0
        ? ((record.proposedSalary - record.currentSalary) / record.currentSalary) * 100
        : 0,
      adjustmentType: record.adjustmentType,
      effectiveDate: record.effectiveDate,
      reason: record.reason,
      status: 'pending',
      statusLabel: '待审批',
      remarks: record.remarks,
      createTime: new Date().toISOString(),
    };
    return localRecord;
  }
}

/**
 * 更新调薪记录
 * 降级策略：API → 离线队列
 */
export async function updateSalaryAdjustmentRecord(id: string, updates: UpdateSalaryAdjustmentParams): Promise<SalaryAdjustmentRecord | null> {
  try {
    const result = await enhancedApiClient.put<{ id: string }>(`/salary_adjustment/${id}`, updates);
    return result ? { ...updates, id } as SalaryAdjustmentRecord : null;
  } catch (error) {
    console.warn('调薪记录更新 API 不可用:', error);
    return null;
  }
}

/**
 * 删除调薪记录
 * 降级策略：API → 离线队列
 */
export async function deleteSalaryAdjustmentRecord(id: string): Promise<boolean> {
  try {
    await enhancedApiClient.delete(`/salary_adjustment/${id}`);
    return true;
  } catch (error) {
    console.warn('调薪记录删除 API 不可用:', error);
    return false;
  }
}

/**
 * 批量删除调薪记录
 * 降级策略：API → 离线队列
 */
export async function deleteSalaryAdjustmentRecords(ids: string[]): Promise<boolean> {
  try {
    await enhancedApiClient.post('/salary_adjustment/batch-delete', { ids });
    return true;
  } catch (error) {
    console.warn('调薪记录批量删除 API 不可用:', error);
    return false;
  }
}

/**
 * 更新调薪状态
 * 降级策略：API → 离线队列
 */
export async function updateSalaryAdjustmentStatus(id: string, status: 'approved' | 'rejected'): Promise<boolean> {
  try {
    await enhancedApiClient.post(`/salary_adjustment/${id}/status`, { status });
    return true;
  } catch (error) {
    console.warn('调薪状态更新 API 不可用:', error);
    return false;
  }
}
