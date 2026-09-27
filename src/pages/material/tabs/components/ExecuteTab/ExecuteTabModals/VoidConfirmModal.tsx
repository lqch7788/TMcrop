// ExecuteTabVoidConfirmModal 组件
// 领料出库作废确认弹窗（2026-09-27 审计方案：已发料单据禁止删除，改作废）
import { useState } from 'react';
import { Ban, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';

interface ExecuteVoidConfirmModalProps {
  // 弹窗状态
  show: boolean;
  /** 单据号（展示防误操作） */
  recordCode: string;

  // 回调函数
  onCancel: () => void;
  /** 确认时回传作废原因（选填，写入 remarks） */
  onConfirm: (reason: string) => void;
}

export function ExecuteVoidConfirmModal({
  show,
  recordCode,
  onCancel,
  onConfirm,
}: ExecuteVoidConfirmModalProps) {
  // 2026-09-27：作废原因内嵌输入（替代 window.prompt——Electron/无头环境 prompt 被拦截返回 null）
  const [reason, setReason] = useState('');

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Ban className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">确认作废</h3>
          <p className="text-gray-500">
            确定要作废出库单 <strong className="font-mono text-blue-700">{recordCode}</strong> 吗？
          </p>
          <p className="text-xs text-gray-400 mt-1">
            作废后将恢复库存；单据本体保留（列表「已取消」筛选中可查），领料追溯记录不丢失。
          </p>
        </div>
        <div className="px-6 pb-4">
          <label className="block text-sm text-gray-600 mb-1 text-left">作废原因（选填）</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="如：发错物料 / 多领退回"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button variant="warning" onClick={() => onConfirm(reason.trim())}>
            <Ban className="w-4 h-4" /> 确认作废
          </Button>
        </div>
      </div>
    </div>
  );
}
