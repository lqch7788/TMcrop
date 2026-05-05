/**
 * 供应商 API 服务
 * 对接后端 /api/suppliers
 */

import { apiClient } from './apiClient';
import { Supplier } from '../components/supplier/types';

// 导入本地服务作为回退
import * as localService from './supplierService';

/**
 * 初始化供应商数据
 */
export async function initSuppliers(): Promise<Supplier[]> {
  try {
    return await apiClient.get<Supplier[]>('/suppliers/init');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.initSuppliers();
  }
}

/**
 * 获取所有供应商
 */
export async function getAllSuppliers(): Promise<Supplier[]> {
  try {
    return await apiClient.get<Supplier[]>('/suppliers');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getAllSuppliers();
  }
}

/**
 * 搜索供应商（按名称、编码、联系人搜索）
 */
export async function searchSuppliers(keyword: string): Promise<Supplier[]> {
  try {
    return await apiClient.get<Supplier[]>(`/suppliers/search?keyword=${encodeURIComponent(keyword)}`);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.searchSuppliers(keyword);
  }
}

/**
 * 根据ID获取供应商
 */
export async function getSupplierById(id: number): Promise<Supplier | undefined> {
  try {
    return await apiClient.get<Supplier>(`/suppliers/${id}`);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getSupplierById(id);
  }
}

/**
 * 获取合作中的供应商（用于下拉选择）
 */
export async function getActiveSuppliers(): Promise<Array<{ value: string; label: string; code: string }>> {
  try {
    return await apiClient.get<Array<{ value: string; label: string; code: string }>>('/suppliers/active');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getActiveSuppliers();
  }
}
