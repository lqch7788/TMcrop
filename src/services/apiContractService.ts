/**
 * 合同管理 API 服务
 * 对接后端 /api/contracts
 *
 * 数据流：API → enhancedApiClient → 组件（无缓存层，V2.1 铁律）
 *
 * 2026-06-27 P0：替代原 useContractStore 的 mock 模式，保证数据进后端 SQLite
 */

import { enhancedApiClient } from '../lib/apiClient';

/** 合同类型 */
export type ContractType = '劳动合同' | '实习协议' | '劳务合同';

/** 合同状态 */
export type ContractStatus = '生效中' | '即将到期' | '已到期' | '已终止';

/** 合同记录（camelCase，后端响应已被 camelCase 中间件转换） */
export interface ContractData {
  id: string;
  contractCode: string;
  staffId: string;
  staffName: string;
  idCard?: string;
  contractType: ContractType;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  monthlySalary?: number;
  dailyWage?: number;
  hourlyWage?: number;
  signingDate?: string;
  attachments?: string[];
  remarks?: string;
  createTime: string;
  updateTime?: string;
}

export interface CreateContractParams {
  staffId: string;
  staffName: string;
  idCard?: string;
  contractType: ContractType;
  startDate: string;
  endDate: string;
  monthlySalary?: number;
  dailyWage?: number;
  hourlyWage?: number;
  signingDate?: string;
  remarks?: string;
  attachments?: string[];
}

export interface UpdateContractParams {
  staffId?: string;
  staffName?: string;
  idCard?: string;
  contractType?: ContractType;
  startDate?: string;
  endDate?: string;
  status?: ContractStatus;
  monthlySalary?: number;
  dailyWage?: number;
  hourlyWage?: number;
  signingDate?: string;
  remarks?: string;
  attachments?: string[];
}

export interface ContractListResponse {
  records: ContractData[];
  pagination: { page: number; limit: number; total: number };
}

/**
 * 获取合同列表
 */
export async function getContracts(
  filters?: { status?: string; contractType?: string; keyword?: string },
  pagination?: { page?: number; limit?: number }
): Promise<ContractListResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.contractType) params.set('contractType', filters.contractType);
  if (filters?.keyword) params.set('keyword', filters.keyword);
  if (pagination?.page) params.set('page', String(pagination.page));
  if (pagination?.limit) params.set('limit', String(pagination.limit));

  const url = `/contracts${params.toString() ? '?' + params.toString() : ''}`;
  // enhancedApiClient 已自动解包 data 字段
  const response = await enhancedApiClient.get<any>(url);

  // 兼容两种响应格式：{success, data, total} 或 {records, pagination}
  const data: any[] = Array.isArray(response) ? response : (response.data || []);
  const total = response.total ?? data.length;

  return {
    records: data as ContractData[],
    pagination: { page: pagination?.page || 1, limit: pagination?.limit || 50, total },
  };
}

/**
 * 获取单个合同
 */
export async function getContractById(id: string): Promise<ContractData | null> {
  const response = await enhancedApiClient.get<any>(`/contracts/${id}`);
  const data = Array.isArray(response) ? response[0] : response.data || response;
  return (data as ContractData) || null;
}

/**
 * 新建合同
 */
export async function createContract(params: CreateContractParams): Promise<ContractData> {
  const response = await enhancedApiClient.post<any>('/contracts', params);
  const data = Array.isArray(response) ? response[0] : response.data || response;
  return data as ContractData;
}

/**
 * 更新合同
 */
export async function updateContract(id: string, updates: UpdateContractParams): Promise<ContractData> {
  const response = await enhancedApiClient.put<any>(`/contracts/${id}`, updates);
  const data = Array.isArray(response) ? response[0] : response.data || response;
  return data as ContractData;
}

/**
 * 删除合同（软删）
 */
export async function deleteContract(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/contracts/${id}`);
  return true;
}

/**
 * 批量删除合同
 */
export async function deleteContracts(ids: string[]): Promise<boolean> {
  await Promise.all(ids.map((id) => enhancedApiClient.delete(`/contracts/${id}`)));
  return true;
}