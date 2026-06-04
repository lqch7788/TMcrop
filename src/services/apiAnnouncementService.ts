/**
 * 公告数据 API 服务
 * 对接后端 /api/announcements
 *
 * 数据流：API → enhancedApiClient → 组件（无缓存层，V2.1 铁律）
 *
 * 降级策略：
 * - GET 请求：API 直连（V2.1 铁律：无缓存降级）
 * - POST/PUT/DELETE：API 直连（无离线队列）
 */

import { enhancedApiClient } from '../lib/apiClient';
import type { Notice } from '../pages/types/announcement.types';

/**
 * 获取所有公告
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getNotices(): Promise<Notice[]> {
  return await enhancedApiClient.get<Notice[]>('/announcements');
}

/**
 * 根据ID获取单个公告
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getNoticeById(id: string): Promise<Notice | undefined> {
  return await enhancedApiClient.get<Notice>(`/announcements/${id}`);
}

/**
 * 根据ID数组获取多个公告
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getNoticesByIds(ids: string[]): Promise<Notice[]> {
  // API 可能不支持批量查询，先获取所有再过滤
  const allNotices = await getNotices();
  return allNotices.filter(notice => ids.includes(notice.id));
}

/**
 * 创建公告
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function createNotice(
  noticeData: Omit<Notice, 'id' | 'code'>
): Promise<Notice> {
  return await enhancedApiClient.post<Notice>('/announcements', noticeData);
}

/**
 * 更新公告
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function updateNotice(id: string, updates: Partial<Notice>): Promise<Notice | null> {
  const result = await enhancedApiClient.put<Notice>(`/announcements/${id}`, updates);
  return result;
}

/**
 * 删除公告
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function deleteNotice(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/announcements/${id}`);
  return true;
}

/**
 * 批量删除公告
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function deleteNotices(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/announcements/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 更新公告状态
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function updateNoticeStatus(id: string, status: string): Promise<boolean> {
  await enhancedApiClient.put(`/announcements/${id}/status`, { status });
  return true;
}

/**
 * 增加阅读数
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function incrementReadCount(id: string): Promise<boolean> {
  await enhancedApiClient.post(`/announcements/${id}/read`);
  return true;
}

/**
 * 重置公告数据
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function resetNotices(): Promise<void> {
  await enhancedApiClient.post('/announcements/reset');
}
