/**
 * 离职申请页面筛选器组件
 */
import { RotateCcw, RotateCw, Search } from 'lucide-react';
import { Button } from '@/components/ui';
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
    <div className="bg-[#F2F6FA] rounded-lg p-3">
      <div className="flex flex-wrap gap-3 items-end">
        {/* 员工姓名搜索 */}
        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            placeholder="搜索员工姓名..."
            value={filters.workerName}
            onChange={(e) => onFilterChange('workerName', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 离职类型筛选 */}
        <div className="w-[140px]">
          <select
            value={filters.resignationType}
            onChange={(e) => onFilterChange('resignationType', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {RESIGNATION_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 状态筛选 */}
        <div className="w-[140px]">
          <select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {RESIGNATION_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button size="sm" variant="warning" onClick={onResetFilters}>
            <RotateCw className="w-4 h-4" />
            <RotateCcw className="w-4 h-4" /> 重置
          </Button>
          <Button size="sm" variant="default" onClick={onSearch}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}
