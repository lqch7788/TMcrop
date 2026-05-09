/**
 * 统一导出操作工具栏组件
 * 样式与库存总览完全一致
 * 所有页面导出功能统一使用此组件
 */

import { Download } from 'lucide-react';
import { ReactNode } from 'react';

interface ExportActionToolbarProps {
  /** 是否处于导出模式 */
  exportMode: boolean;
  /** 选中行数 */
  selectedCount: number;
  /** 总数据条数 */
  totalCount: number;
  /** 点击导出按钮（进入导出模式） */
  onExport: () => void;
  /** 点击确认导出（弹出格式选择） */
  onConfirmExport: () => void;
  /** 点击取消选择（退出导出模式） */
  onCancelExport: () => void;
  /** 是否显示全选/取消全选按钮 */
  showSelectAll?: boolean;
  /** 点击全选/取消全选 */
  onSelectAll?: () => void;
  /** 默认模式下的其他按钮 */
  defaultActions?: ReactNode;
}

export function ExportActionToolbar({
  exportMode,
  selectedCount,
  totalCount,
  onExport,
  onConfirmExport,
  onCancelExport,
  showSelectAll = false,
  onSelectAll,
  defaultActions,
}: ExportActionToolbarProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-2">
        {exportMode && showSelectAll && (
          <>
            <span className="text-sm text-gray-600">已选择 {selectedCount} 项</span>
            <button
              onClick={onSelectAll}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {selectedCount === totalCount ? '全不选' : '全选'}
            </button>
          </>
        )}
        {!exportMode && (
          <span className="text-sm text-gray-500">共 {totalCount} 条数据</span>
        )}
      </div>
      <div className="flex gap-2">
        {!exportMode ? (
          <>
            {defaultActions}
            <button
              onClick={onExport}
              className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onConfirmExport}
              disabled={selectedCount === 0}
              className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              确认导出{selectedCount > 0 ? ` (${selectedCount})` : ''}
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

export default ExportActionToolbar;
