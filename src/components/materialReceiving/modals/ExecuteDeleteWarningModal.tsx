import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';

interface ExecuteDeleteWarningModalProps {
  show: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ExecuteDeleteWarningModal: React.FC<ExecuteDeleteWarningModalProps> = ({
  show,
  onCancel,
  onConfirm,
}) => {
  if (!show) return null;

  return (
    <UnifiedModal
      isOpen={show}
      onClose={onCancel}
      title="批量删除警告"
      size="md"
      showFooter={true}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="flex-1">
            确认
          </Button>
        </div>
      }
    >
      <div className="text-sm text-gray-600 space-y-2">
        <p>删除后可能存在以下问题：</p>
        <ul className="list-disc list-inside space-y-1">
          <li>所有选中的领料出库单将被永久删除</li>
          <li>相关的物料明细也将被删除</li>
          <li>历史数据将无法恢复</li>
        </ul>
      </div>
    </UnifiedModal>
  );
};

export default ExecuteDeleteWarningModal;
