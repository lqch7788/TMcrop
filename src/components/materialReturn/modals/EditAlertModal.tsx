import { UnifiedModal } from '@/components/ui';

interface EditAlertModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
  onVoidApply: () => void;
}

/**
 * 生产退料 - 无法编辑提示弹窗
 * 提示当前状态不允许编辑，可选择"知道了"关闭，或"前往作废申请"跳转到作废流程
 */
export function EditAlertModal({ open, message, onClose, onVoidApply }: EditAlertModalProps) {
  if (!open) return null;

  // 前往作废申请：先关闭本提示弹窗，再打开作废申请弹窗
  const handleVoidApply = () => {
    onClose();
    onVoidApply();
  };

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title="无法编辑"
      size="md"
      showFooter
      onSubmit={handleVoidApply}
      submitText="前往作废申请"
      cancelText="知道了"
    >
      <p className="text-sm text-gray-500 mb-3">退料单状态限制</p>

      {/* 状态限制说明 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          {message}
        </p>
      </div>
    </UnifiedModal>
  );
}
