import { AlertTriangle } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';

interface DeleteWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteWarningDialog({ isOpen, onClose, onConfirm }: DeleteWarningDialogProps) {
  if (!isOpen) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="批量删除警告"
      size="md"
      showFooter={true}
      footer={
        <div className="flex gap-3">
          <Button size="sm" variant="secondary" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button size="sm" variant="destructive" className="flex-1" onClick={onConfirm}>
            已知晓
          </Button>
        </div>
      }
    >
      <div className="text-sm text-gray-600 space-y-2">
        <p>删除后可能存在以下问题：</p>
        <ul className="list-disc list-inside space-y-1">
          <li>所有选中的物料将被永久删除</li>
          <li>相关的入库记录也将被删除</li>
          <li>历史数据将无法恢复</li>
        </ul>
      </div>
    </UnifiedModal>
  );
}
