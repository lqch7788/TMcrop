import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';

interface ExecuteEditWarningModalProps {
  show: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ExecuteEditWarningModal: React.FC<ExecuteEditWarningModalProps> = ({
  show,
  onCancel,
  onConfirm,
}) => {
  if (!show) return null;

  return (
    <UnifiedModal
      isOpen={show}
      onClose={onCancel}
      title="批量编辑警告"
      size="md"
      showFooter={true}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button variant="blue" onClick={onConfirm} className="flex-1">
            <Check className="w-4 h-4" /> 确认
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

export default ExecuteEditWarningModal;
