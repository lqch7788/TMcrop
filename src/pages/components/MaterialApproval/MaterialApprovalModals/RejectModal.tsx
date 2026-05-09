// RejectModal 组件
// 拒绝原因弹窗
import { useState } from 'react';
import { Approval } from '@/types/approval';

interface RejectModalProps {
  // 弹窗状态
  show: boolean;
  item: Approval | null;
  reason: string;

  // 回调函数
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RejectModal({
  show,
  item,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
}: RejectModalProps) {
  if (!show || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
          <h3 className="text-lg font-semibold text-red-700">拒绝审批</h3>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-2">
            确定要拒绝「<span className="font-medium text-gray-900">{item.title}</span>」吗？
          </p>
          <p className="text-xs text-gray-500 mb-4">拒绝后，申请人可以在领料页面修改料单后重新提交审批。</p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">拒绝原因（必填）</label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="请输入拒绝原因..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              确认拒绝
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
