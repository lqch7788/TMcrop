/**
 * 采购计划操作栏组件
 */
import React from 'react';
import { Plus, Edit, Trash2, Download } from 'lucide-react';
import { Button } from '../ui/button';

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
              <Button
                size="sm"
                variant="blue"
                onClick={() => {
                  if (selectedRows.length === 0) {
                    alert('请先选择要编辑的数据');
                    return;
                  }
                  onBatchEditConfirm();
                }}
              >
                <Edit className="w-4 h-4" />
                编辑
              </Button>
              <Button size="sm" variant="secondary" onClick={onBatchEditCancel}>
                取消
              </Button>
            </>
          )}
          {/* 批量删除模式按钮 */}
          {batchDeleteMode && (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (selectedRows.length === 0) {
                    alert('请先选择要删除的数据');
                    return;
                  }
                  onBatchDeleteConfirm();
                }}
                disabled={selectedRows.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                删除
              </Button>
              <Button size="sm" variant="secondary" onClick={onBatchDeleteCancel}>
                取消
              </Button>
            </>
          )}
          {/* 导出模式按钮 */}
          {exportMode && (
            <>
              <Button size="sm" onClick={onExportConfirm}>
                <Download className="w-4 h-4" />
                确认导出
              </Button>
              <Button size="sm" variant="secondary" onClick={onExportCancel}>
                取消
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          {canCreate && (
            <Button size="sm" onClick={onCreate}>
              <Plus className="w-4 h-4" />
              新增
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="blue" onClick={onBatchEdit}>
              <Edit className="w-4 h-4" />
              编辑
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="destructive" onClick={onBatchDelete}>
              <Trash2 className="w-4 h-4" />
              删除
            </Button>
          )}
          {canExport && (
            <Button size="sm" onClick={onExport}>
              <Download className="w-4 h-4" />
              导出
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default ActionBar;
