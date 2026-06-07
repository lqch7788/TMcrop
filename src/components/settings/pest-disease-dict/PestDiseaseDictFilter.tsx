/**
 * 病虫害字典筛选工具栏组件
 * 筛选字段：病虫害名称（通过父组件搜索框处理）、适用作物
 */
import React from 'react';
import { Label } from '@/components/ui';
import { Input } from '@/components/ui';

interface PestDiseaseDictFilterProps {
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
  onSearch: () => void;
  onReset: () => void;
}

export function PestDiseaseDictFilter({
  filters,
  onChange,
}: PestDiseaseDictFilterProps) {
  const updateFilter = (key: string, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {/* 适用作物 */}
      <div className="flex-1 min-w-[140px]">
        <Label className="text-gray-700">适用作物</Label>
        <Input
          type="text"
          value={filters.targetCrops || ''}
          onChange={(e) => updateFilter('targetCrops', e.target.value)}
          placeholder="请输入适用作物"
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* 状态 */}
      <div className="min-w-[120px]">
        <Label className="text-gray-700">状态</Label>
        <select
          value={filters.status || ''}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 bg-white"
        >
          <option value="">全部</option>
          <option value="active">启用</option>
          <option value="inactive">禁用</option>
        </select>
      </div>
    </div>
  );
}
