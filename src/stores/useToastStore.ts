/**
 * Toast Store - Zustand 替代 ToastContext
 * 提供全局 toast 消息状态管理
 */
import { create } from 'zustand';
import type { ToastType } from '../components/ui/Toast';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (type, message, duration = 3000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, duration }],
    }));
    // 自动消失
    setTimeout(() => {
      get().dismissToast(id);
    }, duration);
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  toast: {
    success: (message, duration) => get().addToast('success', message, duration),
    error: (message, duration) => get().addToast('error', message, duration),
    warning: (message, duration) => get().addToast('warning', message, duration),
    info: (message, duration) => get().addToast('info', message, duration),
  },
}));
