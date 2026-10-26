/**
 * 农事操作记录表格工具栏组件
 */

import React from 'react';
import { Download, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';
// 2026-10-26：无权限按钮「可见但灰化 + 点击提示」
import { guardByPermission, PERMISSION_DENIED_CLASS as DENIED } from '@/hooks/usePermissionAction';

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
              <X className="w-4 h-4" /> 取消
            </Button>
          </>
        ) : (
          <>
            {/* 2026-10-26：按钮始终可见，无权限灰化 + 点击提示 */}
            <Button
              size="sm"
              variant="destructive"
              onClick={guardByPermission(canDelete, '删除', onBatchDelete)}
              className={!canDelete ? DENIED : undefined}
              title={!canDelete ? '权限不足：需要「删除」权限' : undefined}
            >
              <Trash2 className="w-4 h-4" />
              删除
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={guardByPermission(canExport, '导出', onExport)}
              className={!canExport ? DENIED : undefined}
              title={!canExport ? '权限不足：需要「导出」权限' : undefined}
            >
              <Download className="w-4 h-4" />
              导出
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
