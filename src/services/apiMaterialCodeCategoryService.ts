/**
 * 物料编码分类 API Service
 * 与后端 /api/material-code-categories 通信
 *
 * 注意: enhancedApiClient 自动提取 response.data，不包 axios 包装
 *   - GET 返回: data[] (已拆 .data)
 *   - POST 返回: { id, code, name, ... } (已拆 .data)
 *   - PUT/DELETE 返回: { success, message } (response 本身, 无 .data 字段)
 */

import { enhancedApiClient } from '../lib/apiClient';

export interface MaterialCodeCategory {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  parentCode: string;
  level: 'big' | 'mid' | 'sub';
  ruleType: string;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryPayload {
  code: string;
  name: string;
  nameEn?: string;
  parentCode?: string;
  level: 'big' | 'mid' | 'sub';
  ruleType?: string;
}

export interface UpdateCategoryPayload {
  name: string;
  nameEn?: string;
}

// 获取全部分类（扁平行列表，仅物料编码类型）
// enhancedApiClient 已自动解包 response.data，直接返回数组
export async function fetchCategories(): Promise<MaterialCodeCategory[]> {
  const data = await enhancedApiClient.get('/material-code-categories?rule_type=material');
  return (Array.isArray(data) ? data : []) as MaterialCodeCategory[];
}

// 新增分类
// enhancedApiClient 已解包 response.data，返回 { id, code, name, ... }
export async function createCategory(payload: CreateCategoryPayload): Promise<MaterialCodeCategory> {
  const data = await enhancedApiClient.post<MaterialCodeCategory>('/material-code-categories', payload);
  if (data && data.id) {
    return data;
  }
  throw new Error(data?.error || '创建分类失败');
}

// 更新分类名称
// PUT 无 .data 字段，直接返回 { success, message }
export async function updateCategory(code: string, payload: UpdateCategoryPayload): Promise<void> {
  const result = await enhancedApiClient.put<{ success: boolean; error?: string }>(`/material-code-categories/${code}`, payload);
  if (!result || !result.success) {
    throw new Error(result?.error || '更新分类失败');
  }
}

// 删除分类（软删除，级联删除子分类）
// DELETE 无 .data 字段，直接返回 { success, message }
export async function deleteCategory(code: string): Promise<void> {
  const result = await enhancedApiClient.delete<{ success: boolean; error?: string }>(`/material-code-categories/${code}`);
  if (!result || !result.success) {
    throw new Error(result?.error || '删除分类失败');
  }
}
