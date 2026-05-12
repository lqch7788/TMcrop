import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SkillFilters, SKILL_TAGS } from './types';
import { cn } from '@/lib/utils';
import { useDepartmentOptions } from '../../../hooks/useDepartmentOptions';

interface SkillFiltersProps {
  filters: SkillFilters;
  onChange: (filters: SkillFilters) => void;
  onReset: () => void;
  allSkillTags: string[];
}

export function SkillFiltersComponent({ filters, onChange, onReset, allSkillTags }: SkillFiltersProps) {
  // 从 API 获取部门选项
  const { options: departmentOptions } = useDepartmentOptions();

  // 状态选项
  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: '正常', label: '正常' },
    { value: '即将过期', label: '即将过期' },
    { value: '已过期', label: '已过期' },
  ];

  // 是否有筛选条件
  const hasFilters = filters.search || filters.department || filters.skillTag || filters.status;

  return (
    <div className={cn('flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-lg')}>
      {/* 搜索框 */}
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="搜索员工姓名或工号..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
          {filters.search && (
            <Button
              variant="ghost"
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 部门筛选 */}
      <div className="w-40">
        <Select
          value={filters.department || '__all__'}
          onValueChange={(value) => onChange({ ...filters, department: value === '__all__' ? '' : value })}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="选择部门" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部部门</SelectItem>
            {departmentOptions.map((dept) => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 技能标签筛选 */}
      <div className="w-44">
        <Select
          value={filters.skillTag || '__all__'}
          onValueChange={(value) => onChange({ ...filters, skillTag: value === '__all__' ? '' : value })}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="选择技能" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部技能</SelectItem>
            {allSkillTags.map((tag) => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 状态筛选 */}
      <div className="w-36">
        <Select
          value={filters.status || '__all__'}
          onValueChange={(value) => onChange({ ...filters, status: value === '__all__' ? '' : value })}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="选择状态" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value || '__all__'}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 重置按钮 */}
      {hasFilters && (
        <Button variant="ghost" onClick={onReset} className="text-gray-500">
          <X className="h-4 w-4 mr-1" />
          重置
        </Button>
      )}
    </div>
  );
}

export default SkillFiltersComponent;
