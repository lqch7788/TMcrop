/**
 * 农事操作记录表格工具栏组件
 */

import React from 'react';
import { Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui';

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
            <Button
              size="sm"
              variant="destructive"
              onClick={onBatchDelete}
            >
              <Trash2 className="w-4 h-4" />
              确认删除 ({selectedRowsCount})
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onCancelBatchDelete}
            >
              取消
            </Button>
          </>
        ) : (
          <>
            {canDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onBatchDelete}
              >
                <Trash2 className="w-4 h-4" />
                删除
              </Button>
            )}
            {canExport && (
              <Button
                size="sm"
                onClick={onExport}
              >
                <Download className="w-4 h-4" />
                导出
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
