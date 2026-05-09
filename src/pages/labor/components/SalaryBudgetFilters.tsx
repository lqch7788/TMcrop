/**
 * 工资预算筛选器组件
 */
import { Button } from '../../../components/ui/button';
import { FilterBar, FilterItem } from '../../../components/ui/FilterBar';
import type { SalaryBudgetFilters as SalaryBudgetFiltersType } from '../types/salaryBudget.types';
import { STATUS_OPTIONS } from '../types/salaryBudget.types';
import { getMonthOptions } from '../hooks/useSalaryBudget';

export interface SalaryBudgetFiltersProps {
  filters: SalaryBudgetFiltersType;
  departments: { id: string; name: string }[];
  onFilterChange: (field: keyof SalaryBudgetFilters, value: string) => void;
  onReset: () => void;
  onSearch: () => void;
  onAdd: () => void;
  onOpenSummary: () => void;
  onExport: () => void;
}

/**
 * 工资预算页面筛选器组件
 * 包含部门筛选、月份筛选、状态筛选和操作按钮
 */
export function SalaryBudgetFilters({
  filters,
  departments,
  onFilterChange,
  onReset,
  onSearch,
  onAdd,
  onOpenSummary,
  onExport,
}: SalaryBudgetFiltersProps) {
  const monthOptions = getMonthOptions();

  return (
    <FilterBar onSearch={onSearch} onReset={onReset}>
      {/* 部门筛选 */}
      <FilterItem label="部门">
        <select
          value={filters.deptId}
          onChange={(e) => onFilterChange('deptId', e.target.value)}
          className="h-9 w-36 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="">全部部门</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
      </FilterItem>

      {/* 月份筛选 */}
      <FilterItem label="预算月份">
        <select
          value={filters.budgetMonth}
          onChange={(e) => onFilterChange('budgetMonth', e.target.value)}
          className="h-9 w-36 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="">全部月份</option>
          {monthOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FilterItem>

      {/* 状态筛选 */}
      <FilterItem label="状态">
        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="h-9 w-28 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FilterItem>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="default" size="sm" onClick={onAdd}>
          新增预算
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenSummary}>
          预算汇总
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          导出
        </Button>
      </div>
    </FilterBar>
  );
}
