// ============================================================
// 批量结果弹窗组件
// 文件路径：src/components/approval/BatchResultModal.tsx
// 组件化结构：展示批量审批操作的结果
// ============================================================

import React from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, X, XCircle } from 'lucide-react';
import { UnifiedModal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button } from '@/components/ui';
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
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`批量${actionText}结果`}
      size="xl"
      footer={
        <div className="flex justify-between w-full">
          <div>
            {failedItems.length > 0 && onRetry && (
              <Button
                onClick={() => onRetry(failedItems.map(item => item.id))}
                className="bg-amber-600 hover:bg-amber-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                重试失败项
              </Button>
            )}
          </div>
          <Button variant="secondary" onClick={onClose}>
            <X className="w-4 h-4" /> 关闭
          </Button>
        </div>
      }
    >
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
            <Table>
              <TableHeader className="bg-red-50">
                <TableRow>
                  <TableHead className="text-xs font-medium text-red-700">单号</TableHead>
                  <TableHead className="text-xs font-medium text-red-700">类型</TableHead>
                  <TableHead className="text-xs font-medium text-red-700">失败原因</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.code}</TableCell>
                    <TableCell>{item.typeName}</TableCell>
                    <TableCell className="text-red-600">{item.error}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </UnifiedModal>
  );
}

export default BatchResultModal;
