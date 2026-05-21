/**
 * 工资预算管理 API 服务
 * 对接后端 /api/salary-budget
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';

/**
 * 工资预算记录类型
 */
export interface SalaryBudgetRecord {
  id: string;
  budgetCode: string;
  deptId: string;
  deptName: string;
  budgetMonth: string;
  totalBaseSalary: number;
  totalOvertimePay: number;
  totalBonus: number;
  grandTotal: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  statusLabel: string;
  applicantId: string;
  applicantName: string;
  applyDate: string;
  remark?: string;
  createTime: string;
  updateTime?: string;
}

/**
 * 创建工资预算记录参数
 */
export interface CreateSalaryBudgetParams {
  deptId: string;
  deptName: string;
  budgetMonth: string;
  totalBaseSalary: number;
  totalOvertimePay: number;
  totalBonus: number;
  remark?: string;
  applicantId: string;
  applicantName: string;
}

/**
 * 更新工资预算记录参数
 */
export interface UpdateSalaryBudgetParams {
  deptId?: string;
  deptName?: string;
  budgetMonth?: string;
  totalBaseSalary?: number;
  totalOvertimePay?: number;
  totalBonus?: number;
  remark?: string;
  status?: string;
}

/**
 * 获取工资预算记录列表
 */
export async function getSalaryBudgetRecords(
  filters?: {
    deptId?: string;
    budgetMonth?: string;
    status?: string;
  },
  pagination?: { page?: number; limit?: number }
): Promise<{ records: SalaryBudgetRecord[]; pagination: { page: number; limit: number; total: number } }> {
  const params: Record<string, string> = {};
  if (filters?.deptId) params.dept_id = filters.deptId;
  if (filters?.budgetMonth) params.budget_month = filters.budgetMonth;
  if (filters?.status) params.status = filters.status;
  if (pagination?.page) params.page = String(pagination.page);
  if (pagination?.limit) params.limit = String(pagination.limit);

  const paramsStr = new URLSearchParams(params).toString();
  const url = paramsStr ? `/salary-budget?${paramsStr}` : '/salary-budget';
  const response = await enhancedApiClient.get<any>(url);

  // 转换后端数据格式为前端格式
  const records: SalaryBudgetRecord[] = (response.data || []).map((item: any) => ({
    id: item.id,
    budgetCode: item.budget_code,
    deptId: item.dept_id,
    deptName: item.dept_name,
    budgetMonth: item.budget_month,
    totalBaseSalary: item.total_base_salary,
    totalOvertimePay: item.total_overtime_pay,
    totalBonus: item.total_bonus,
    grandTotal: item.grand_total,
    status: item.status,
    statusLabel: item.statusLabel || item.status,
    applicantId: item.applicant_id,
    applicantName: item.applicant_name,
    applyDate: item.apply_date,
    remark: item.remark,
    createTime: item.create_time,
    updateTime: item.update_time,
  }));

  return {
    records,
    pagination: response.meta || { page: 1, limit: 50, total: 0 },
  };
}

/**
 * 获取单个工资预算记录
 */
export async function getSalaryBudgetById(id: string): Promise<SalaryBudgetRecord | null> {
  const response = await enhancedApiClient.get<any>(`/salary-budget/${id}`);

  if (!response.data) return null;

  const item = response.data;
  return {
    id: item.id,
    budgetCode: item.budget_code,
    deptId: item.dept_id,
    deptName: item.dept_name,
    budgetMonth: item.budget_month,
    totalBaseSalary: item.total_base_salary,
    totalOvertimePay: item.total_overtime_pay,
    totalBonus: item.total_bonus,
    grandTotal: item.grand_total,
    status: item.status,
    statusLabel: item.statusLabel || item.status,
    applicantId: item.applicant_id,
    applicantName: item.applicant_name,
    applyDate: item.apply_date,
    remark: item.remark,
    createTime: item.create_time,
    updateTime: item.update_time,
  };
}

/**
 * 创建工资预算记录
 */
export async function createSalaryBudgetRecord(budget: CreateSalaryBudgetParams): Promise<SalaryBudgetRecord> {
  const grandTotal = budget.totalBaseSalary + budget.totalOvertimePay + budget.totalBonus;

  const snakeData = {
    dept_id: budget.deptId,
    dept_name: budget.deptName,
    budget_month: budget.budgetMonth,
    total_base_salary: budget.totalBaseSalary,
    total_overtime_pay: budget.totalOvertimePay,
    total_bonus: budget.totalBonus,
    remark: budget.remark,
    applicant_id: budget.applicantId,
    applicant_name: budget.applicantName,
  };

  const response = await enhancedApiClient.post<any>('/salary-budget', snakeData);

  return {
    ...budget,
    grandTotal,
    id: response.data?.id || `SB${Date.now()}`,
    budgetCode: response.data?.budget_code || `SB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    status: 'pending',
    statusLabel: '待审批',
    applyDate: new Date().toISOString().slice(0, 10),
    createTime: new Date().toISOString(),
  };
}

/**
 * 更新工资预算记录
 */
export async function updateSalaryBudgetRecord(id: string, updates: UpdateSalaryBudgetParams): Promise<boolean> {
  const snakeData: Record<string, any> = {};
  if (updates.deptId) snakeData.dept_id = updates.deptId;
  if (updates.deptName) snakeData.dept_name = updates.deptName;
  if (updates.budgetMonth) snakeData.budget_month = updates.budgetMonth;
  if (updates.totalBaseSalary !== undefined) snakeData.total_base_salary = updates.totalBaseSalary;
  if (updates.totalOvertimePay !== undefined) snakeData.total_overtime_pay = updates.totalOvertimePay;
  if (updates.totalBonus !== undefined) snakeData.total_bonus = updates.totalBonus;
  if (updates.remark !== undefined) snakeData.remark = updates.remark;
  if (updates.status) snakeData.status = updates.status;

  await enhancedApiClient.put(`/salary-budget/${id}`, snakeData);

  return true;
}

/**
 * 删除工资预算记录
 */
export async function deleteSalaryBudgetRecord(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/salary-budget/${id}`);
  return true;
}
