/**
 * 采收入库表格工具栏组件
 */

import React from 'react';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';

interface HarvestTableToolbarProps {
  // 模式状态
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
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
              <button
                onClick={onConfirmExport}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button
                onClick={onCancelExport}
                className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </>
          )}
          {batchEditMode && (
            <>
              <button
                onClick={onConfirmBatchEdit}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Pencil className="w-4 h-4" />
                确认编辑
              </button>
              <button
                onClick={onCancelBatchEdit}
                className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </>
          )}
          {batchDeleteMode && (
            <>
              <button
                onClick={onConfirmBatchDelete}
                className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </button>
              <button
                onClick={onCancelBatchDelete}
                className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          {canCreate && (
            <button
              onClick={onCreate}
              className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              新增
            </button>
          )}
          {canEdit && (
            <button
              onClick={onBatchEdit}
              className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
            >
              <Pencil className="w-4 h-4" />
              编辑
            </button>
          )}
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
        </div>
      )}
    </div>
  );
}
