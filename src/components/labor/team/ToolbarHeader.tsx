/**
 * 表格工具栏（2026-09-18 抽自 TeamTable）
 *
 * 2026-09-18 修复 M-1：从 TeamTable 抽出表格顶部的批量操作/新建按钮区。
 */
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';
// 2026-10-26：无权限按钮「可见但灰化 + 点击提示」
import { guardByPermission, PERMISSION_DENIED_CLASS as DENIED } from '@/hooks/usePermissionAction';

export interface ToolbarHeaderProps {
  batchDeleteMode: boolean;
  selectedCount: number;
  canCreate: boolean;
  canDelete: boolean;
  onEnterBatchDelete: () => void;
  onConfirmBatchDelete: () => void;
  onCancelBatchDelete: () => void;
  onCreate: () => void;
}

export function ToolbarHeader({
  batchDeleteMode,
  selectedCount,
  canCreate,
  canDelete,
  onEnterBatchDelete,
  onConfirmBatchDelete,
  onCancelBatchDelete,
  onCreate,
}: ToolbarHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-gray-900">班组分配记录表</h3>
      <div className="flex gap-2">
        {batchDeleteMode ? (
          <>
            <Button
              size="sm"
              variant="destructive"
              onClick={onConfirmBatchDelete}
              disabled={selectedCount === 0}
            >
              <Trash2 className="w-4 h-4" />
              确认删除{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </Button>
            <Button size="sm" variant="secondary" onClick={onCancelBatchDelete}>
              <X className="w-4 h-4" /> 取消
            </Button>
          </>
        ) : (
          <>
            {/* 2026-10-26：按钮始终可见，无权限灰化 + 点击提示 */}
            <Button size="sm" onClick={guardByPermission(canCreate, '新增', onCreate)}
              className={!canCreate ? DENIED : undefined}
              title={!canCreate ? '权限不足：需要「新增」权限' : undefined}>
              <Plus className="w-4 h-4" />
              新建班组
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={guardByPermission(canDelete, '删除', onEnterBatchDelete)}
              className={!canDelete ? DENIED : undefined}
              title={!canDelete ? '权限不足：需要「删除」权限' : undefined}
            >
              <Trash2 className="w-4 h-4" />
              批量删除
            </Button>
          </>
        )}
      </div>
    </div>
  );
}