/**
 * 工资预算筛选器组件
 */
import { RotateCcw, RotateCw, Search } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import type { SalaryBudgetFilters as SalaryBudgetFiltersType } from '../types/salaryBudget.types';
import { STATUS_OPTIONS } from '../types/salaryBudget.types';
import { getMonthOptions } from '../hooks/useSalaryBudget';

export interface SalaryBudgetFiltersProps {
  filters: SalaryBudgetFiltersType;
  departments: { id: string; name: string }[];
  onFilterChange: (field: keyof SalaryBudgetFilters, value: string) => void;
  onReset: () => void;
  onSearch: () => void;
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
}: SalaryBudgetFiltersProps) {
  const monthOptions = getMonthOptions();

  return (
    <div className="bg-[#F2F6FA] rounded-lg p-3">
      <div className="flex flex-wrap gap-3 items-end">
        {/* 部门筛选 */}
        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-xs text-gray-500">部门</label>
          <Select
            value={filters.deptId || '__all__'}
            onValueChange={(value) => onFilterChange('deptId', value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="选择部门" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部部门</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 月份筛选 */}
        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-xs text-gray-500">预算月份</label>
          <Select
            value={filters.budgetMonth || '__all__'}
            onValueChange={(value) => onFilterChange('budgetMonth', value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="选择月份" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部月份</SelectItem>
              {monthOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 状态筛选 */}
        <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
          <label className="text-xs text-gray-500">状态</label>
          <Select
            value={filters.status || '__all__'}
            onValueChange={(value) => onFilterChange('status', value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="选择状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部状态</SelectItem>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 重置和搜索按钮 */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onReset}>
            <RotateCw className="w-4 h-4" />
            <RotateCcw className="w-4 h-4" /> 重置
          </Button>
          <Button size="sm" variant="default">
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}
