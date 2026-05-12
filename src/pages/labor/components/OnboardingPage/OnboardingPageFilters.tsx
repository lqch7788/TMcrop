/**
 * 入职办理页面筛选器组件
 */
import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingFilters, ONBOARDING_STATUS_OPTIONS } from '../../types/onboardingPage.types';

interface OnboardingPageFiltersProps {
  filters: OnboardingFilters;
  departmentOptions: { value: string; label: string }[];
  onFilterChange: (field: keyof OnboardingFilters, value: string) => void;
  onResetFilters: () => void;
  onSearch: () => void;
}

export function OnboardingPageFilters({
  filters,
  departmentOptions,
  onFilterChange,
  onResetFilters,
  onSearch,
}: OnboardingPageFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* 员工姓名搜索 */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="搜索员工姓名"
          value={filters.employeeName}
          onChange={(e) => onFilterChange('employeeName', e.target.value)}
          className="h-9 w-40 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* 部门筛选 */}
      <select
        value={filters.department}
        onChange={(e) => onFilterChange('department', e.target.value)}
        className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
      >
        {departmentOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* 状态筛选 */}
      <select
        value={filters.status}
        onChange={(e) => onFilterChange('status', e.target.value)}
        className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
      >
        {ONBOARDING_STATUS_OPTIONS.map(opt => (
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
          placeholder="入职日期"
        />
      </div>

      {/* 搜索按钮 */}
      <Button onClick={onSearch} variant="default" size="default">
        <Search className="w-4 h-4" />
        搜索
      </Button>

      {/* 重置按钮 */}
      <Button onClick={onResetFilters} variant="secondary" size="default">
        <RefreshCw className="w-4 h-4" />
        重置
      </Button>
    </div>
  );
}
