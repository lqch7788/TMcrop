/**
 * 入库删除确认弹窗组件
 * 从 InboundModals 拆分出来，独立管理删除确认弹窗
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { InboundRecord } from '../../../types/warehouseInbound.types';
import { Button } from '@/components/ui/button';

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

  // 计算物料总数
  const totalMaterials = records.reduce((sum, r) => sum + r.materials.length, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
        {/* 标题 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
        </div>

        {/* 内容 */}
        <div className="text-sm text-gray-600 mb-6">
          <p>确定要删除选中的入库记录吗？</p>
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
            <p><strong>选中数量：</strong>{records.length} 条入库记录</p>
            <p><strong>物料总数：</strong>{totalMaterials} 种物料</p>
          </div>
          <p className="mt-2 text-red-500">此操作不可撤销</p>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="flex-1">
            确认删除
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InboundDeleteConfirmModal;
