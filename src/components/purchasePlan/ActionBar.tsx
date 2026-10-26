/**
 * 采购计划操作栏组件
 */
import React from 'react';
import { Download, Edit2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
// 2026-10-26：无权限按钮「可见但灰化 + 点击提示」
import { guardByPermission, PERMISSION_DENIED_CLASS as DENIED } from '@/hooks/usePermissionAction';

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
    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
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
                    showAlert('请先选择要编辑的数据');
                    return;
                  }
                  onBatchEditConfirm();
                }}
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </Button>
              <Button size="sm" variant="secondary" onClick={onBatchEditCancel}>
                <X className="w-4 h-4" /> 取消
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
                    showAlert('请先选择要删除的数据');
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
                <X className="w-4 h-4" /> 取消
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
                <X className="w-4 h-4" /> 取消
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          {/* 2026-10-26：按钮始终可见，无权限灰化 + 点击提示 */}
          <Button size="sm" onClick={guardByPermission(canCreate, '新增', onCreate)}
            className={!canCreate ? DENIED : undefined}
            title={!canCreate ? '权限不足：需要「新增」权限' : undefined}>
            <Plus className="w-4 h-4" />
            新增
          </Button>
          <Button size="sm" variant="blue" onClick={guardByPermission(canEdit, '编辑', onBatchEdit)}
            className={!canEdit ? DENIED : undefined}
            title={!canEdit ? '权限不足：需要「编辑」权限' : undefined}>
            <Edit2 className="w-4 h-4" />
            编辑
          </Button>
          <Button size="sm" variant="destructive" onClick={guardByPermission(canDelete, '删除', onBatchDelete)}
            className={!canDelete ? DENIED : undefined}
            title={!canDelete ? '权限不足：需要「删除」权限' : undefined}>
            <Trash2 className="w-4 h-4" />
            删除
          </Button>
          <Button size="sm" onClick={guardByPermission(canExport, '导出', onExport)}
            className={!canExport ? DENIED : undefined}
            title={!canExport ? '权限不足：需要「导出」权限' : undefined}>
            <Download className="w-4 h-4" />
            导出
          </Button>
        </div>
      )}
    </div>
  );
}

export default ActionBar;
