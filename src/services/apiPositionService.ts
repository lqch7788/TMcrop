/**
 * 职位管理 API 服务
 * 对接后端 /api/basic-data/positions
 *
 * 数据流：API → enhancedApiClient → 组件（无缓存层，V2.1 铁律）
 *
 * 降级策略：
 * - GET 请求：API 直连（V2.1 铁律：无缓存降级）
 * - POST/PUT/DELETE：API 直连（无离线队列）
 */

import { enhancedApiClient } from '../lib/apiClient';

/**
 * 职位类型
 */
export interface Position {
  id: string;
  oid: string;
  code: string;
  name: string;
  departmentOid: string;
  departmentName: string;
  level: number;
  description: string;
  sortOrder: number;
  status: string;
  createdAt: string;
}

/**
 * 创建职位参数
 */
export interface CreatePositionParams {
  code: string;
  name: string;
  departmentOid?: string;
  departmentName?: string;
  level?: number;
  description?: string;
  sortOrder?: number;
}

/**
 * 更新职位参数
 */
export interface UpdatePositionParams {
  code?: string;
  name?: string;
  departmentOid?: string;
  departmentName?: string;
  level?: number;
  description?: string;
  sortOrder?: number;
  status?: string;
}

/**
 * 获取职位列表
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getPositions(): Promise<Position[]> {
  return await enhancedApiClient.get<Position[]>('/basic-data/positions');
}

/**
 * 获取单个职位
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getPositionById(id: string): Promise<Position | null> {
  return await enhancedApiClient.get<Position>(`/basic-data/positions/${id}`);
}

/**
 * 创建职位
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function createPosition(position: CreatePositionParams): Promise<Position> {
  return await enhancedApiClient.post<Position>('/basic-data/positions', position);
}

/**
 * 更新职位
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function updatePosition(id: string, updates: UpdatePositionParams): Promise<Position | null> {
  const result = await enhancedApiClient.put<Position>(`/basic-data/positions/${id}`, updates);
  return result;
}

/**
 * 删除职位（软删除）
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function deletePosition(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/basic-data/positions/${id}`);
  return true;
}

/**
 * 批量删除职位（软删除）
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function deletePositions(ids: string[]): Promise<boolean> {
  await enhancedApiClient.post('/basic-data/positions/batch-delete', { ids });
  return true;
}
