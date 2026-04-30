/**
 * 批量操作工具栏组件
 * 用于人工管理模块的批量操作（批量通过、批量拒绝、批量导出）
 * 样式参考：企业级后台批量操作工具栏风格
 */

import React from 'react';
import { Check, X, Download, RotateCcw, Loader2 } from 'lucide-react';

export interface BatchActionBarProps {
  /** 已选中的记录数量 */
  selectedCount: number;
  /** 批量通过回调 */
  onBatchApprove?: () => void;
  /** 批量拒绝回调 */
  onBatchReject?: () => void;
  /** 批量导出回调 */
  onBatchExport?: () => void;
  /** 清空选择回调 */
  onClear?: () => void;
  /** 加载状态 */
  loading?: boolean;
}

/**
 * 批量操作工具栏组件
 * 选中数量为0时显示提示信息，选中数量大于0时显示操作按钮
 */
export function BatchActionBar({
  selectedCount,
  onBatchApprove,
  onBatchReject,
  onBatchExport,
  onClear,
  loading = false,
}: BatchActionBarProps) {
  // 选中数量为0时显示提示信息
  if (selectedCount === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-center text-gray-500 gap-2">
          <RotateCcw className="w-4 h-4" />
          <span className="text-sm">请先选择要操作的记录</span>
        </div>
      </div>
    );
  }

  // 选中数量大于0时显示操作按钮
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        {/* 左侧：选中数量提示 */}
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-semibold">
            已选择 {selectedCount} 条记录
          </div>
          <button
            onClick={onClear}
            className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 transition-colors"
            disabled={loading}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            清空选择
          </button>
        </div>

        {/* 右侧：批量操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 批量导出按钮 */}
          {onBatchExport && (
            <button
              onClick={onBatchExport}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              批量导出
            </button>
          )}

          {/* 批量拒绝按钮 */}
          {onBatchReject && (
            <button
              onClick={onBatchReject}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              批量拒绝
            </button>
          )}

          {/* 批量通过按钮 */}
          {onBatchApprove && (
            <button
              onClick={onBatchApprove}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              批量通过
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BatchActionBar;
