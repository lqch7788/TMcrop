/**
 * 部门数据服务
 * 提供部门的本地存储和API获取功能
 */

import { enhancedApiClient } from '../lib/apiClient';

// 部门数据结构
export interface Department {
  id: string;
  oid: string;
  name: string;
  managerId?: string;
  managerName?: string;
  parentOid?: string | null;
  sortNumber?: number;
  status?: string;
  createdAt?: string;
}

const STORAGE_KEY = 'system_departments';

/**
 * 从 localStorage 获取部门数据
 */
function getStoredDepartments(): Department[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('部门数据解析失败:', error);
      return [];
    }
  }
  return [];
}

/**
 * 保存部门数据到 localStorage
 */
function saveDepartmentsToStorage(departments: Department[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(departments));
}

/**
 * 初始化部门数据
 */
export function initDepartments(): Department[] {
  const data = getStoredDepartments();
  return data;
}

/**
 * 获取所有部门（API模式优先）
 */
export async function getDepartments(): Promise<Department[]> {
  try {
    const data = await apiClient.get<Department[]>('/basic-data/departments');
    saveDepartmentsToStorage(data);
    return data;
  } catch (error) {
    console.error('API获取部门数据失败，使用本地数据:', error);
    return getStoredDepartments();
  }
}

/**
 * 根据ID获取部门
 */
export async function getDepartmentById(id: string): Promise<Department | undefined> {
  const departments = await getDepartments();
  return departments.find(d => d.id === id);
}

/**
 * 获取部门名称
 */
export async function getDepartmentName(id: string): Promise<string> {
  const department = await getDepartmentById(id);
  return department?.name || '';
}

/**
 * 保存部门数据
 */
export async function saveDepartments(departments: Department[]): Promise<void> {
  // API模式下通过后端保存
  await apiClient.post('/basic-data/departments', departments);
  saveDepartmentsToStorage(departments);
}

/**
 * 获取默认部门数据
 */
export function getDefaultDepartments(): Department[] {
  return [];
}

/**
 * 重置部门数据
 */
export function resetDepartments(): void {
  saveDepartmentsToStorage([]);
}
