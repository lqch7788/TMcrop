// ============================================================
// 审批通知类型定义
// 文件路径：src/types/approvalNotification.ts
// ============================================================

import type { ApprovalType, ApprovalStatus } from './approval';

// ============================================================
// 通知类型枚举
// ============================================================

export enum NotificationType {
  // 审批通知
  PENDING_APPROVAL = 'pending_approval',       // 待审批通知
  APPROVAL_RESULT = 'approval_result',         // 审批结果通知
  APPROVAL_COMMENT = 'approval_comment',       // 审批评论通知
  APPROVAL_DELEGATE = 'approval_delegate',     // 审批委托通知
  APPROVAL_TIMEOUT = 'approval_timeout',       // 审批超时提醒
  APPROVAL_CANCEL = 'approval_cancel',         // 审批撤回通知

  // 系统通知
  SYSTEM_ANNOUNCEMENT = 'system_announcement', // 系统公告
  TASK_REMINDER = 'task_reminder',             // 任务提醒
}

// ============================================================
// 通知级别
// ============================================================

export enum NotificationLevel {
  INFO = 'info',           // 一般信息
  WARNING = 'warning',     // 警告
  URGENT = 'urgent',       // 紧急
  IMPORTANT = 'important',  // 重要
}

// ============================================================
// 通知对象
// ============================================================

export interface Notification {
  id: string;
  type: NotificationType;
  level: NotificationLevel;
  title: string;
  content: string;
  approvalId?: string;
  approvalCode?: string;
  approvalType?: ApprovalType;
  senderId?: string;
  senderName?: string;
  recipientId: string;
  recipientName?: string;
  isRead: boolean;
  readTime?: string;
  createdAt: string;
  expiresAt?: string;
  data?: Record<string, unknown>;
}

// ============================================================
// 委托配置
// ============================================================

export interface DelegationConfig {
  id: string;
  delegatorId: string;          // 委托人ID
  delegatorName: string;        // 委托人姓名
  delegateeId: string;          // 受托人ID
  delegateeName: string;        // 受托人姓名
  approvalTypes: ApprovalType[]; // 委托的审批类型（空数组表示全部）
  startTime: string;            // 委托开始时间
  endTime: string;              // 委托结束时间
  reason?: string;              // 委托原因
  isActive: boolean;            // 是否生效
  autoRecall: boolean;          // 委托人返回后是否自动召回
}

// ============================================================
// 委托历史
// ============================================================

export interface DelegationHistory {
  id: string;
  delegationId: string;
  action: 'created' | 'activated' | 'deactivated' | 'recalled' | 'expired';
  operatorId: string;
  operatorName: string;
  timestamp: string;
  comment?: string;
}

// ============================================================
// 审批超时配置
// ============================================================

export interface TimeoutConfig {
  type: 'warning' | 'escalation';  // 警告或升级
  thresholdHours: number;          // 超时阈值（小时）
  notifyTargets: ('approver' | 'applicant' | 'admin')[];
  reminderInterval?: number;       // 提醒间隔（小时）
}

// ============================================================
// 通知服务接口
// ============================================================

export interface NotificationService {
  // 获取通知列表
  getNotifications(userId: string, options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Notification[]>;

  // 获取未读通知数量
  getUnreadCount(userId: string): Promise<number>;

  // 标记通知为已读
  markAsRead(notificationId: string): Promise<void>;

  // 标记所有通知为已读
  markAllAsRead(userId: string): Promise<void>;

  // 删除通知
  deleteNotification(notificationId: string): Promise<void>;

  // 发送通知
  sendNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<void>;

  // 批量发送通知
  sendBatchNotifications(notifications: Omit<Notification, 'id' | 'createdAt'>[]): Promise<void>;
}

// ============================================================
// 委托服务接口
// ============================================================

export interface DelegationService {
  // 获取委托列表
  getDelegations(userId: string, activeOnly?: boolean): Promise<DelegationConfig[]>;

  // 创建委托
  createDelegation(config: Omit<DelegationConfig, 'id'>): Promise<DelegationConfig>;

  // 更新委托
  updateDelegation(id: string, config: Partial<DelegationConfig>): Promise<DelegationConfig>;

  // 取消委托
  cancelDelegation(id: string): Promise<void>;

  // 召回委托
  recallDelegation(id: string): Promise<void>;

  // 获取被委托的审批
  getDelegatedApprovals(delegateeId: string): Promise<string[]>;

  // 检查用户是否是审批代理人
  isDelegate(userId: string, approvalId: string): Promise<boolean>;
}

// ============================================================
// 通知工具函数
// ============================================================

export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case NotificationType.PENDING_APPROVAL:
      return '📋';
    case NotificationType.APPROVAL_RESULT:
      return '✅';
    case NotificationType.APPROVAL_COMMENT:
      return '💬';
    case NotificationType.APPROVAL_DELEGATE:
      return '🔄';
    case NotificationType.APPROVAL_TIMEOUT:
      return '⏰';
    case NotificationType.APPROVAL_CANCEL:
      return '❌';
    case NotificationType.SYSTEM_ANNOUNCEMENT:
      return '📢';
    case NotificationType.TASK_REMINDER:
      return '📌';
    default:
      return '🔔';
  }
}

export function getNotificationLevelColor(level: NotificationLevel): string {
  switch (level) {
    case NotificationLevel.INFO:
      return 'text-blue-600 bg-blue-50';
    case NotificationLevel.WARNING:
      return 'text-yellow-600 bg-yellow-50';
    case NotificationLevel.IMPORTANT:
      return 'text-orange-600 bg-orange-50';
    case NotificationLevel.URGENT:
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function formatNotificationTime(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return created.toLocaleDateString('zh-CN');
}
