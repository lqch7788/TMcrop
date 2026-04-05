/**
 * 月报筛选器组件
 */

import { Search, Plus } from 'lucide-react';
import { MONTH_OPTIONS, DEPT_OPTIONS } from './types';

interface MonthlyReportFiltersProps {
  month: string;
  onMonthChange: (month: string) => void;
  dept: string;
  onDeptChange: (dept: string) => void;
  onSearch: () => void;
  onGenerate: () => void;
}

export function MonthlyReportFilters({
  month,
  onMonthChange,
  dept,
  onDeptChange,
  onSearch,
  onGenerate,
}: MonthlyReportFiltersProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 月份筛选 */}
        <div className="min-w-[180px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            月份
          </label>
          <select
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {MONTH_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* 部门筛选 */}
        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            部门
          </label>
          <select
            value={dept}
            onChange={(e) => onDeptChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {DEPT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={onSearch}
            className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            搜索
          </button>
          <button
            onClick={onGenerate}
            className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            生成月报
          </button>
        </div>
      </div>
    </div>
  );
}
