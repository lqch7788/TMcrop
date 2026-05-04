// ============================================================
// 批量确认弹窗组件
// 文件路径：src/components/approval/BatchConfirmModal.tsx
// 组件化结构：批量审批操作前的确认弹窗
// ============================================================

import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { Approval } from '../../types/approval';
import { getApprovalTypeName } from '../../types/approval';

interface BatchConfirmModalProps {
  isOpen: boolean;
  action: 'approve' | 'reject';
  selectedApprovals: Approval[];
  onConfirm: (comment: string) => void;
  onCancel: () => void;
}

export function BatchConfirmModal({
  isOpen,
  action,
  selectedApprovals,
  onConfirm,
  onCancel,
}: BatchConfirmModalProps) {
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const isApprove = action === 'approve';
  const actionText = isApprove ? '通过' : '拒绝';
  const actionColor = isApprove ? 'emerald' : 'red';

  const handleConfirm = () => {
    onConfirm(comment);
    setComment('');
  };

  const handleCancel = () => {
    setComment('');
    onCancel();
  };

  // 按类型分组统计
  const typeStats = selectedApprovals.reduce((acc, approval) => {
    const typeName = approval.typeName || getApprovalTypeName(approval.type);
    acc[typeName] = (acc[typeName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className={`p-4 border-b border-gray-200 flex items-center justify-between bg-${actionColor}-600`}
          style={{ backgroundColor: isApprove ? '#059669' : '#dc2626' }}>
          <h3 className="text-lg font-semibold text-white">
            批量{actionText}确认
          </h3>
          <button
            onClick={handleCancel}
            className="text-white hover:bg-opacity-80 p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {/* 警告提示 */}
          <div className={`flex items-start gap-3 p-4 rounded-lg mb-4 ${
            isApprove ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
          }`}>
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              isApprove ? 'text-emerald-600' : 'text-red-600'
            }`} />
            <div className="text-sm">
              <p className={`font-medium ${
                isApprove ? 'text-emerald-800' : 'text-red-800'
              }`}>
                确认要批量{actionText}这 {selectedApprovals.length} 项审批吗？
              </p>
              <p className={`mt-1 ${
                isApprove ? 'text-emerald-700' : 'text-red-700'
              }`}>
                {isApprove
                  ? '审批通过后，业务数据将自动更新，请确保已核实每项审批的内容。'
                  : '审批拒绝后，申请人将收到拒绝通知，请填写拒绝原因。'}
              </p>
            </div>
          </div>

          {/* 按类型统计 */}
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">审批单类型分布：</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(typeStats).map(([typeName, count]) => (
                <span
                  key={typeName}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                >
                  {typeName} × {count}
                </span>
              ))}
            </div>
          </div>

          {/* 审批单列表 */}
          <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">单号</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">申请人</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedApprovals.map((approval) => (
                  <tr key={approval.id}>
                    <td className="px-3 py-2 text-gray-900">{approval.code}</td>
                    <td className="px-3 py-2 text-gray-600">{approval.typeName}</td>
                    <td className="px-3 py-2 text-gray-600">{approval.applicantName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 审批意见 */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isApprove ? '审批意见（可选）' : '拒绝原因（必填）'}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={isApprove ? '可填写审批意见...' : '请填写拒绝原因...'}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {!isApprove && comment.trim() === '' && (
              <p className="mt-1 text-sm text-red-600">请填写拒绝原因</p>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isApprove && comment.trim() === ''}
            className={`h-10 px-6 rounded-lg text-sm font-medium text-white ${
              isApprove
                ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300'
                : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-300'
            } disabled:cursor-not-allowed`}
          >
            确认批量{actionText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BatchConfirmModal;
