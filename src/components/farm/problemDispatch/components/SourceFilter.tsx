/**
 * 来源模块筛选组件
 * 下拉选择来源模块进行筛选
 */

import type { SourceModuleType } from '../constants/sourceConfig';
import { SOURCE_MODULE_OPTIONS } from '../constants/sourceConfig';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

interface SourceFilterProps {
  value: SourceModuleType | 'all';
  onChange: (value: SourceModuleType | 'all') => void;
}

export function SourceFilter({ value, onChange }: SourceFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">来源：</span>
      <Select
        value={value}
        onValueChange={(val) => onChange(val as SourceModuleType | 'all')}
      >
        <SelectTrigger className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-auto">
          <SelectValue placeholder="全部" />
        </SelectTrigger>
        <SelectContent>
          {SOURCE_MODULE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
