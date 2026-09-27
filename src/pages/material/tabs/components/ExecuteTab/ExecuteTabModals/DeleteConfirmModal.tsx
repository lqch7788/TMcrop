// ExecuteTabDeleteConfirmModal 组件
// 领料出库删除确认弹窗
import { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';

interface ExecuteDeleteConfirmModalProps {
  // 弹窗状态
  show: boolean;
  count: number;

  // 回调函数
  onCancel: () => void;
  /** 2026-09-27 审计方案：确认时回传删除原因（选填，写入归档表） */
  onConfirm: (reason: string) => void;
}

export function ExecuteDeleteConfirmModal({
  show,
  count,
  onCancel,
  onConfirm,
}: ExecuteDeleteConfirmModalProps) {
  // 2026-09-27 审计方案：删除原因内嵌输入（替代 window.prompt——prompt 在 Electron/无头
  // 环境会被静默拦截返回 null，导致删除被静默放弃且无提示）
  const [reason, setReason] = useState('');

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
          <p className="text-gray-500">确定要删除这 {count} 条领料出库记录吗？</p>
          <p className="text-xs text-gray-400 mt-1">删除后整行快照归档保留（含物料明细/删除人/时间），可在「已删除单据」中查询追溯。</p>
        </div>
        <div className="px-6 pb-4">
          <label className="block text-sm text-gray-600 mb-1 text-left">删除原因（选填）</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="如：录入错误 / 重复单据"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(reason.trim())}>
            <Trash2 className="w-4 h-4" /> 确认删除
          </Button>
        </div>
      </div>
    </div>
  );
}
