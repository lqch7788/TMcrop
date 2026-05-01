/**
 * 产品库存工具栏组件
 * 样式参照 ActionToolbar（库存总览）
 */

import { Download, Plus } from 'lucide-react';

interface ProduceInventoryToolbarProps {
  title: string;
  batchEditMode: boolean;
  deleteMode: boolean;
  exportMode: boolean;
  selectedRows: string[];
  lowStockCount: number;
  filters: { showLowStock: boolean };
  onLowStockToggle: () => void;
  onBatchEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
  onAdd: () => void;
  onConfirmBatchEdit: () => void;
  onCancelBatchEdit: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onConfirmExport: () => void;
  onCancelExport: () => void;
}

export default function ProduceInventoryToolbar({
  title,
  batchEditMode,
  deleteMode,
  exportMode,
  selectedRows,
  lowStockCount,
  filters,
  onLowStockToggle,
  onBatchEdit,
  onDelete,
  onExport,
  onAdd,
  onConfirmBatchEdit,
  onCancelBatchEdit,
  onConfirmDelete,
  onCancelDelete,
  onConfirmExport,
  onCancelExport,
}: ProduceInventoryToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="flex gap-2">
        {/* 默认模式：新增、库存不足、编辑、删除、导出 */}
        {!batchEditMode && !deleteMode && !exportMode && (
          <>
            <button
              onClick={onAdd}
              className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新增
            </button>
            <button
              onClick={onLowStockToggle}
              className={`h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 ${
                filters.showLowStock
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {lowStockCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{lowStockCount}</span>
              )}
              库存不足
            </button>
            <button
              onClick={onBatchEdit}
              className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              编辑
            </button>
            <button
              onClick={onDelete}
              className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              删除
            </button>
            <button
              onClick={onExport}
              className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </>
        )}
        {/* 编辑模式 */}
        {batchEditMode && (
          <>
            <button
              onClick={onConfirmBatchEdit}
              className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              确认编辑{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
            </button>
            <button
              onClick={onCancelBatchEdit}
              className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
          </>
        )}
        {/* 删除模式（已知晓后） */}
        {deleteMode && !batchEditMode && (
          <>
            <button
              onClick={onConfirmDelete}
              className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              确认删除{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
            </button>
            <button
              onClick={onCancelDelete}
              className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
          </>
        )}
        {/* 导出模式 */}
        {exportMode && !batchEditMode && !deleteMode && (
          <>
            <button
              onClick={onConfirmExport}
              className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              确认导出{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
            </button>
            <button
              onClick={onCancelExport}
              className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消选择
            </button>
          </>
        )}
      </div>
    </div>
  );
}
