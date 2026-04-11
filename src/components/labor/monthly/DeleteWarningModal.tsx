/**
 * 删除确认弹窗
 */

import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteWarningModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteWarningModal({
  isOpen,
  selectedCount,
  onClose,
  onConfirm,
}: DeleteWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">删除月报确认</h3>
            </div>
          </div>
          <div className="text-sm text-gray-600 space-y-2 mb-6">
            <p>确定要删除选中的 <strong>{selectedCount}</strong> 条月报记录吗？</p>
            <p>此操作 <strong className="text-red-600">无法恢复</strong>，删除后数据将永久丢失。</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteWarningModal;
