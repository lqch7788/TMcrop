// ExecuteTabDeleteConfirmModal 组件
// 领料出库删除确认弹窗
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';

interface ExecuteDeleteConfirmModalProps {
  // 弹窗状态
  show: boolean;
  count: number;

  // 回调函数
  onCancel: () => void;
  onConfirm: () => void;
}

export function ExecuteDeleteConfirmModal({
  show,
  count,
  onCancel,
  onConfirm,
}: ExecuteDeleteConfirmModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
          <p className="text-gray-500">确定要删除这 {count} 条领料出库记录吗？此操作不可撤销。</p>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            确认删除
          </Button>
        </div>
      </div>
    </div>
  );
}
