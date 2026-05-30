import React from 'react';
import { Trash2 } from 'lucide-react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TextArea } from '@/components/ui/TextArea';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface VoidModalProps {
  voidReason?: string;
  reason?: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  recordCode?: string;
}

export const VoidModal: React.FC<VoidModalProps> = ({
  voidReason,
  reason,
  onChange,
  onSubmit,
  onConfirm,
  onCancel,
  onClose,
  recordCode,
}) => {
  const actualReason = reason ?? voidReason ?? '';
  const handleCancel = onCancel || onClose || (() => {});
  const handleSubmit = onSubmit || onConfirm || (() => {});
  return (
    <UnifiedModal
      isOpen={true}
      onClose={handleCancel}
      title="作废申请"
      size="md"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleCancel}>
            取消
          </Button>
          <Button variant="warning" onClick={handleSubmit}>
            确认申请
          </Button>
        </div>
      }
    >
      {recordCode && (
        <div className="mb-4">
          <Label className="block text-sm font-medium text-gray-900 mb-1">领料单号</Label>
          <p className="font-mono text-gray-900">{recordCode}</p>
        </div>
      )}
      <div className="mb-4">
        <Label className="block text-sm font-medium text-gray-900 mb-1">
          作废原因 <span className="text-red-500">*</span>
        </Label>
        <TextArea
          value={actualReason}
          onChange={(e) => onChange(e.target.value)}
          placeholder="请输入作废原因"
          className={deepInputClass}
          rows={3}
        />
      </div>
    </UnifiedModal>
  );
};

export default VoidModal;
