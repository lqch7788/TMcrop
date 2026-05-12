/**
 * 绩效考核筛选栏组件
 */
import { Search, RotateCcw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PerformanceFilters as PerformanceFiltersType } from './types';
import { DEPT_OPTIONS, getMonthOptions } from './types';

interface PerformanceFiltersProps {
  filters: PerformanceFiltersType;
  onFilterChange: (filters: Partial<PerformanceFiltersType>) => void;
  onReset: () => void;
}

export function PerformanceFilters({
  filters,
  onFilterChange,
  onReset,
}: PerformanceFiltersProps) {
  const monthOptions = getMonthOptions();

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 月份筛选 */}
        <div className="min-w-[180px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            月份
          </label>
          <select
            value={filters.month}
            onChange={(e) => onFilterChange({ month: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部月份</option>
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {month}
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
            value={filters.department}
            onChange={(e) => onFilterChange({ department: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {DEPT_OPTIONS.map((dept) => (
              <option key={dept} value={dept === '全部' ? '' : dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* 关键词搜索 */}
        <div className="min-w-[200px] flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Search className="w-4 h-4 inline mr-1" />
            姓名/工号
          </label>
          <input
            type="text"
            value={filters.keyword}
            onChange={(e) => onFilterChange({ keyword: e.target.value })}
            placeholder="输入姓名或工号搜索"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={onReset}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
        </div>
      </div>
    </div>
  );
}
