/**
 * 离职申请页面筛选器组件
 */
import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ResignationFilters as ResignationFiltersType } from '../../types/resignationPage.types';
import { RESIGNATION_TYPE_OPTIONS, RESIGNATION_STATUS_OPTIONS } from '../../types/resignationPage.types';

interface ResignationPageFiltersProps {
  filters: ResignationFiltersType;
  onFilterChange: (field: keyof ResignationFiltersType, value: string) => void;
  onResetFilters: () => void;
  onSearch: () => void;
}

export function ResignationPageFilters({
  filters,
  onFilterChange,
  onResetFilters,
  onSearch,
}: ResignationPageFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* 员工姓名搜索 */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="搜索员工姓名"
          value={filters.workerName}
          onChange={(e) => onFilterChange('workerName', e.target.value)}
          className="h-9 w-40 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* 离职类型筛选 */}
      <select
        value={filters.resignationType}
        onChange={(e) => onFilterChange('resignationType', e.target.value)}
        className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
      >
        {RESIGNATION_TYPE_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* 状态筛选 */}
      <select
        value={filters.status}
        onChange={(e) => onFilterChange('status', e.target.value)}
        className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
      >
        {RESIGNATION_STATUS_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* 日期筛选 */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => onFilterChange('startDate', e.target.value)}
          className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        />
        <span className="text-gray-400">至</span>
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => onFilterChange('endDate', e.target.value)}
          className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* 搜索按钮 */}
      <Button onClick={onSearch} className="flex items-center gap-1">
        <Search className="w-4 h-4" />
        搜索
      </Button>

      {/* 重置按钮 */}
      <Button onClick={onResetFilters} variant="secondary" className="flex items-center gap-1">
        <RefreshCw className="w-4 h-4" />
        重置
      </Button>
    </div>
  );
}
