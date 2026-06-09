// ExecuteTabWarningModal 组件
// 领料出库警告弹窗
import { AlertTriangle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface ExecuteWarningModalProps {
  // 弹窗状态
  show: boolean;
  type: 'edit' | 'delete';

  // 回调函数
  onCancel: () => void;
  onConfirm: () => void;
}

export function ExecuteWarningModal({
  show,
  type,
  onCancel,
  onConfirm,
}: ExecuteWarningModalProps) {
  if (!show) return null;

  const isEdit = type === 'edit';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isEdit ? '批量编辑出库单' : '批量删除出库单'}
          </h3>
          <p className="text-gray-500">
            {isEdit ? '批量编辑功能正在开发中，请使用单条编辑功能。' : '确定要删除选中的出库单吗？此操作不可撤销。'}
          </p>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button onClick={onConfirm}>
            <Check className="w-4 h-4" /> 确定
          </Button>
        </div>
      </div>
    </div>
  );
}
