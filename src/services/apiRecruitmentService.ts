/**
 * 招聘管理 API 服务
 * 对接后端 /api/recruitment
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';

/**
 * 招聘记录类型
 */
export interface RecruitmentRecord {
  id: string;
  recruitmentCode: string;
  deptId: string;
  deptName: string;
  positionId: string;
  position: string;
  headcount: number;
  employmentType: string;
  salaryMin: number;
  salaryMax: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  priorityLabel: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  statusLabel: string;
  reason: string;
  remarks?: string;
  applicantId: string;
  applicantName: string;
  applyDate: string;
  approveTime?: string;
  approver?: string;
  createTime?: string;
  updateTime?: string;
}

/**
 * 创建招聘申请参数
 */
export interface CreateRecruitmentParams {
  deptId: string;
  deptName: string;
  positionId: string;
  position: string;
  headcount: number;
  employmentType: string;
  salaryMin: number;
  salaryMax: number;
  priority: string;
  reason: string;
  remarks?: string;
  applicantId: string;
  applicantName: string;
}

/**
 * 更新招聘申请参数
 */
export interface UpdateRecruitmentParams {
  deptId?: string;
  deptName?: string;
  positionId?: string;
  position?: string;
  headcount?: number;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  priority?: string;
  reason?: string;
  remarks?: string;
  status?: string;
}

/**
 * 获取招聘申请列表
 */
export async function getRecruitmentRecords(
  filters?: {
    recruitmentCode?: string;
    deptId?: string;
    position?: string;
    status?: string;
    priority?: string;
  },
  pagination?: { page?: number; limit?: number }
): Promise<{ records: RecruitmentRecord[]; pagination: { page: number; limit: number; total: number } }> {
  const params: Record<string, string> = {};
  if (filters?.recruitmentCode) params.recruitment_code = filters.recruitmentCode;
  if (filters?.deptId) params.dept_id = filters.deptId;
  if (filters?.position) params.position = filters.position;
  if (filters?.status) params.status = filters.status;
  if (filters?.priority) params.priority = filters.priority;
  if (pagination?.page) params.page = String(pagination.page);
  if (pagination?.limit) params.limit = String(pagination.limit);

  const paramsStr = new URLSearchParams(params).toString();
  const url = paramsStr ? `/recruitment?${paramsStr}` : '/recruitment';
  const response = await enhancedApiClient.get<any>(url);

  // 转换后端数据格式为前端格式
  const records: RecruitmentRecord[] = (response.data || []).map((item: any) => ({
    id: item.id,
    recruitmentCode: item.recruitment_code,
    deptId: item.dept_id,
    deptName: item.dept_name,
    positionId: item.position_id,
    position: item.position,
    headcount: item.headcount,
    employmentType: item.employment_type,
    salaryMin: item.salary_min,
    salaryMax: item.salary_max,
    priority: item.priority,
    priorityLabel: item.priorityLabel || item.priority,
    status: item.status,
    statusLabel: item.statusLabel || item.status,
    reason: item.reason,
    remarks: item.remarks,
    applicantId: item.applicant_id,
    applicantName: item.applicant_name,
    applyDate: item.apply_date,
    approveTime: item.approve_time,
    approver: item.approver,
    createTime: item.create_time,
    updateTime: item.update_time,
  }));

  return {
    records,
    pagination: response.meta || { page: 1, limit: 50, total: 0 },
  };
}

/**
 * 获取单个招聘申请
 */
export async function getRecruitmentById(id: string): Promise<RecruitmentRecord | null> {
  const response = await enhancedApiClient.get<any>(`/recruitment/${id}`);

  if (!response.data) return null;

  const item = response.data;
  return {
    id: item.id,
    recruitmentCode: item.recruitment_code,
    deptId: item.dept_id,
    deptName: item.dept_name,
    positionId: item.position_id,
    position: item.position,
    headcount: item.headcount,
    employmentType: item.employment_type,
    salaryMin: item.salary_min,
    salaryMax: item.salary_max,
    priority: item.priority,
    priorityLabel: item.priorityLabel || item.priority,
    status: item.status,
    statusLabel: item.statusLabel || item.status,
    reason: item.reason,
    remarks: item.remarks,
    applicantId: item.applicant_id,
    applicantName: item.applicant_name,
    applyDate: item.apply_date,
    approveTime: item.approve_time,
    approver: item.approver,
    createTime: item.create_time,
    updateTime: item.update_time,
  };
}

/**
 * 创建招聘申请
 */
export async function createRecruitmentRecord(recruitment: CreateRecruitmentParams): Promise<RecruitmentRecord> {
  const snakeData = {
    dept_id: recruitment.deptId,
    dept_name: recruitment.deptName,
    position_id: recruitment.positionId,
    position: recruitment.position,
    headcount: recruitment.headcount,
    employment_type: recruitment.employmentType,
    salary_min: recruitment.salaryMin,
    salary_max: recruitment.salaryMax,
    priority: recruitment.priority,
    reason: recruitment.reason,
    remarks: recruitment.remarks,
    applicant_id: recruitment.applicantId,
    applicant_name: recruitment.applicantName,
    apply_date: new Date().toISOString().slice(0, 10),
  };

  const response = await enhancedApiClient.post<any>('/recruitment', snakeData);

  return {
    ...recruitment,
    id: response.data?.id || `REC${Date.now()}`,
    recruitmentCode: response.data?.recruitment_code || `ZP${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    priorityLabel: recruitment.priority === 'urgent' ? '紧急' :
                   recruitment.priority === 'high' ? '高' :
                   recruitment.priority === 'low' ? '低' : '普通',
    status: 'pending',
    statusLabel: '待审批',
    applyDate: new Date().toISOString().slice(0, 10),
  };
}

/**
 * 更新招聘申请
 */
export async function updateRecruitmentRecord(id: string, updates: UpdateRecruitmentParams): Promise<boolean> {
  const snakeData: Record<string, any> = {};
  if (updates.deptId) snakeData.dept_id = updates.deptId;
  if (updates.deptName) snakeData.dept_name = updates.deptName;
  if (updates.positionId) snakeData.position_id = updates.positionId;
  if (updates.position) snakeData.position = updates.position;
  if (updates.headcount !== undefined) snakeData.headcount = updates.headcount;
  if (updates.employmentType) snakeData.employment_type = updates.employmentType;
  if (updates.salaryMin !== undefined) snakeData.salary_min = updates.salaryMin;
  if (updates.salaryMax !== undefined) snakeData.salary_max = updates.salaryMax;
  if (updates.priority) snakeData.priority = updates.priority;
  if (updates.reason) snakeData.reason = updates.reason;
  if (updates.remarks !== undefined) snakeData.remarks = updates.remarks;
  if (updates.status) snakeData.status = updates.status;

  await enhancedApiClient.put(`/recruitment/${id}`, snakeData);

  return true;
}

/**
 * 删除招聘申请
 */
export async function deleteRecruitmentRecord(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/recruitment/${id}`);
  return true;
}
