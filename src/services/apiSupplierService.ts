/**
 * 供应商 API 服务
 * 对接后端 /api/suppliers
 */

import { apiClient, USE_API } from './apiClient';
import { Supplier } from '../components/supplier/types';

// 导入本地服务作为回退
import * as localService from './supplierService';

/**
 * 初始化供应商数据
 */
export async function initSuppliers(): Promise<Supplier[]> {
  if (USE_API) {
    return apiClient.get<Supplier[]>('/suppliers/init');
  }
  return localService.initSuppliers();
}

/**
 * 获取所有供应商
 */
export async function getAllSuppliers(): Promise<Supplier[]> {
  if (USE_API) {
    return apiClient.get<Supplier[]>('/suppliers');
  }
  return localService.getAllSuppliers();
}

/**
 * 搜索供应商（按名称、编码、联系人搜索）
 */
export async function searchSuppliers(keyword: string): Promise<Supplier[]> {
  if (USE_API) {
    return apiClient.get<Supplier[]>(`/suppliers/search?keyword=${encodeURIComponent(keyword)}`);
  }
  return localService.searchSuppliers(keyword);
}

/**
 * 根据ID获取供应商
 */
export async function getSupplierById(id: number): Promise<Supplier | undefined> {
  if (USE_API) {
    return apiClient.get<Supplier>(`/suppliers/${id}`);
  }
  return localService.getSupplierById(id);
}

/**
 * 获取合作中的供应商（用于下拉选择）
 */
export async function getActiveSuppliers(): Promise<Array<{ value: string; label: string; code: string }>> {
  if (USE_API) {
    return apiClient.get<Array<{ value: string; label: string; code: string }>>('/suppliers/active');
  }
  return localService.getActiveSuppliers();
}
