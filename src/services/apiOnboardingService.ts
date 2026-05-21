/**
 * 入职管理 API 服务
 * 对接后端 /api/onboarding
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';

/**
 * 入职进度步骤
 */
export interface OnboardingProgressStep {
  step: number;
  name: string;
  status: 'pending' | 'processing' | 'completed';
  completedAt?: string;
}

/**
 * 入职记录类型
 */
export interface OnboardingRecord {
  id: string;
  oid: string;
  name: string;
  idCard: string;
  phone: string;
  position: string;
  department: string;
  departmentOid: string;
  contractType: string;
  dailyWage?: number;
  hourlyWage?: number;
  joinDate: string;
  status: '待入职' | '办理中' | '已入职';
  progress: OnboardingProgressStep[];
  requestCode?: string;
  recruitmentId?: string;
  operatorId?: string;
  operatorName?: string;
  approvedAt?: string;
  remarks?: string;
  createTime?: string;
  updateTime?: string;
}

/**
 * 创建入职记录参数
 */
export interface CreateOnboardingParams {
  name: string;
  idCard?: string;
  phone?: string;
  position?: string;
  department?: string;
  departmentOid?: string;
  contractType?: string;
  dailyWage?: number;
  hourlyWage?: number;
  joinDate: string;
  requestCode?: string;
  recruitmentId?: string;
  operatorId?: string;
  operatorName?: string;
  remarks?: string;
}

/**
 * 更新入职记录参数
 */
export interface UpdateOnboardingParams {
  name?: string;
  idCard?: string;
  phone?: string;
  position?: string;
  department?: string;
  departmentOid?: string;
  contractType?: string;
  dailyWage?: number;
  hourlyWage?: number;
  joinDate?: string;
  status?: '待入职' | '办理中' | '已入职';
  operatorId?: string;
  operatorName?: string;
  remarks?: string;
}

/**
 * 更新状态参数
 */
export interface UpdateStatusParams {
  status: '办理中' | '已入职';
  operatorId?: string;
  operatorName?: string;
}

/**
 * 获取入职记录列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getOnboardingRecords(
  filters?: { status?: string; keyword?: string },
  pagination?: { page?: number; limit?: number }
): Promise<{ records: OnboardingRecord[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.keyword) params.keyword = filters.keyword;
  if (pagination?.page) params.page = String(pagination.page);
  if (pagination?.limit) params.limit = String(pagination.limit);

  const paramsStr = new URLSearchParams(params).toString();
  const url = paramsStr ? `/onboarding?${paramsStr}` : '/onboarding';
  return await enhancedApiClient.get(url);
}

/**
 * 获取单个入职记录
 * 降级策略：API → IndexedDB 缓存
 */
export async function getOnboardingById(id: string): Promise<OnboardingRecord | null> {
  return await enhancedApiClient.get<OnboardingRecord>(`/onboarding/${id}`);
}

/**
 * 创建入职记录
 * 降级策略：API → 离线队列
 */
export async function createOnboardingRecord(record: CreateOnboardingParams): Promise<OnboardingRecord> {
  return await enhancedApiClient.post<OnboardingRecord>('/onboarding', record);
}

/**
 * 更新入职记录
 * 降级策略：API → 离线队列
 */
export async function updateOnboardingRecord(id: string, updates: UpdateOnboardingParams): Promise<OnboardingRecord | null> {
  const result = await enhancedApiClient.put<{ id: string }>(`/onboarding/${id}`, updates);
  return result ? { ...updates, id } as OnboardingRecord : null;
}

/**
 * 删除入职记录
 * 降级策略：API → 离线队列
 */
export async function deleteOnboardingRecord(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/onboarding/${id}`);
  return true;
}

/**
 * 批量删除入职记录
 * 降级策略：API → 离线队列
 */
export async function deleteOnboardingRecords(ids: string[]): Promise<boolean> {
  await enhancedApiClient.post('/onboarding/batch-delete', { ids });
  return true;
}

/**
 * 更新入职状态
 * 降级策略：API → 离线队列
 */
export async function updateOnboardingStatus(id: string, params: UpdateStatusParams): Promise<boolean> {
  await enhancedApiClient.post(`/onboarding/${id}/status`, params);
  return true;
}
