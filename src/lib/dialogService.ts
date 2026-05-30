/**
 * 全局对话框服务 — 替代原生 alert/confirm
 *
 * 用法:
 *   import { showAlert, showConfirm, showToast } from '@/lib/dialogService';
 *   await showAlert('操作成功！');
 *   const ok = await showConfirm('确定删除？');
 *   if (ok) { ... }
 *   showToast('保存成功', 'success');
 */

import type { ToastType } from '../components/ui/Toast';
import { useToastStore } from '../stores/useToastStore';

type Resolver = (value: boolean) => void;

let confirmResolver: Resolver | null = null;
let confirmMessage = '';
let alertMessage = '';
let dialogVisible = false;
let dialogType: 'alert' | 'confirm' = 'alert';

// React setState 注册
let setDialogState: ((state: DialogState) => void) | null = null;

interface DialogState {
  visible: boolean;
  type: 'alert' | 'confirm';
  message: string;
  resolve: Resolver | null;
}

/** 组件内部调用，注册 setState */
export function registerDialogSetter(setter: (state: DialogState) => void) {
  setDialogState = setter;
}

function updateDialog() {
  if (setDialogState) {
    setDialogState({
      visible: dialogVisible,
      type: dialogType,
      message: dialogType === 'alert' ? alertMessage : confirmMessage,
      resolve: confirmResolver,
    });
  }
}

/** 弹出提示框（替代 alert） */
export function showAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    alertMessage = message;
    dialogType = 'alert';
    dialogVisible = true;
    confirmResolver = () => resolve();
    updateDialog();
  });
}

/** 弹出确认框（替代 confirm），返回用户选择 */
export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    confirmMessage = message;
    dialogType = 'confirm';
    dialogVisible = true;
    confirmResolver = resolve;
    updateDialog();
  });
}

/** 关闭对话框 */
export function dismissDialog(result: boolean) {
  dialogVisible = false;
  updateDialog();
  if (confirmResolver) {
    confirmResolver(result);
    confirmResolver = null;
  }
}

/** 获取当前对话框状态（供组件使用） */
export function getDialogState(): DialogState {
  return {
    visible: dialogVisible,
    type: dialogType,
    message: dialogType === 'alert' ? alertMessage : confirmMessage,
    resolve: confirmResolver,
  };
}

/** 显示 Toast 提示（替代小段提示信息） */
export function showToast(message: string, type: ToastType = 'info', duration?: number): void {
  useToastStore.getState().addToast(type, message, duration);
}
