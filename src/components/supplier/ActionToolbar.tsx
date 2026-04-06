// 操作工具栏组件
import { Download } from 'lucide-react';

interface ActionToolbarProps {
  batchEditMode: boolean;
  exportMode: boolean;
  selectedRows: number[];
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

export default function ActionToolbar({
  batchEditMode,
  exportMode,
  selectedRows,
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
}: ActionToolbarProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-900">供应商列表</h2>
      <div className="flex gap-2">
        {/* 默认模式 */}
        {!batchEditMode && !exportMode && (
          <>
            <button
              onClick={onAdd}
              className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              新增供应商
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
        {/* 导出模式 */}
        {exportMode && !batchEditMode && (
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
