/**
 * 病虫害防治记录筛选工具栏组件
 * V12.0 新增
 * 筛选字段：防治类型、作物名称、防治区域、目标病虫害、日期范围
 */
import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';

interface PestControlFilterProps {
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
  onSearch: () => void;
  onReset: () => void;
}

// 防治类型选项
const CONTROL_TYPE_OPTIONS = [
  { value: 'chemical', label: '化学防治' },
  { value: 'bio', label: '生物防治' },
  { value: 'physical', label: '物理防治' },
];

export function PestControlFilter({
  filters,
  onChange,
  onSearch,
  onReset,
}: PestControlFilterProps) {
  const updateFilter = (key: string, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 防治类型 */}
        <div className="min-w-[140px]">
          <Label className="text-gray-700">防治类型</Label>
          <Select
            value={filters.controlType || ''}
            onValueChange={(val) => updateFilter('controlType', val)}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              {CONTROL_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 作物名称 */}
        <div className="flex-1 min-w-[140px]">
          <Label className="text-gray-700">作物名称</Label>
          <Input
            type="text"
            value={filters.cropName || ''}
            onChange={(e) => updateFilter('cropName', e.target.value)}
            placeholder="请输入作物名称"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 防治区域 */}
        <div className="flex-1 min-w-[140px]">
          <Label className="text-gray-700">防治区域</Label>
          <Input
            type="text"
            value={filters.greenhouseName || ''}
            onChange={(e) => updateFilter('greenhouseName', e.target.value)}
            placeholder="请输入防治区域"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 目标病虫害 */}
        <div className="flex-1 min-w-[140px]">
          <Label className="text-gray-700">目标病虫害</Label>
          <Input
            type="text"
            value={filters.targetPest || ''}
            onChange={(e) => updateFilter('targetPest', e.target.value)}
            placeholder="请输入目标病虫害"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 日期范围 - 开始 */}
        <div className="min-w-[150px]">
          <Label className="text-gray-700">开始日期</Label>
          <DatePicker
            selected={filters.startDate ? new Date(filters.startDate) : undefined}
            onChange={(date) => updateFilter('startDate', date.toISOString().split('T')[0])}
            className="w-full"
          />
        </div>

        {/* 日期范围 - 结束 */}
        <div className="min-w-[150px]">
          <Label className="text-gray-700">结束日期</Label>
          <DatePicker
            selected={filters.endDate ? new Date(filters.endDate) : undefined}
            onChange={(date) => updateFilter('endDate', date.toISOString().split('T')[0])}
            className="w-full"
          />
        </div>

        {/* 按钮行 */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onReset}
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onSearch}
          >
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}
