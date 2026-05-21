/**
 * 合同续签管理 API 服务
 * 对接后端 /api/contract-renewal
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';

/**
 * 合同续签记录类型
 */
export interface ContractRenewalRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department?: string;
  position?: string;
  currentContractEnd: string;
  newContractStart: string;
  newContractEnd: string;
  renewalPeriod: number;
  newSalary?: number;
  termsChange?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  statusLabel: string;
  approver?: string;
  approveTime?: string;
  remarks?: string;
  createTime: string;
  updateTime?: string;
}

/**
 * 创建合同续签记录参数
 */
export interface CreateContractRenewalParams {
  employeeId: string;
  employeeName: string;
  department?: string;
  position?: string;
  currentContractEnd: string;
  newContractStart: string;
  newContractEnd: string;
  renewalPeriod: number;
  newSalary?: number;
  termsChange?: string;
  remarks?: string;
}

/**
 * 更新合同续签记录参数
 */
export interface UpdateContractRenewalParams {
  newContractStart?: string;
  newContractEnd?: string;
  renewalPeriod?: number;
  newSalary?: number;
  termsChange?: string;
  status?: string;
  remarks?: string;
}

/**
 * 获取合同续签记录列表
 */
export async function getContractRenewalRecords(
  filters?: {
    employeeName?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  },
  pagination?: { page?: number; limit?: number }
): Promise<{ records: ContractRenewalRecord[]; pagination: { page: number; limit: number; total: number } }> {
  const queryParams = new URLSearchParams();
  if (filters?.employeeName) queryParams.set('employee_name', filters.employeeName);
  if (filters?.department) queryParams.set('department', filters.department);
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.startDate) queryParams.set('start_date', filters.startDate);
  if (filters?.endDate) queryParams.set('end_date', filters.endDate);
  if (pagination?.page) queryParams.set('page', String(pagination.page));
  if (pagination?.limit) queryParams.set('limit', String(pagination.limit));

  const url = `/contract-renewal${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await enhancedApiClient.get<any>(url);

  // 转换后端数据格式为前端格式
  const records: ContractRenewalRecord[] = (response.data || []).map((item: any) => ({
    id: item.id,
    employeeId: item.employee_id,
    employeeName: item.employee_name,
    department: item.department,
    position: item.position,
    currentContractEnd: item.current_contract_end,
    newContractStart: item.new_contract_start,
    newContractEnd: item.new_contract_end,
    renewalPeriod: item.renewal_period,
    newSalary: item.new_salary,
    termsChange: item.terms_change,
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
 * 获取单个合同续签记录
 */
export async function getContractRenewalById(id: string): Promise<ContractRenewalRecord | null> {
  const response = await enhancedApiClient.get<any>(`/contract-renewal/${id}`);

  if (!response.data) return null;

  const item = response.data;
  return {
    id: item.id,
    employeeId: item.employee_id,
    employeeName: item.employee_name,
    department: item.department,
    position: item.position,
    currentContractEnd: item.current_contract_end,
    newContractStart: item.new_contract_start,
    newContractEnd: item.new_contract_end,
    renewalPeriod: item.renewal_period,
    newSalary: item.new_salary,
    termsChange: item.terms_change,
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
 * 创建合同续签记录
 */
export async function createContractRenewalRecord(renewal: CreateContractRenewalParams): Promise<ContractRenewalRecord> {
  const snakeData = {
    employee_id: renewal.employeeId,
    employee_name: renewal.employeeName,
    department: renewal.department,
    position: renewal.position,
    current_contract_end: renewal.currentContractEnd,
    new_contract_start: renewal.newContractStart,
    new_contract_end: renewal.newContractEnd,
    renewal_period: renewal.renewalPeriod,
    new_salary: renewal.newSalary,
    terms_change: renewal.termsChange,
    remarks: renewal.remarks,
  };

  const response = await enhancedApiClient.post<any>('/contract-renewal', snakeData);

  return {
    ...renewal,
    id: response.data?.id || `CR${Date.now()}`,
    status: 'pending',
    statusLabel: '待审批',
    createTime: new Date().toISOString(),
  };
}

/**
 * 更新合同续签记录
 */
export async function updateContractRenewalRecord(id: string, updates: UpdateContractRenewalParams): Promise<boolean> {
  const snakeData: Record<string, any> = {};
  if (updates.newContractStart) snakeData.new_contract_start = updates.newContractStart;
  if (updates.newContractEnd) snakeData.new_contract_end = updates.newContractEnd;
  if (updates.renewalPeriod !== undefined) snakeData.renewal_period = updates.renewalPeriod;
  if (updates.newSalary !== undefined) snakeData.new_salary = updates.newSalary;
  if (updates.termsChange !== undefined) snakeData.terms_change = updates.termsChange;
  if (updates.status) snakeData.status = updates.status;
  if (updates.remarks !== undefined) snakeData.remarks = updates.remarks;

  await enhancedApiClient.put(`/contract-renewal/${id}`, snakeData);

  return true;
}

/**
 * 删除合同续签记录
 */
export async function deleteContractRenewalRecord(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/contract-renewal/${id}`);
  return true;
}
