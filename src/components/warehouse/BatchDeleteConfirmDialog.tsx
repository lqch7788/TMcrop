import { AlertTriangle } from 'lucide-react';
import { UnifiedModal } from '../ui/UnifiedModal';
import { Button } from '../ui/button';
import { Material } from './MaterialFilters';

interface BatchDeleteConfirmDialogProps {
  isOpen: boolean;
  selectedMaterials: Material[];
  onClose: () => void;
  onConfirm: () => void;
}

export function BatchDeleteConfirmDialog({ isOpen, selectedMaterials, onClose, onConfirm }: BatchDeleteConfirmDialogProps) {
  if (!isOpen) return null;

  const materialCodes = selectedMaterials.map(m => m.code).slice(0, 5);
  const displayCodes = materialCodes.join('、');
  const moreCount = selectedMaterials.length > 5 ? ` 等${selectedMaterials.length}个` : '';

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="确认删除"
      size="md"
      showFooter={true}
      footer={
        <div className="flex gap-3">
          <Button size="sm" variant="secondary" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button size="sm" variant="destructive" className="flex-1" onClick={onConfirm}>
            确认删除
          </Button>
        </div>
      }
    >
      <div className="text-sm text-gray-600 space-y-2">
        <p>确定要删除选中的物料吗？</p>
        <div className="p-2 bg-gray-50 rounded text-xs">
          <p><strong>物料编号：</strong>{displayCodes}{moreCount}</p>
          <p><strong>物料总数：</strong>{selectedMaterials.length} 个</p>
        </div>
        <p className="text-red-500">此操作不可撤销！</p>
      </div>
    </UnifiedModal>
  );
}
