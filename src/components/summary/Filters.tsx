/**
 * 筛选工具栏组件 - 支持日期、下拉筛选和操作按钮
 */

import { Search, Download } from 'lucide-react';
import { FilterSelectConfig } from './types';

interface FiltersProps {
  filters: {
    date?: { key: string; label: string; value: string; onChange: (v: string) => void };
    selects?: FilterSelectConfig[];
  };
  showExportMode: boolean;
  selectedCount: number;
  onExportClick: () => void;
  onConfirmExport: () => void;
  onCancelExport: () => void;
  onSearch?: () => void;
  /** 隐藏正常模式下的导出按钮（导出模式下的确认/取消仍显示） */
  hideExportButton?: boolean;
}

export function Filters({
  filters,
  showExportMode,
  selectedCount,
  onExportClick,
  onConfirmExport,
  onCancelExport,
  onSearch,
  hideExportButton = false,
}: FiltersProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 日期筛选 */}
        {filters.date && (
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {filters.date.label}
            </label>
            <input
              type="date"
              value={filters.date.value}
              onChange={(e) => filters.date?.onChange(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}

        {/* 下拉筛选 */}
        {filters.selects?.map((select) => (
          <div key={select.key} className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {select.label}
            </label>
            <select
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              value={select.value}
              onChange={(e) => select.onChange(e.target.value)}
            >
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {onSearch && (
            <button
              onClick={onSearch}
              className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              搜索
            </button>
          )}
          {showExportMode ? (
            <>
              <button
                onClick={onConfirmExport}
                className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button
                onClick={onCancelExport}
                className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </>
          ) : !hideExportButton ? (
            <button
              onClick={onExportClick}
              className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
