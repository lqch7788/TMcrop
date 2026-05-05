/**
 * 成本管理 API 服务
 * 对接后端 /api/material-costs 和 /api/summary/cost-stats
 */

import { apiClient } from './apiClient';

// ========== 类型定义 ==========

export interface MaterialCost {
  id: string;
  cost_code: string;
  cost_type: string;
  cost_type_label?: string;
  cost_name: string;
  category?: string;
  batch_id?: string;
  batch_code?: string;
  greenhouse_id?: string;
  greenhouse_name?: string;
  crop_name?: string;
  material_name?: string;
  material_type?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  cost_date: string;
  supplier_id?: string;
  supplier_name?: string;
  remarks?: string;
  create_by?: string;
  create_time: string;
  update_time: string;
}

export interface EnergyCost {
  id: string;
  cost_code: string;
  cost_type: string;
  cost_type_label?: string;
  greenhouse_id?: string;
  greenhouse_name?: string;
  batch_id?: string;
  batch_code?: string;
  crop_name?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  total_amount: number;
  cost_date: string;
  meter_start?: number;
  meter_end?: number;
  remarks?: string;
  create_by?: string;
  supplier_id?: string;
  supplier_name?: string;
  create_time: string;
  update_time: string;
}

export interface CostStats {
  labor: Array<{
    costCategory: string;
    costType: string;
    month: string;
    workHours: number;
    totalAmount: number;
    workerCount: number;
  }>;
  material: Array<{
    costCategory: string;
    costType: string;
    costTypeCode: string;
    costName?: string;
    month: string;
    totalQuantity: number;
    totalAmount: number;
    recordCount: number;
  }>;
  energy: Array<{
    costCategory: string;
    costType: string;
    costTypeCode: string;
    month: string;
    totalQuantity: number;
    totalAmount: number;
    recordCount: number;
  }>;
}

export interface CostStatsSummary {
  total_labor_cost: number;
  total_material_cost: number;
  total_energy_cost: number;
  total_cost: number;
  total_work_hours: number;
  avg_hourly_rate: number;
}

// ========== 物料成本 API ==========

/**
 * 获取物料成本列表
 */
export async function getMaterialCosts(params?: {
  cost_type?: string;
  batch_code?: string;
  greenhouse_name?: string;
  crop_name?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: MaterialCost[]; meta: { total: number; page: number; limit: number } }> {
  const queryParams: Record<string, string> = {};
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams[key] = String(value);
      }
    });
  }
  return apiClient.get('/material-costs', queryParams);
}

/**
 * 获取物料成本详情
 */
export async function getMaterialCostById(id: string): Promise<MaterialCost> {
  return apiClient.get(`/material-costs/${id}`);
}

/**
 * 创建物料成本
 */
export async function createMaterialCost(data: Partial<MaterialCost>): Promise<{ id: string }> {
  return apiClient.post('/material-costs', data);
}

/**
 * 更新物料成本
 */
export async function updateMaterialCost(id: string, data: Partial<MaterialCost>): Promise<{ id: string }> {
  return apiClient.put(`/material-costs/${id}`, data);
}

/**
 * 删除物料成本
 */
export async function deleteMaterialCost(id: string): Promise<{ id: string }> {
  return apiClient.delete(`/material-costs/${id}`);
}

// ========== 能源成本 API ==========

/**
 * 获取能源成本列表
 */
export async function getEnergyCosts(params?: {
  cost_type?: string;
  greenhouse_name?: string;
  batch_code?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: EnergyCost[]; meta: { total: number; page: number; limit: number } }> {
  return apiClient.get('/material-costs/energy', params);
}

/**
 * 创建能源成本
 */
export async function createEnergyCost(data: Partial<EnergyCost>): Promise<{ id: string }> {
  return apiClient.post('/material-costs/energy', data);
}

/**
 * 更新能源成本
 */
export async function updateEnergyCost(id: string, data: Partial<EnergyCost>): Promise<{ id: string }> {
  return apiClient.put(`/material-costs/energy/${id}`, data);
}

/**
 * 删除能源成本
 */
export async function deleteEnergyCost(id: string): Promise<{ id: string }> {
  return apiClient.delete(`/material-costs/energy/${id}`);
}

// ========== 成本统计 API ==========

/**
 * 获取成本统计数据
 * 后端返回格式: {success: true, data: {...}, summary: {...}}
 * apiClient.get 只返回 data 部分，所以需要单独获取 summary
 */
export async function getCostStats(params?: {
  start_date?: string;
  end_date?: string;
  batch_code?: string;
  cost_type?: 'labor' | 'material' | 'energy' | 'all';
}): Promise<{ data: CostStats; summary: CostStatsSummary }> {
  // 构造查询参数
  const queryParams: Record<string, string> = {};
  if (params) {
    if (params.start_date) queryParams.start_date = params.start_date;
    if (params.end_date) queryParams.end_date = params.end_date;
    if (params.batch_code) queryParams.batch_code = params.batch_code;
    if (params.cost_type) queryParams.cost_type = params.cost_type;
  }

  // 直接fetch获取完整响应
  const url = new URL('http://localhost:3001/api/summary/cost-stats');
  Object.entries(queryParams).forEach(([k, v]) => url.searchParams.append(k, v));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'API request failed');
  }

  return { data: result.data, summary: result.summary };
}
