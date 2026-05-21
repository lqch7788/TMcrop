/**
 * 公告数据 API 服务
 * 对接后端 /api/announcements
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';
import type { Notice } from '../pages/types/announcement.types';

/**
 * 获取所有公告
 * 降级策略：API → IndexedDB 缓存
 */
export async function getNotices(): Promise<Notice[]> {
  return await enhancedApiClient.get<Notice[]>('/announcements');
}

/**
 * 根据ID获取单个公告
 * 降级策略：API → IndexedDB 缓存
 */
export async function getNoticeById(id: string): Promise<Notice | undefined> {
  return await enhancedApiClient.get<Notice>(`/announcements/${id}`);
}

/**
 * 根据ID数组获取多个公告
 * 降级策略：API → IndexedDB 缓存
 */
export async function getNoticesByIds(ids: string[]): Promise<Notice[]> {
  // API 可能不支持批量查询，先获取所有再过滤
  const allNotices = await getNotices();
  return allNotices.filter(notice => ids.includes(notice.id));
}

/**
 * 创建公告
 * 降级策略：API → 离线队列
 */
export async function createNotice(
  noticeData: Omit<Notice, 'id' | 'code'>
): Promise<Notice> {
  return await enhancedApiClient.post<Notice>('/announcements', noticeData);
}

/**
 * 更新公告
 * 降级策略：API → 离线队列
 */
export async function updateNotice(id: string, updates: Partial<Notice>): Promise<Notice | null> {
  const result = await enhancedApiClient.put<Notice>(`/announcements/${id}`, updates);
  return result;
}

/**
 * 删除公告
 * 降级策略：API → 离线队列
 */
export async function deleteNotice(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/announcements/${id}`);
  return true;
}

/**
 * 批量删除公告
 * 降级策略：API → 离线队列
 */
export async function deleteNotices(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/announcements/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 更新公告状态
 * 降级策略：API → 离线队列
 */
export async function updateNoticeStatus(id: string, status: string): Promise<boolean> {
  await enhancedApiClient.put(`/announcements/${id}/status`, { status });
  return true;
}

/**
 * 增加阅读数
 * 降级策略：API → 离线队列
 */
export async function incrementReadCount(id: string): Promise<boolean> {
  await enhancedApiClient.post(`/announcements/${id}/read`);
  return true;
}

/**
 * 重置公告数据
 * 降级策略：API → 离线队列
 */
export async function resetNotices(): Promise<void> {
  await enhancedApiClient.post('/announcements/reset');
}
