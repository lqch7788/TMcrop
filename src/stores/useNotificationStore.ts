/**
 * 通知 Store - Zustand 替代 NotificationContext
 * 页面右上角弹出通知状态管理
 */
import { create } from 'zustand';

export type NotificationVariant = 'success' | 'warning' | 'error' | 'info';

export interface Notification {
  id: string;
  title: string;
  description?: string;
  variant?: NotificationVariant;
  duration?: number;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: Notification = { ...notification, id };

    set((state) => {
      const updated = [newNotification, ...state.notifications];
      return { notifications: updated.slice(0, 5) }; // max 5
    });

    // 自动消失
    if (notification.duration !== 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, notification.duration || 3000);
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },
}));
