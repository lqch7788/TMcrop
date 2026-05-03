/**
 * 农事操作记录表格工具栏组件
 */

import React from 'react';
import { Trash2, Download } from 'lucide-react';

interface AgricultureRecordTableToolbarProps {
  batchDeleteMode: boolean;
  selectedRowsCount: number;
  onBatchDelete: () => void;
  onCancelBatchDelete: () => void;
  onExport: () => void;
  // 权限控制
  canDelete?: boolean;
  canExport?: boolean;
}

export function AgricultureRecordTableToolbar({
  batchDeleteMode,
  selectedRowsCount,
  onBatchDelete,
  onCancelBatchDelete,
  onExport,
  canDelete = true,
  canExport = true,
}: AgricultureRecordTableToolbarProps) {
  return (
    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-gray-900">农事操作记录表</h3>
      <div className="flex gap-2">
        {batchDeleteMode ? (
          <>
            <button
              onClick={onBatchDelete}
              className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              确认删除 ({selectedRowsCount})
            </button>
            <button
              onClick={onCancelBatchDelete}
              className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
          </>
        ) : (
          <>
            {canDelete && (
              <button
                onClick={onBatchDelete}
                className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            )}
            {canExport && (
              <button
                onClick={onExport}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
