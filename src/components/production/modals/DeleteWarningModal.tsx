import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface DeleteWarningModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteWarningModal({
  isOpen,
  selectedCount,
  onClose,
  onConfirm,
}: DeleteWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">删除生产计划警告</h3>
            </div>
          </div>
          <div className="text-sm text-gray-600 space-y-3 mb-6">
            <p>确定要删除选中的 <strong>{selectedCount}</strong> 个生产计划吗？</p>
            <p>此操作 <strong className="text-red-600">无法恢复</strong>，删除后数据将永久丢失。</p>
            <p className="text-gray-500">只有草稿状态的生产计划可以被删除。</p>
          </div>
          <div className="flex gap-3">
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
