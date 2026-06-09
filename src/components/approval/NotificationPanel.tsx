// ============================================================
// 审批通知面板组件
// 文件路径：src/components/approval/NotificationPanel.tsx
// ============================================================

import { useState } from 'react';
import { AlertTriangle, Bell, Check, CheckCheck, Clock, Info, Plus, Settings, UserPlus } from 'lucide-react';
import { Button, UnifiedModal } from '@/components/ui';
import { useNotification, useDelegation } from '../../hooks/useApprovalNotification';
import {
  NotificationType,
  NotificationLevel,
  formatNotificationTime,
} from '../../types/approvalNotification';
import { ApprovalType } from '../../types/approval';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    getNotificationIcon,
    getNotificationLevelColor,
    formatNotificationTime,
  } = useNotification();

  const { activeDelegations } = useDelegation();
  const [activeTab, setActiveTab] = useState<'notifications' | 'delegations'>('notifications');

  const getLevelIcon = (level: NotificationLevel) => {
    switch (level) {
      case NotificationLevel.WARNING:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case NotificationLevel.URGENT:
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case NotificationLevel.IMPORTANT:
        return <Info className="w-4 h-4 text-orange-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getApprovalTypeName = (type?: ApprovalType) => {
    if (!type) return '';
    const typeMap: Record<string, string> = {
      [ApprovalType.PURCHASE_ORDER]: '采购订单',
      [ApprovalType.PURCHASE_PLAN]: '采购计划',
      [ApprovalType.MATERIAL_REQUISITION]: '领料申请',
      [ApprovalType.PRODUCTION_PLAN]: '生产计划',
      [ApprovalType.HARVEST_RECORD]: '采收记录',
    };
    return typeMap[type] || type;
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="审批通知"
      size="lg"
      headerAction={
        unreadCount > 0 ? (
          <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
            {unreadCount} 未读
          </span>
        ) : undefined
      }
      footer={null}
    >
      {/* Tab切换 */}
      <div className="flex border-b border-gray-200">
        <Button
          variant="ghost"
          size="default"
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 rounded-none ${
            activeTab === 'notifications'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Bell className="w-4 h-4" /> 通知消息
        </Button>
        <Button
          variant="ghost"
          size="default"
          onClick={() => setActiveTab('delegations')}
          className={`flex-1 rounded-none ${
            activeTab === 'delegations'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="w-4 h-4" /> 委托管理
          {activeDelegations.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
              {activeDelegations.length}
            </span>
          )}
        </Button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto max-h-[60vh]">
        {activeTab === 'notifications' ? (
          <>
            {/* 批量操作 */}
            {unreadCount > 0 && (
              <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  有 {unreadCount} 条未读消息
                </span>
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  <CheckCheck className="w-4 h-4" />
                  全部已读
                </Button>
              </div>
            )}

            {/* 通知列表 */}
            <div className="divide-y divide-gray-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>暂无通知消息</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* 通知图标 */}
                      <div className="flex-shrink-0 mt-0.5">
                        <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                      </div>

                      {/* 通知内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getLevelIcon(notification.level)}
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {notification.content}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                          {notification.approvalType && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {getApprovalTypeName(notification.approvalType)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      {!notification.isRead && (
                        <Button variant="ghost" size="icon" onClick={() => markAsRead(notification.id)} title="标记为已读">
                          <Check className="w-4 h-4 text-gray-400" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* 委托管理Tab */
          <div className="p-4">
            {activeDelegations.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 mb-2">暂无生效的委托</p>
                <p className="text-sm text-gray-400">
                  您可以将审批权限委托给其他同事
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">当前生效的委托</h3>
                {activeDelegations.map(delegation => (
                  <div
                    key={delegation.id}
                    className="p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          委托给 {delegation.delegateeName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(delegation.startTime).toLocaleDateString('zh-CN')} -{' '}
                          {new Date(delegation.endTime).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                        生效中
                      </span>
                    </div>
                    {delegation.reason && (
                      <p className="text-xs text-gray-500 mt-2">{delegation.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 创建委托按钮 */}
            <Button variant="blue" className="w-full mt-4">
              <Plus className="w-4 h-4" /> 创建新委托
            </Button>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
