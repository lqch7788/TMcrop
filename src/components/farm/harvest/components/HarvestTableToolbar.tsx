/**
 * 采收入库表格工具栏组件
 */

import React from 'react';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui';

interface HarvestTableToolbarProps {
  // 模式状态
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  selectedRows: number[];
  // 回调
  onCreate: () => void;
  onBatchEdit: () => void;
  onBatchDelete: () => void;
  onExport: () => void;
  onConfirmExport: () => void;
  onCancelExport: () => void;
  onConfirmBatchEdit: () => void;
  onCancelBatchEdit: () => void;
  onConfirmBatchDelete: () => void;
  onCancelBatchDelete: () => void;
  // 权限控制
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
}

export function HarvestTableToolbar({
  exportMode,
  batchEditMode,
  batchDeleteMode,
  selectedRows,
  onCreate,
  onBatchEdit,
  onBatchDelete,
  onExport,
  onConfirmExport,
  onCancelExport,
  onConfirmBatchEdit,
  onCancelBatchEdit,
  onConfirmBatchDelete,
  onCancelBatchDelete,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canExport = true,
}: HarvestTableToolbarProps) {
  return (
    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-gray-900">采收入库记录表</h3>
      {(exportMode || batchEditMode || batchDeleteMode) ? (
        <div className="flex gap-2">
          {exportMode && (
            <>
              <Button
                size="sm"
                onClick={onConfirmExport}
                disabled={selectedRows.length === 0}
              >
                <Download className="w-4 h-4" />
                确认导出{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onCancelExport}
              >
                取消选择
              </Button>
            </>
          )}
          {batchEditMode && (
            <>
              <Button
                size="sm"
                onClick={onConfirmBatchEdit}
              >
                <Pencil className="w-4 h-4" />
                确认编辑
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onCancelBatchEdit}
              >
                取消
              </Button>
            </>
          )}
          {batchDeleteMode && (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={onConfirmBatchDelete}
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onCancelBatchDelete}
              >
                取消
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          {canCreate && (
            <Button
              size="sm"
              onClick={onCreate}
            >
              <Plus className="w-4 h-4" />
              新增
            </Button>
          )}
          {canEdit && (
            <Button
              size="sm"
              variant="blue"
              onClick={onBatchEdit}
            >
              <Pencil className="w-4 h-4" />
              编辑
            </Button>
          )}
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
        </div>
      )}
    </div>
  );
}
