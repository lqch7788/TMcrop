import { Trash2 } from 'lucide-react';
import { Modal } from '../../../ui/Modal';

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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="删除任务确认"
      size="md"
      showFooter={false}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">删除农事任务</h3>
          </div>
        </div>
        <div className="text-sm text-gray-600 space-y-2">
          <p>确定要删除选中的 <strong>{selectedCount}</strong> 个农事任务吗？</p>
          <p>此操作 <strong className="text-red-600">无法恢复</strong>，删除后数据将永久丢失。</p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            确认删除
          </button>
        </div>
      </div>
    </Modal>
  );
}
