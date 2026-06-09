/**
 * 拒绝原因弹窗组件
 */

import { Modal, Button } from '@/components/ui';
import { Check, X } from 'lucide-react';

import { Label } from '@/components/ui';

interface TaskRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskDispatchTask | Task | null;
  rejectReason: string;
  setRejectReason: React.Dispatch<React.SetStateAction<string>>;
  onConfirm: () => void;
}

/**
 * 拒绝原因弹窗组件
 */
export function TaskRejectModal({
  isOpen,
  onClose,
  task,
  rejectReason,
  setRejectReason,
  onConfirm,
}: TaskRejectModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="拒绝任务"
      size="md"
      showFooter={false}
      bottomContent={
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!rejectReason.trim()}
          >
            <Check className="w-4 h-4" /> 确认拒绝
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-sm text-red-800">
            拒绝任务后，该问题将重新回到"待分派"状态。
          </div>
        </div>

        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            拒绝原因 <span className="text-red-500">*</span>
          </Label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="请输入拒绝原因..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>
    </Modal>
  );
}

export default TaskRejectModal;
