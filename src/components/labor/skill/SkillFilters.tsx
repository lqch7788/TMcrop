import React from 'react';
import { Search, RotateCw } from 'lucide-react';
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
    <div className={cn('bg-[#F2F6FA] rounded-lg p-3')}>
      <div className="flex flex-wrap gap-3 items-end">
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
          </div>
        </div>

        {/* 部门筛选 */}
        <div className="w-[140px]">
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
        <div className="w-[140px]">
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
        <div className="w-[120px]">
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

        {/* 重置和搜索按钮 */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onReset}>
            <RotateCw className="w-4 h-4" />
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

export default SkillFiltersComponent;
