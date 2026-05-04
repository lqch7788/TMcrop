// ============================================================
// 审批通知Hook
// 文件路径：src/hooks/useApprovalNotification.ts
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Notification,
  NotificationType,
  NotificationLevel,
  DelegationConfig,
  getNotificationIcon,
  getNotificationLevelColor,
  formatNotificationTime,
} from '../types/approvalNotification';
import type { ApprovalType } from '../types/approval';

// ============================================================
// 模拟通知数据
// ============================================================

const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: NotificationType.PENDING_APPROVAL,
    level: NotificationLevel.IMPORTANT,
    title: '您有待审批的单据',
    content: '采购订单 P20260315001 需要您审批',
    approvalId: 'approval-001',
    approvalCode: 'P20260315001',
    approvalType: ApprovalType.PURCHASE_ORDER,
    senderId: 'system',
    senderName: '系统',
    recipientId: 'current-user',
    recipientName: '当前用户',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分钟前
  },
  {
    id: 'notif-002',
    type: NotificationType.APPROVAL_RESULT,
    level: NotificationLevel.INFO,
    title: '您的申请已通过',
    content: '领料单 L20260314002 已审批通过',
    approvalId: 'approval-002',
    approvalCode: 'L20260314002',
    approvalType: ApprovalType.MATERIAL_REQUISITION,
    senderId: 'approver-001',
    senderName: '张经理',
    recipientId: 'current-user',
    recipientName: '当前用户',
    isRead: true,
    readTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2小时前
  },
  {
    id: 'notif-003',
    type: NotificationType.APPROVAL_TIMEOUT,
    level: NotificationLevel.WARNING,
    title: '审批即将超时',
    content: '生产计划 P20260310001 已等待审批超过48小时',
    approvalId: 'approval-003',
    approvalCode: 'P20260310001',
    approvalType: ApprovalType.PRODUCTION_PLAN,
    senderId: 'system',
    senderName: '系统',
    recipientId: 'current-user',
    recipientName: '当前用户',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

// ============================================================
// 通知Hook
// ============================================================

export interface UseNotificationReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  refresh: () => void;
  getNotificationIcon: (type: NotificationType) => string;
  getNotificationLevelColor: (level: NotificationLevel) => string;
  formatNotificationTime: (createdAt: string) => string;
}

export function useNotification(): UseNotificationReturn {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 计算未读数量
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  // 标记单条通知为已读
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, isRead: true, readTime: new Date().toISOString() }
          : n
      )
    );
  }, []);

  // 标记所有通知为已读
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({
        ...n,
        isRead: true,
        readTime: n.readTime || new Date().toISOString(),
      }))
    );
  }, []);

  // 删除通知
  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // 刷新通知
  const refresh = useCallback(() => {
    setIsLoading(true);
    setError(null);
    // TODO: 从API加载通知
    setTimeout(() => {
      setNotifications(mockNotifications);
      setIsLoading(false);
    }, 500);
  }, []);

  // 初始加载
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
    getNotificationIcon,
    getNotificationLevelColor,
    formatNotificationTime,
  };
}

// ============================================================
// 委托Hook
// ============================================================

export interface UseDelegationReturn {
  delegations: DelegationConfig[];
  activeDelegations: DelegationConfig[];
  isLoading: boolean;
  error: string | null;
  createDelegation: (config: Omit<DelegationConfig, 'id'>) => Promise<void>;
  cancelDelegation: (delegationId: string) => Promise<void>;
  recallDelegation: (delegationId: string) => Promise<void>;
  refresh: () => void;
}

export function useDelegation(): UseDelegationReturn {
  const [delegations, setDelegations] = useState<DelegationConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取生效的委托
  const activeDelegations = useMemo(() => {
    const now = new Date();
    return delegations.filter(d =>
      d.isActive &&
      new Date(d.startTime) <= now &&
      new Date(d.endTime) >= now
    );
  }, [delegations]);

  // 创建委托
  const createDelegation = useCallback(async (config: Omit<DelegationConfig, 'id'>) => {
    setIsLoading(true);
    try {
      // TODO: 调用API创建委托
      const newDelegation: DelegationConfig = {
        ...config,
        id: `delegation-${Date.now()}`,
      };
      setDelegations(prev => [...prev, newDelegation]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建委托失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 取消委托
  const cancelDelegation = useCallback(async (delegationId: string) => {
    setIsLoading(true);
    try {
      // TODO: 调用API取消委托
      setDelegations(prev =>
        prev.map(d =>
          d.id === delegationId ? { ...d, isActive: false } : d
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消委托失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 召回委托
  const recallDelegation = useCallback(async (delegationId: string) => {
    setIsLoading(true);
    try {
      // TODO: 调用API召回委托
      setDelegations(prev =>
        prev.map(d =>
          d.id === delegationId ? { ...d, isActive: false } : d
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '召回委托失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 刷新
  const refresh = useCallback(() => {
    setIsLoading(true);
    setError(null);
    // TODO: 从API加载委托
    setTimeout(() => {
      setDelegations([]);
      setIsLoading(false);
    }, 500);
  }, []);

  return {
    delegations,
    activeDelegations,
    isLoading,
    error,
    createDelegation,
    cancelDelegation,
    recallDelegation,
    refresh,
  };
}
