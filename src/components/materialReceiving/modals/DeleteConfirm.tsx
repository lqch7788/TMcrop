import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';

interface DeleteConfirmProps {
  /** 2026-09-27：调用方以条件渲染控制显隐，此处仅为兼容传入（不改变行为） */
  isOpen?: boolean;
  /** 2026-09-27 审计方案：确认时回传删除原因（选填，写入归档表） */
  onConfirm: (reason: string) => void;
  onCancel?: () => void;
  onClose?: () => void;
  /** 2026-09-26 批次五：确认弹窗显示单据号，防误删 */
  recordCode?: string;
}

export const DeleteConfirm: React.FC<DeleteConfirmProps> = ({ onConfirm, onCancel, onClose, recordCode }) => {
  const handleCancel = onCancel || onClose || (() => {});
  // 2026-09-27 审计方案：删除原因内嵌输入（替代 window.prompt——prompt 在 Electron/无头环境
  // 会被静默拦截返回 null，导致删除被静默放弃且无任何提示）
  const [reason, setReason] = useState('');

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
          <Button variant="destructive" onClick={() => onConfirm(reason.trim())}>
            <Trash2 className="w-4 h-4" /> 确认删除
          </Button>
        </div>
      }
    >
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-amber-800">
          <strong>警告：</strong> 删除后单据将从列表移除，但整行快照会归档保留（含物料明细/删除人/删除时间），
          可在工具栏「已删除单据」中随时查询追溯。
        </p>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        确定要删除领料单 <strong className="font-mono text-blue-700">{recordCode || '（未指定单号）'}</strong> 吗？
      </p>
      {/* 删除原因（选填，写入归档表） */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">删除原因（选填）</label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="如：录入错误 / 重复单据"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
      </div>
    </UnifiedModal>
  );
};

export default DeleteConfirm;
