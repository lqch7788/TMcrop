import { Download, Plus, Edit2, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui';

interface ActionToolbarProps {
  title: string;
  batchEditMode: boolean;
  deleteMode: boolean;
  exportMode: boolean;
  selectedRows: number[];
  lowStockCount: number;
  filters: { showLowStock: boolean };
  onLowStockToggle: () => void;
  onBatchEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
  onConfirmBatchEdit: () => void;
  onCancelBatchEdit: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onConfirmExport: () => void;
  onCancelExport: () => void;
  // 新增功能
  onAdd?: () => void;
  canCreate?: boolean;
  // 权限控制 props
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
  // 是否显示库存不足按钮
  showLowStockButton?: boolean;
  // 是否显示客户管理按钮
  showCustomerButton?: boolean;
  onCustomer?: () => void;
  // 是否使用卡片样式
  noCard?: boolean;
}

export default function ActionToolbar({
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
  onConfirmBatchEdit,
  onCancelBatchEdit,
  onConfirmDelete,
  onCancelDelete,
  onConfirmExport,
  onCancelExport,
  onAdd,
  canCreate = true,
  // 权限控制 props - 默认为 true 以兼容无权限配置的情况
  canEdit = true,
  canDelete = true,
  canExport = true,
  showLowStockButton = true,
  showCustomerButton = false,
  onCustomer,
  noCard = false,
}: ActionToolbarProps) {
  return (
    <div className={`flex items-center justify-between ${noCard ? '' : 'bg-white rounded-xl p-4 shadow-sm'}`}>
      <h2 className={`font-semibold text-gray-900 ${noCard ? 'text-base' : 'text-lg'}`}>{title}</h2>
      <div className="flex gap-2">
        {/* 默认模式：新增、库存不足、编辑、删除、导出 */}
        {!batchEditMode && !deleteMode && !exportMode && (
          <>
            {canCreate && onAdd && (
              <Button size="sm" onClick={onAdd}>
                <Plus className="w-4 h-4" />
                新增
              </Button>
            )}
            {showLowStockButton && (
              <Button
                size="sm"
                variant={filters.showLowStock ? 'destructive' : 'secondary'}
                onClick={onLowStockToggle}
              >
                {lowStockCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{lowStockCount}</span>
                )}
                库存不足
              </Button>
            )}
            {canEdit && (
              <Button size="sm" variant="blue" onClick={onBatchEdit}>
                <Edit2 className="w-4 h-4" />
                编辑
              </Button>
            )}
            {canDelete && (
              <Button size="sm" variant="destructive" onClick={onDelete}>
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
            {showCustomerButton && onCustomer && (
              <Button size="sm" variant="blue" onClick={onCustomer}>
                <Users className="w-4 h-4" />
                客户管理
              </Button>
            )}
          </>
        )}
        {/* 编辑模式 */}
        {batchEditMode && (
          <>
            <Button size="sm" variant="blue" onClick={onConfirmBatchEdit}>
              <Edit2 className="w-4 h-4" />
              确认编辑{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
            </Button>
            <Button size="sm" variant="secondary" onClick={onCancelBatchEdit}>
              取消
            </Button>
          </>
        )}
        {/* 删除模式（已知晓后） */}
        {deleteMode && !batchEditMode && (
          <>
            <Button size="sm" variant="destructive" onClick={onConfirmDelete}>
              <Trash2 className="w-4 h-4" />
              确认删除{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
            </Button>
            <Button size="sm" variant="secondary" onClick={onCancelDelete}>
              取消
            </Button>
          </>
        )}
        {/* 导出模式 */}
        {exportMode && !batchEditMode && !deleteMode && (
          <>
            <Button size="sm" onClick={onConfirmExport}>
              <Download className="w-4 h-4" />
              确认导出{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
            </Button>
            <Button size="sm" variant="secondary" onClick={onCancelExport}>
              取消选择
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
