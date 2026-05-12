/**
 * ToastContext - 迁移到 Zustand useToastStore
 * 保持 API 不变，内部委托给 store
 */
import { createContext, useContext, type ReactNode } from 'react';
import { ToastContainer } from '../components/ui/Toast';
import { useToastStore } from '../stores/useToastStore';

interface ToastContextValue {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  // 直接使用 store 的 toast 方法
  const toast = useToastStore((state) => state.toast);
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
