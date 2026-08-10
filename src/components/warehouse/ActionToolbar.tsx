import { Download, Edit2, Plus, Trash2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface ActionToolbarProps {
  title: React.ReactNode;
  batchEditMode: boolean;
  deleteMode: boolean;
  exportMode: boolean;
  /** 已选行 ID（string 表示实例 ID/UUID；number 是历史形态的兼容保留） */
  selectedRows: Array<string | number>;
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
      <div className="flex items-center gap-3">
        <h2 className={`font-semibold text-gray-900 ${noCard ? 'text-base' : 'text-lg'}`}>{title}</h2>
        {/* 2026-07-14：库存不足按钮移到标题后面 */}
        {showLowStockButton && !batchEditMode && !deleteMode && !exportMode && (
          <Button
            size="sm"
            // 2026-07-14：未激活浅橙，激活深橙底白字 + 阴影，明显区分
            className={filters.showLowStock
              ? 'bg-orange-500 text-white hover:bg-orange-600 font-bold shadow-md ring-2 ring-orange-300'
              : 'bg-orange-50 text-orange-800 hover:bg-orange-100 font-semibold'}
            onClick={onLowStockToggle}
          >
            {lowStockCount > 0 && (
              <span className="bg-orange-700 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">{lowStockCount}</span>
            )}
            库存不足
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        {/* 默认模式：新增、删除、导出（2026-08-10 移除"编辑"按钮，编辑仅在每行操作列） */}
        {!batchEditMode && !deleteMode && !exportMode && (
          <>
            {canCreate && onAdd && (
              <Button size="sm" onClick={onAdd}>
                <Plus className="w-4 h-4" />
                新增
              </Button>
            )}
            {/* 编辑按钮已下沉到行内操作列，工具栏不再提供批量编辑入口 */}
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
        {/* 编辑模式已移除（2026-08-10）：编辑仅在行内进行；保留分支条件不报错，避免调用方传 batchEditMode=true 出现未知行为 */}
        {/* 删除模式（已知晓后）—— 保留批量删除入口 */}
        {deleteMode && !batchEditMode && (
          <>
            <Button size="sm" variant="destructive" onClick={onConfirmDelete}>
              <Trash2 className="w-4 h-4" />
              确认删除{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
            </Button>
            <Button size="sm" variant="secondary" onClick={onCancelDelete}>
              <X className="w-4 h-4" /> 取消
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
              <X className="w-4 h-4" /> 取消选择
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
