/**
 * 公告数据 API 服务
 * 对接后端 /api/announcements
 */

import { apiClient } from './apiClient';
import type { Notice } from '../pages/types/announcement.types';

// 导入本地服务作为回退
import * as localService from './announcementService';

/**
 * 获取所有公告
 */
export async function getNotices(): Promise<Notice[]> {
  try {
    const response = await apiClient.get<{ data: Notice[] }>('/announcements');
    return response.data || [];
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getNotices();
  }
}

/**
 * 根据ID获取单个公告
 */
export async function getNoticeById(id: string): Promise<Notice | undefined> {
  try {
    const response = await apiClient.get<{ data: Notice }>(`/announcements/${id}`);
    return response.data;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getNoticeById(id);
  }
}

/**
 * 根据ID数组获取多个公告
 */
export async function getNoticesByIds(ids: string[]): Promise<Notice[]> {
  try {
    // API 不支持批量查询，降级到 localStorage
    return localService.getNoticesByIds(ids);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getNoticesByIds(ids);
  }
}

/**
 * 创建公告
 */
export async function createNotice(
  noticeData: Omit<Notice, 'id' | 'code'>
): Promise<Notice> {
  try {
    const response = await apiClient.post<{ id: string; code: string }>('/announcements', noticeData);
    return {
      ...noticeData,
      id: response.id,
      code: response.code,
    } as Notice;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.createNotice(noticeData);
  }
}

/**
 * 更新公告
 */
export async function updateNotice(id: string, updates: Partial<Notice>): Promise<Notice | null> {
  try {
    await apiClient.put(`/announcements/${id}`, updates);
    return { ...updates, id } as Notice;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.updateNotice(id, updates);
  }
}

/**
 * 删除公告
 */
export async function deleteNotice(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/announcements/${id}`);
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.deleteNotice(id);
  }
}

/**
 * 批量删除公告
 */
export async function deleteNotices(ids: string[]): Promise<boolean> {
  try {
    await apiClient.delete('/announcements/batch', { ids });
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.deleteNotices(ids);
  }
}

/**
 * 更新公告状态
 */
export async function updateNoticeStatus(id: string, status: string): Promise<boolean> {
  try {
    await apiClient.put(`/announcements/${id}/status`, { status });
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.updateNoticeStatus(id, status);
  }
}

/**
 * 增加阅读数
 */
export async function incrementReadCount(id: string): Promise<boolean> {
  try {
    await apiClient.post(`/announcements/${id}/read`);
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.incrementReadCount(id);
  }
}

/**
 * 重置公告数据
 */
export async function resetNotices(): Promise<void> {
  try {
    await apiClient.post('/announcements/reset');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    localService.resetNotices();
  }
}
