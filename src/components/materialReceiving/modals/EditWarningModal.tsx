import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';

interface EditWarningModalProps {
  show?: boolean;
  isOpen?: boolean;
  onCancel?: () => void;
  onClose?: () => void;
  onConfirm?: () => void;
}

export const EditWarningModal: React.FC<EditWarningModalProps> = ({
  show,
  isOpen,
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
      title="批量编辑警告"
      size="md"
      showFooter={true}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleCancel} className="flex-1">
            取消
          </Button>
          <Button onClick={handleConfirm} className="flex-1">
            确认
          </Button>
        </div>
      }
    >
      <div className="text-sm text-gray-600 space-y-2">
        <p>编辑后可能存在以下问题：</p>
        <ul className="list-disc list-inside space-y-1">
          <li>该领料单的历史记录可能无法追溯</li>
          <li>已生成的出库单据数据可能不一致</li>
          <li>相关的统计报表数据可能需要重新核算</li>
        </ul>
      </div>
    </UnifiedModal>
  );
};

export default EditWarningModal;
