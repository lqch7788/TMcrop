/**
 * 浇水记录筛选工具栏组件
 * 筛选字段：记录类型、作物品种、温室位置、日期范围、操作员
 * 2026-07-20：参照 FertilizerFilter 风格
 */
import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';

interface WaterFilterProps {
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
  onSearch: () => void;
  onReset: () => void;
}

export default function WaterFilter({
  filters,
  onChange,
  onSearch,
  onReset,
}: WaterFilterProps) {
  const updateFilter = (key: string, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 记录类型 */}
        <div className="min-w-[140px]">
          <Label className="text-gray-700">记录类型</Label>
          <Select
            value={filters.recordType || ''}
            onValueChange={(val) => updateFilter('recordType', val)}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              <SelectItem value="manual">手动录入</SelectItem>
              <SelectItem value="fertilizer_dilution">施肥稀释</SelectItem>
              <SelectItem value="daily_sync">每日记录同步</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 作物品种 */}
        <div className="flex-1 min-w-[140px]">
          <Label className="text-gray-700">作物品种</Label>
          <Input
            type="text"
            value={filters.cropName || ''}
            onChange={(e) => updateFilter('cropName', e.target.value)}
            placeholder="请输入作物品种"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 温室位置 */}
        <div className="flex-1 min-w-[140px]">
          <Label className="text-gray-700">温室位置</Label>
          <Input
            type="text"
            value={filters.greenhouseName || ''}
            onChange={(e) => updateFilter('greenhouseName', e.target.value)}
            placeholder="请输入温室位置"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 日期范围 - 开始 */}
        <div className="min-w-[150px]">
          <Label className="text-gray-700">开始日期</Label>
          <DatePicker
            selected={filters.startDate ? new Date(filters.startDate) : undefined}
            onChange={(date) => updateFilter('startDate', todayLocal(date))}
            className="w-full"
          />
        </div>

        {/* 日期范围 - 结束 */}
        <div className="min-w-[150px]">
          <Label className="text-gray-700">结束日期</Label>
          <DatePicker
            selected={filters.endDate ? new Date(filters.endDate) : undefined}
            onChange={(date) => updateFilter('endDate', todayLocal(date))}
            className="w-full"
          />
        </div>

        {/* 操作员 */}
        <div className="flex-1 min-w-[120px]">
          <Label className="text-gray-700">操作员</Label>
          <Input
            type="text"
            value={filters.operatorName || ''}
            onChange={(e) => updateFilter('operatorName', e.target.value)}
            placeholder="请输入操作员"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 按钮行 */}
        <div className="flex gap-2">
          <Button
            variant="warning"
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