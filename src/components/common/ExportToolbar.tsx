/**
 * 统一导出工具栏组件
 * 样式与库存总览完全一致
 * 所有页面导出功能统一使用此组件
 */

import { Download } from 'lucide-react';

interface ExportToolbarProps {
  /** 标题 */
  title: string;
  /** 是否处于导出模式 */
  exportMode: boolean;
  /** 选中行数 */
  selectedRows: number[];
  /** 总数据条数 */
  totalCount: number;
  /** 点击导出按钮（进入导出模式） */
  onExport: () => void;
  /** 点击确认导出（弹出格式选择） */
  onConfirmExport: () => void;
  /** 点击取消选择（退出导出模式） */
  onCancelExport: () => void;
  /** 点击全选/取消全选 */
  onSelectAll: () => void;
  /** 是否显示左侧标题 */
  showTitle?: boolean;
}

export function ExportToolbar({
  title,
  exportMode,
  selectedRows,
  totalCount,
  onExport,
  onConfirmExport,
  onCancelExport,
  onSelectAll,
  showTitle = true,
}: ExportToolbarProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-2">
        {showTitle && (
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        )}
        {exportMode ? (
          <>
            <span className="text-sm text-gray-600">已选择 {selectedRows.length} 项</span>
            <button
              onClick={onSelectAll}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {selectedRows.length === totalCount ? '全不选' : '全选'}
            </button>
          </>
        ) : (
          <span className="text-sm text-gray-500">共 {totalCount} 条数据</span>
        )}
      </div>
      <div className="flex gap-2">
        {!exportMode ? (
          <button
            onClick={onExport}
            className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        ) : (
          <>
            <button
              onClick={onConfirmExport}
              disabled={selectedRows.length === 0}
              className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default ExportToolbar;
