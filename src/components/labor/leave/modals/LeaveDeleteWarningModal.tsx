import { AlertTriangle } from 'lucide-react';
import { Button } from '../../../ui/button';

interface LeaveDeleteWarningModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function LeaveDeleteWarningModal({
  isOpen,
  selectedCount,
  onClose,
  onConfirm,
}: LeaveDeleteWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
                <p className="text-sm text-gray-500">此操作不可撤销</p>
              </div>
            </div>
            <p className="text-gray-600 mb-2">
              确定要删除选中的 <strong className="text-red-600">{selectedCount}</strong> 条请假记录吗？
            </p>
            <p className="text-sm text-gray-400">
              删除后将无法恢复，请谨慎操作。
            </p>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              确认删除
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}