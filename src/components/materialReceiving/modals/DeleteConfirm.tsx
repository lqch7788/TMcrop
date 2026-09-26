import React from 'react';
import { Trash2, X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';

interface DeleteConfirmProps {
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  /** 2026-09-26 批次五：确认弹窗显示单据号，防误删 */
  recordCode?: string;
}

export const DeleteConfirm: React.FC<DeleteConfirmProps> = ({ onConfirm, onCancel, onClose, recordCode }) => {
  const handleCancel = onCancel || onClose || (() => {});
  return (
    <UnifiedModal
      isOpen={true}
      onClose={handleCancel}
      title="确认删除"
      size="md"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleCancel}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 className="w-4 h-4" /> 确认删除
          </Button>
        </div>
      }
    >
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-amber-800">
          <strong>警告：</strong> 删除此领料记录可能会导致相关数据丢失，无法恢复。请确认是否继续删除操作。
        </p>
      </div>
      <p className="text-sm text-gray-600">
        确定要删除领料单 <strong className="font-mono text-blue-700">{recordCode || '（未指定单号）'}</strong> 吗？
      </p>
    </UnifiedModal>
  );
};

export default DeleteConfirm;
