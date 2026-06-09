import { AlertTriangle, Trash2, X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';

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
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="确认删除"
      size="sm"
      showFooter={false}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
            <p className="text-sm text-gray-500">此操作不可撤销</p>
          </div>
        </div>
        <p className="text-gray-600">
          确定要删除选中的 <strong className="text-red-600">{selectedCount}</strong> 条请假记录吗？
        </p>
        <p className="text-sm text-gray-400">
          删除后将无法恢复，请谨慎操作。
        </p>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button size="sm" variant="secondary" onClick={onClose}>
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button size="sm" variant="destructive" onClick={onConfirm}>
          <Trash2 className="w-4 h-4" /> 确认删除
        </Button>
      </div>
    </UnifiedModal>
  );
}
