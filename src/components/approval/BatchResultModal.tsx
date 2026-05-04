// ============================================================
// 批量结果弹窗组件
// 文件路径：src/components/approval/BatchResultModal.tsx
// 组件化结构：展示批量审批操作的结果
// ============================================================

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, X, RefreshCw } from 'lucide-react';
import type { Approval } from '../../types/approval';

// 批量操作结果项
export interface BatchResultItem {
  id: string;
  code: string;
  typeName: string;
  success: boolean;
  error?: string;
}

// 批量操作结果
export interface BatchApprovalResult {
  total: number;
  success: number;
  failed: number;
  details: BatchResultItem[];
}

interface BatchResultModalProps {
  isOpen: boolean;
  action: 'approve' | 'reject';
  result: BatchApprovalResult | null;
  onClose: () => void;
  onRetry?: (failedIds: string[]) => void;
}

export function BatchResultModal({
  isOpen,
  action,
  result,
  onClose,
  onRetry,
}: BatchResultModalProps) {
  if (!isOpen || !result) return null;

  const isApprove = action === 'approve';
  const actionText = isApprove ? '通过' : '拒绝';

  // 获取失败的项
  const failedItems = result.details.filter(item => !item.success);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            {result.failed === 0 ? (
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            ) : result.success === 0 ? (
              <XCircle className="w-6 h-6 text-red-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            )}
            <h3 className="text-lg font-semibold text-gray-900">
              批量{actionText}结果
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* 统计概览 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-emerald-600">{result.success}</div>
              <div className="text-sm text-emerald-700 mt-1">成功</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{result.failed}</div>
              <div className="text-sm text-red-700 mt-1">失败</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-gray-600">{result.total}</div>
              <div className="text-sm text-gray-700 mt-1">总计</div>
            </div>
          </div>

          {/* 整体结果提示 */}
          {result.failed === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
              <p className="text-emerald-800">
                <CheckCircle className="w-5 h-5 inline mr-2" />
                所有 {result.total} 项审批已成功{actionText}！
              </p>
            </div>
          ) : result.success === 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">
                <XCircle className="w-5 h-5 inline mr-2" />
                批量{actionText}失败，所有 {result.total} 项审批均未成功。
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-amber-800">
                <AlertTriangle className="w-5 h-5 inline mr-2" />
                部分成功：{result.success} 项成功，{result.failed} 项失败。
              </p>
            </div>
          )}

          {/* 失败项列表 */}
          {failedItems.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                失败详情：
              </div>
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-700">单号</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-700">类型</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-700">失败原因</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {failedItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-gray-900">{item.code}</td>
                        <td className="px-3 py-2 text-gray-600">{item.typeName}</td>
                        <td className="px-3 py-2 text-red-600">{item.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200 flex justify-between">
          <div>
            {failedItems.length > 0 && onRetry && (
              <button
                onClick={() => onRetry(failedItems.map(item => item.id))}
                className="h-10 px-4 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                重试失败项
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default BatchResultModal;
