/**
 * 施肥管理筛选工具栏组件
 * 筛选字段：肥料名称、肥料类型(字典)、作物品种、温室位置、数据来源、日期范围、操作员
 */
import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { DictSelect } from '../../common/settings/DictSelect';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { DatePicker } from '../../ui/DatePicker';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../ui/select';

interface FertilizerFilterProps {
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
  onSearch: () => void;
  onReset: () => void;
}

export function FertilizerFilter({
  filters,
  onChange,
  onSearch,
  onReset,
}: FertilizerFilterProps) {
  const updateFilter = (key: string, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 肥料类型（字典选择） */}
        <div className="min-w-[140px]">
          <Label className="text-gray-700">肥料类型</Label>
          <DictSelect
            category="fertilizer_type"
            value={filters.fertilizerType || ''}
            onChange={(value) => updateFilter('fertilizerType', value)}
            placeholder="全部"
          />
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

        {/* 数据来源 */}
        <div className="min-w-[120px]">
          <Label className="text-gray-700">数据来源</Label>
          <Select
            value={filters.dataSource || ''}
            onValueChange={(val) => updateFilter('dataSource', val)}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">手动</SelectItem>
              <SelectItem value="auto_iot">IoT自动</SelectItem>
            </SelectContent>
          </Select>
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
            variant="secondary"
            onClick={onReset}
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
          <Button
            variant="default"
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
