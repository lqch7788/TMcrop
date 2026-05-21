/**
 * 生产退料 API 服务
 * 对接后端 /api/material-returns
 */
import { enhancedApiClient } from '../lib/apiClient';

export interface MaterialReturnRecord {
  id: string | number;
  code: string;
  date: string;
  type: string;
  applicant: string;
  department: string;
  warehouseLocation: string;
  status: string;
  statusClass: string;
  remark?: string;
  operator?: string;
  reviewer?: string;
  reviewDate?: string;
  rejectReason?: string;
  materials: MaterialReturnItem[];
  createBy?: string;
  createTime?: string;
  updateTime?: string;
}

export interface MaterialReturnItem {
  sourceApplicationCode: string;
  materialCode: string;
  category: string;
  materialName: string;
  spec: string;
  unit: string;
  returnQuantity: number;
  unitPrice: number;
  warehousePosition: string;
  reason: string;
  remark: string;
}

/** 获取退料列表 */
export async function getMaterialReturns(params?: Record<string, string>): Promise<MaterialReturnRecord[]> {
  let url = '/material-returns';
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }
  const resp = await enhancedApiClient.get<MaterialReturnRecord[]>(url);
  if (resp?.data) return resp.data;
  if (resp?.success && resp?.data) return resp.data;
  return Array.isArray(resp) ? resp : [];
}

/** 创建退料记录 */
export async function createMaterialReturn(data: Omit<MaterialReturnRecord, 'id'>): Promise<MaterialReturnRecord | null> {
  const result = await enhancedApiClient.post<MaterialReturnRecord>('/material-returns', data);
  return result?.data || result;
}

/** 更新退料记录 */
export async function updateMaterialReturn(id: string | number, updates: Partial<MaterialReturnRecord>): Promise<boolean> {
  await enhancedApiClient.put(`/material-returns/${id}`, updates);
  return true;
}

/** 删除退料记录 */
export async function deleteMaterialReturn(id: string | number): Promise<boolean> {
  await enhancedApiClient.delete(`/material-returns/${id}`);
  return true;
}

/** 批量删除退料记录 */
export async function deleteMaterialReturns(ids: (string | number)[]): Promise<boolean> {
  const results = await Promise.all(ids.map(id => deleteMaterialReturn(id)));
  return results.every(Boolean);
}
