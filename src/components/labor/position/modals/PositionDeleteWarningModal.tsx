import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';

interface PositionDeleteWarningModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function PositionDeleteWarningModal({
  isOpen,
  selectedCount,
  onClose,
  onConfirm,
}: PositionDeleteWarningModalProps) {
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="确认删除"
      size="sm"
      showFooter={false}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">此操作不可撤销</p>
        </div>
      </div>
      <p className="text-gray-600 mb-2">
        确定要删除选中的 <strong className="text-red-600">{selectedCount}</strong> 条职务记录吗？
      </p>
      <p className="text-sm text-gray-400">
        删除后将无法恢复，请谨慎操作。
      </p>
      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={onClose}>
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          <Trash2 className="w-4 h-4" /> 确认删除
        </Button>
      </div>
    </UnifiedModal>
  );
}