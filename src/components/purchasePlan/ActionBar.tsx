/**
 * 采购计划操作栏组件
 */
import React from 'react';
import { Plus, Edit, Trash2, Download } from 'lucide-react';

interface ActionBarProps {
  // 模式状态
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  // 选中状态
  selectedRows: string[];
  // 权限
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  // 数据长度
  dataLength: number;
  // 操作函数
  onCreate: () => void;
  onBatchEdit: () => void;
  onBatchDelete: () => void;
  onExport: () => void;
  onExportConfirm: () => void;
  onExportCancel: () => void;
  onBatchEditConfirm: () => void;
  onBatchEditCancel: () => void;
  onBatchDeleteConfirm: () => void;
  onBatchDeleteCancel: () => void;
}

/**
 * 采购计划操作栏组件
 */
export function ActionBar({
  exportMode,
  batchEditMode,
  batchDeleteMode,
  selectedRows,
  canCreate,
  canEdit,
  canDelete,
  canExport,
  dataLength,
  onCreate,
  onBatchEdit,
  onBatchDelete,
  onExport,
  onExportConfirm,
  onExportCancel,
  onBatchEditConfirm,
  onBatchEditCancel,
  onBatchDeleteConfirm,
  onBatchDeleteCancel,
}: ActionBarProps) {
  return (
    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-gray-900">采购计划列表</h3>
      {exportMode || batchEditMode || batchDeleteMode ? (
        <div className="flex gap-2">
          {/* 批量编辑模式按钮 */}
          {batchEditMode && (
            <>
              <button
                onClick={() => {
                  if (selectedRows.length === 0) {
                    alert('请先选择要编辑的数据');
                    return;
                  }
                  onBatchEditConfirm();
                }}
                className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
              >
                <Edit className="w-4 h-4" />
                编辑
              </button>
              <button
                onClick={onBatchEditCancel}
                className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </>
          )}
          {/* 批量删除模式按钮 */}
          {batchDeleteMode && (
            <>
              <button
                onClick={() => {
                  if (selectedRows.length === 0) {
                    alert('请先选择要删除的数据');
                    return;
                  }
                  onBatchDeleteConfirm();
                }}
                disabled={selectedRows.length === 0}
                className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
              <button
                onClick={onBatchDeleteCancel}
                className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </>
          )}
          {/* 导出模式按钮 */}
          {exportMode && (
            <>
              <button onClick={onExportConfirm} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button onClick={onExportCancel} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                取消
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          {canCreate && (
            <button onClick={onCreate} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
              <Plus className="w-4 h-4" />
              新增
            </button>
          )}
          {canEdit && (
            <button
              onClick={onBatchEdit}
              className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
            >
              <Edit className="w-4 h-4" />
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
            <button onClick={onExport} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
              <Download className="w-4 h-4" />
              导出
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ActionBar;
