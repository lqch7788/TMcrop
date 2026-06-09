/**
 * 全局对话框组件 — 挂载到 App 根节点，拦截所有 showAlert/showConfirm 调用
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui';
import { registerDialogSetter, dismissDialog, type DialogState } from '@/lib/dialogService';
import { AlertTriangle, Info, X } from 'lucide-react';

export default function GlobalDialog() {
  const [state, setState] = useState<DialogState>({
    visible: false,
    type: 'alert',
    message: '',
    resolve: null,
  });

  useEffect(() => {
    registerDialogSetter(setState);
  }, []);

  const handleConfirm = useCallback(() => {
    dismissDialog(true);
  }, []);

  const handleCancel = useCallback(() => {
    dismissDialog(false);
  }, []);

  if (!state.visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 头部 */}
        <div className={`px-5 py-3 flex items-center justify-between ${state.type === 'confirm' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}>
          <div className="flex items-center gap-2">
            {state.type === 'confirm' ? (
              <AlertTriangle className="w-5 h-5 text-white" />
            ) : (
              <Info className="w-5 h-5 text-white" />
            )}
            <span className="text-white font-semibold text-base">
              {state.type === 'confirm' ? '确认操作' : '提示'}
            </span>
          </div>
          {state.type === 'alert' && (
            <Button variant="ghost" size="icon" onClick={handleConfirm} className="text-white/80 hover:text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* 内容 */}
        <div className="px-5 py-6">
          <p className="text-gray-700 text-base whitespace-pre-wrap">{state.message}</p>
        </div>

        {/* 底部按钮 */}
        <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          {state.type === 'confirm' && (
            <Button size="sm" variant="secondary" onClick={handleCancel}>
              <X className="w-4 h-4" /> 取消
            </Button>
          )}
          <Button size="sm" onClick={handleConfirm}>
            {state.type === 'confirm' ? '确定' : '知道了'}
          </Button>
        </div>
      </div>
    </div>
  );
}
