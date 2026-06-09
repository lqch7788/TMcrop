/**
 * 统一导出工具栏组件
 * 样式与物料库存完全一致
 * 所有页面导出功能统一使用此组件
 */

import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui';

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
            <Button
              variant="link"
              size="sm"
              onClick={onSelectAll}
            >
              {selectedRows.length === totalCount ? '全不选' : '全选'}
            </Button>
          </>
        ) : (
          <span className="text-sm text-gray-500">共 {totalCount} 条数据</span>
        )}
      </div>
      <div className="flex gap-2">
        {!exportMode ? (
          <Button
            variant="default"
            size="sm"
            onClick={onExport}
          >
            <Download className="w-4 h-4" />
            导出
          </Button>
        ) : (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={onConfirmExport}
              disabled={selectedRows.length === 0}
            >
              <Download className="w-4 h-4" />
              确认导出{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelExport}
            >
              <X className="w-4 h-4" /> 取消选择
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default ExportToolbar;
