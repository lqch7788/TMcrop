/**
 * 通知设置 API 服务
 * 对接后端 /api/notifications (channels + rules)
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 */

import { enhancedApiClient } from '../lib/apiClient';

// ============================================
// 类型定义
// ============================================

/**
 * 通知渠道
 */
export interface NotificationChannel {
  id: string;
  oid: string;
  channelCode: string;
  channelName: string;
  channelType: string;
  isActive: boolean;
  config?: Record<string, string>;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 通知规则
 */
export interface NotificationRule {
  id: string;
  oid: string;
  ruleCode: string;
  ruleName: string;
  eventType: string;
  recipientType: string;
  recipientIds?: string[];
  channelIds?: string[];
  frequency: string;
  template?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// 通知渠道 API
// ============================================

/**
 * 获取所有通知渠道
 * 降级策略：API → IndexedDB 缓存
 */
export async function getChannels(): Promise<NotificationChannel[]> {
  const data = await enhancedApiClient.get<NotificationChannel[]>('/notifications/channels');
  return data || [];
}

/**
 * 创建通知渠道
 * 降级策略：API → 离线队列
 */
export async function createChannel(channel: Partial<NotificationChannel>): Promise<NotificationChannel> {
  const result = await enhancedApiClient.post<NotificationChannel>('/notifications/channels', channel);
  return result;
}

/**
 * 更新通知渠道
 * 降级策略：API → 离线队列
 */
export async function updateChannel(id: string, channel: Partial<NotificationChannel>): Promise<void> {
  await enhancedApiClient.put(`/notifications/channels/${id}`, channel);
}

/**
 * 删除通知渠道
 * 降级策略：API → 离线队列
 */
export async function deleteChannel(id: string): Promise<void> {
  await enhancedApiClient.delete(`/notifications/channels/${id}`);
}

/**
 * 切换通知渠道状态
 * 降级策略：API → 离线队列
 */
export async function toggleChannel(id: string): Promise<void> {
  await enhancedApiClient.patch(`/notifications/channels/${id}/toggle`, undefined);
}

// ============================================
// 通知规则 API
// ============================================

/**
 * 获取所有通知规则
 * 降级策略：API → IndexedDB 缓存
 */
export async function getRules(): Promise<NotificationRule[]> {
  const data = await enhancedApiClient.get<NotificationRule[]>('/notifications/rules');
  return data || [];
}

/**
 * 创建通知规则
 * 降级策略：API → 离线队列
 */
export async function createRule(rule: Partial<NotificationRule>): Promise<NotificationRule> {
  const result = await enhancedApiClient.post<NotificationRule>('/notifications/rules', rule);
  return result;
}

/**
 * 更新通知规则
 * 降级策略：API → 离线队列
 */
export async function updateRule(id: string, rule: Partial<NotificationRule>): Promise<void> {
  await enhancedApiClient.put(`/notifications/rules/${id}`, rule);
}

/**
 * 删除通知规则
 * 降级策略：API → 离线队列
 */
export async function deleteRule(id: string): Promise<void> {
  await enhancedApiClient.delete(`/notifications/rules/${id}`);
}

/**
 * 切换通知规则状态
 * 降级策略：API → 离线队列
 */
export async function toggleRule(id: string): Promise<void> {
  await enhancedApiClient.patch(`/notifications/rules/${id}/toggle`, undefined);
}

// ============================================
// 通知偏好
// ============================================

export interface NotificationPreferences {
  id?: number;
  userOid: string;
  approvalNotify: boolean;
  alertNotify: boolean;
  dailySummary: boolean;
  announcementNotify: boolean;
  dndEnabled: boolean;
  dndStartTime: string;
  dndEndTime: string;
}

/** 获取用户通知偏好 */
export async function getPreferences(userOid: string): Promise<NotificationPreferences> {
  const data = await enhancedApiClient.get<NotificationPreferences>(`/notifications/preferences/${userOid}`);
  return data || {
    userOid,
    approvalNotify: true,
    alertNotify: true,
    dailySummary: false,
    announcementNotify: true,
    dndEnabled: false,
    dndStartTime: '22:00',
    dndEndTime: '08:00',
  };
}

/** 保存用户通知偏好 */
export async function savePreferences(userOid: string, prefs: Partial<NotificationPreferences>): Promise<void> {
  await enhancedApiClient.put(`/notifications/preferences/${userOid}`, prefs);
}
