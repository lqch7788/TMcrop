/**
 * 巡查记录表格工具栏组件
 */

import React from 'react';
import { Download, Edit2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';
// 2026-10-26：无权限按钮「可见但灰化 + 点击提示」
import { guardByPermission, PERMISSION_DENIED_CLASS as DENIED } from '@/hooks/usePermissionAction';

interface InspectionToolbarProps {
  // 模式状态
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  // 操作回调
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

export function InspectionToolbar({
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
}: InspectionToolbarProps) {
  return (
    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-gray-900">巡查记录列表</h3>
      {(exportMode || batchEditMode || batchDeleteMode) ? (
        <div className="flex gap-2">
          {exportMode && (
            <>
              <Button
                size="sm"
                onClick={onConfirmExport}
              >
                <Download className="w-4 h-4" />
                确认导出
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onCancelExport}
              >
                <X className="w-4 h-4" /> 取消
              </Button>
            </>
          )}
          {batchEditMode && (
            <>
              <Button
                size="sm"
                onClick={onConfirmBatchEdit}
              >
                <Edit2 className="w-4 h-4" />
                确认编辑
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onCancelBatchEdit}
              >
                <X className="w-4 h-4" /> 取消
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
