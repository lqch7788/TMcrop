/**
 * 入库删除确认弹窗组件
 * 从 InboundModals 拆分出来，独立管理删除确认弹窗
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { InboundRecord } from '../../../types/warehouseInbound.types';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';

interface InboundDeleteConfirmModalProps {
  records: InboundRecord[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const InboundDeleteConfirmModal: React.FC<InboundDeleteConfirmModalProps> = ({
  records,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || records.length === 0) return null;

  const totalMaterials = records.reduce((sum, r) => sum + r.materials.length, 0);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="确认删除"
      size="md"
      showFooter={true}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="flex-1">
            确认删除
          </Button>
        </div>
      }
    >
      <div className="text-sm text-gray-600">
        <p>确定要删除选中的入库记录吗？</p>
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
          <p><strong>选中数量：</strong>{records.length} 条入库记录</p>
          <p><strong>物料总数：</strong>{totalMaterials} 种物料</p>
        </div>
        <p className="mt-2 text-red-500">此操作不可撤销</p>
      </div>
    </UnifiedModal>
  );
};

export default InboundDeleteConfirmModal;
