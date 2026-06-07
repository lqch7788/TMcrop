/**
 * 筛选工具栏组件 - 支持日期、下拉筛选和操作按钮
 * V2.1: 替换原生 input[date]、select、label 为 UI 组件库对应组件
 */

import { Search, Download } from 'lucide-react';
import { DatePicker } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { FilterSelectConfig } from './types';

/** 将日期字符串 (YYYY-MM-DD) 转换为 Date 对象 */
function toDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return undefined;
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/** 将 Date 对象转换为日期字符串 (YYYY-MM-DD) */
function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              {filters.date.label}
            </Label>
            <DatePicker
              selected={filters.date.value ? toDate(filters.date.value) : undefined}
              onChange={(date) => filters.date?.onChange(toDateStr(date))}
            />
          </div>
        )}

        {/* 下拉筛选 */}
        {filters.selects?.map((select) => (
          <div key={select.key} className="min-w-[150px]">
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              {select.label}
            </Label>
            <Select value={select.value} onValueChange={select.onChange}>
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {select.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
