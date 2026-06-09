import { Search, X, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import type { SalaryFilters as SalaryFiltersType, SalaryCalcType, SalaryStatus } from './types';

/**
 * 状态选项
 */
const statusOptions: { value: SalaryStatus; label: string; color?: string }[] = [
  { value: '待确认', label: '待确认', color: '#f59e0b' },
  { value: '已确认', label: '已确认', color: '#3b82f6' },
  { value: '已发放', label: '已发放', color: '#22c55e' },
];

/**
 * 计算类型选项
 */
const calcTypeOptions: { value: SalaryCalcType; label: string }[] = [
  { value: '月薪制', label: '月薪制' },
  { value: '日薪制', label: '日薪制' },
  { value: '时薪制', label: '时薪制' },
];

/**
 * 月份选项
 */
const monthOptions = [
  { value: '2024-01', label: '2024年1月' },
  { value: '2024-02', label: '2024年2月' },
  { value: '2024-03', label: '2024年3月' },
  { value: '2024-04', label: '2024年4月' },
];

/**
 * 工资筛选栏 Props
 */
export interface SalaryFiltersProps {
  filters: SalaryFiltersType;
  onFilterChange: (filters: Partial<SalaryFiltersType>) => void;
  onReset: () => void;
}

/**
 * 工资筛选栏组件
 */
export function SalaryFilters({
  filters,
  onFilterChange,
  onReset,
}: SalaryFiltersProps) {
  // 是否有筛选条件
  const hasFilters = filters.month || filters.staffName || filters.calcType || filters.status;

  return (
    <div className="bg-[#F2F6FA] rounded-lg p-3">
      <div className="flex flex-wrap gap-3 items-end">
        {/* 姓名搜索 */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索员工姓名..."
              value={filters.staffName || ''}
              onChange={(e) => onFilterChange({ staffName: e.target.value || undefined })}
              className="pl-9"
            />
          </div>
        </div>

        {/* 月份筛选 */}
        <div className="w-[140px]">
          <Select
            value={filters.month || '__all__'}
            onValueChange={(value) => onFilterChange({ month: value === '__all__' ? '' : value })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="选择月份" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部月份</SelectItem>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 计算类型筛选 */}
        <div className="w-[120px]">
          <Select
            value={filters.calcType || '__all__'}
            onValueChange={(value) => onFilterChange({ calcType: value === '__all__' ? '' : value as SalaryCalcType })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="计算方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部方式</SelectItem>
              {calcTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 状态筛选 */}
        <div className="w-[120px]">
          <Select
            value={filters.status || '__all__'}
            onValueChange={(value) => onFilterChange({ status: value === '__all__' ? '' : value as SalaryStatus })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="选择状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部状态</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {option.color && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 重置和搜索按钮 */}
        <div className="flex gap-2">
          <Button size="sm" variant="warning" onClick={onReset}>
            <RotateCcw className="w-4 h-4" />
            重置
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
