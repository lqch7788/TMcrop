import { AlertTriangle } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
        </div>
        <div className="text-sm text-gray-600 space-y-2 mb-6">
          <p>确定要删除选中的物料吗？</p>
          <div className="p-2 bg-gray-50 rounded text-xs">
            <p><strong>物料编号：</strong>{displayCodes}{moreCount}</p>
            <p><strong>物料总数：</strong>{selectedMaterials.length} 个</p>
          </div>
          <p className="text-red-500">此操作不可撤销！</p>
        </div>
        <div className="flex gap-3">
          <Button size="sm" variant="secondary" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button size="sm" variant="destructive" className="flex-1" onClick={onConfirm}>
            确认删除
          </Button>
        </div>
      </div>
    </div>
  );
}
