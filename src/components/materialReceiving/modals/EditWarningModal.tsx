import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';

interface EditWarningModalProps {
  show?: boolean;
  isOpen?: boolean;
  title?: string;
  message?: string;
  onCancel?: () => void;
  onClose?: () => void;
  onConfirm?: () => void;
}

export const EditWarningModal: React.FC<EditWarningModalProps> = ({
  show,
  isOpen,
  title = '编辑提醒',
  message,
  onCancel,
  onClose,
  onConfirm,
}) => {
  const visible = show ?? isOpen ?? false;
  if (!visible) return null;

  const handleCancel = onCancel || onClose || (() => {});
  const handleConfirm = onConfirm || onClose || (() => {});

  return (
    <UnifiedModal
      isOpen={visible}
      onClose={handleCancel}
      title={title}
      size="md"
      showFooter={true}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleCancel} className="flex-1">
            <X className="w-4 h-4" /> 关闭
          </Button>
          {onConfirm && onConfirm !== onClose && (
            <Button onClick={handleConfirm} className="flex-1">
              <Check className="w-4 h-4" /> 确认
            </Button>
          )}
        </div>
      }
    >
      {message ? (
        <div className="text-sm text-gray-600 space-y-2">
          <p>{message}</p>
        </div>
      ) : (
        <div className="text-sm text-gray-600 space-y-2">
          <p>编辑后可能存在以下问题：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>该领料单的历史记录可能无法追溯</li>
            <li>已生成的出库单据数据可能不一致</li>
            <li>相关的统计报表数据可能需要重新核算</li>
          </ul>
        </div>
      )}
    </UnifiedModal>
  );
};

export default EditWarningModal;
