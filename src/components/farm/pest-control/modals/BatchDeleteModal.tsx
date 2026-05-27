/**
 * 批量删除确认弹窗
 */
import React from 'react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';

interface BatchDeleteModalProps {
  isOpen: boolean;
  count: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function BatchDeleteModal({ isOpen, count, onClose, onConfirm }: BatchDeleteModalProps) {
  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="确认删除" size="md" showFooter={false}>
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">确定要删除选中的 {count} 条记录吗？</p>
          <p className="text-red-600 text-sm mt-2">此操作不可逆</p>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>取消</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>确认删除</Button>
        </div>
      </div>
    </UnifiedModal>
  );
}
