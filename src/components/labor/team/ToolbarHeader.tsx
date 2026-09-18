/**
 * 表格工具栏（2026-09-18 抽自 TeamTable）
 *
 * 2026-09-18 修复 M-1：从 TeamTable 抽出表格顶部的批量操作/新建按钮区。
 */
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';

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
            {canCreate && (
              <Button size="sm" onClick={onCreate}>
                <Plus className="w-4 h-4" />
                新建班组
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onEnterBatchDelete}
              >
                <Trash2 className="w-4 h-4" />
                批量删除
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}