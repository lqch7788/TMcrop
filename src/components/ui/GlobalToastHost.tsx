/**
 * 全局 Toast 宿主（2026-10-26 新增）
 *
 * 背景：
 *   全站有 50 处调用 `showToast()`（dialogService），它走的是 `useToastStore`。
 *   但 App 根节点挂的是 `ToastProvider`（ToastContext），那是一套**组件私有 state**，
 *   与 store 完全无关 → store 里的 toast 从来没有被渲染过。
 *   表现：所有 showToast 调用都是静默的，用户什么也看不到
 *   （包括本次新增的「权限不足」提示、各处保存失败提示）。
 *
 * 本组件订阅 store 并渲染 ToastContainer，挂在 App 根即可。
 */
import { useToastStore } from '@/stores/useToastStore';
import { ToastContainer } from './Toast';

export function GlobalToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);
  return <ToastContainer toasts={toasts} onDismiss={dismissToast} />;
}

export default GlobalToastHost;
