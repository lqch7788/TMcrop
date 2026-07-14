/**
 * 种源筛选工具栏组件
 */

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { SeedSourceFilters, SourceType, SourceOrigin } from '../../../../types/crop';
import { Input } from '@/components/ui';
import { Label, DateRangePicker, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';
// V2 改造 (任务 13): source_origin 来源 9 枚举字典
import { SOURCE_ORIGINS, SOURCE_TYPES } from '../../../../constants/seedSourceDict';

interface SeedSourceFilterProps {
  filters: SeedSourceFilters;
  onChange: (filters: SeedSourceFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  cropCategories: Array<{ value: string; label: string }>;
  suppliers: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string }>;
}

export function SeedSourceFilter({
  filters,
  onChange,
  onSearch,
  onReset,
  cropCategories,
  suppliers,
  statusOptions
}: SeedSourceFilterProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 shadow-sm">
      {/* 2026-06-05: 强制单行布局，搜索/重置按键放最后（日期选择器 160px，避免按键换行） */}
      <div className="flex flex-nowrap gap-3 items-end">
        {/* 作物品种 */}
        <div className="flex-1 min-w-[120px]">
          <Label className="text-gray-700">作物品种</Label>
          <Input
            type="text"
            value={filters.cropName}
            onChange={(e) => onChange({ ...filters, cropName: e.target.value })}
            placeholder="请输入作物品种"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 种源批号 */}
        <div className="flex-1 min-w-[120px]">
          <Label className="text-gray-700">种源批号</Label>
          <Input
            type="text"
            value={filters.seedCode}
            onChange={(e) => onChange({ ...filters, seedCode: e.target.value })}
            placeholder="请输入种源批号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* V2 改造 (任务 13): 来源 (source_origin 9 枚举) */}
        <div className="min-w-[100px] flex-shrink-0">
          <Label className="text-gray-700">来源</Label>
          <Select
            value={filters.sourceOrigin || '__all__'}
            onValueChange={(val) => onChange({ ...filters, sourceOrigin: val === '__all__' ? '' : val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              {SOURCE_ORIGINS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 种源类型 (形态, V2 双下拉) */}
        <div className="min-w-[100px] flex-shrink-0">
          <Label className="text-gray-700">形态</Label>
          <Select
            value={filters.sourceType}
            onValueChange={(val) => onChange({ ...filters, sourceType: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              {SOURCE_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 供应商 */}
        <div className="min-w-[120px] flex-shrink-0">
          <Label className="text-gray-700">供应商</Label>
          <Select
            value={filters.supplierName}
            onValueChange={(val) => onChange({ ...filters, supplierName: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              {suppliers.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 状态 */}
        <div className="min-w-[100px] flex-shrink-0">
          <Label className="text-gray-700">状态</Label>
          <Select
            value={filters.status}
            onValueChange={(val) => onChange({ ...filters, status: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              {statusOptions.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 采购/入库日期 — 窄一点 (160px) */}
        <div className="min-w-[160px] flex-shrink-0">
          <Label className="text-gray-700">采购/入库日期</Label>
          <DateRangePicker
            startDate={filters.startDate ? new Date(filters.startDate) : undefined}
            endDate={filters.endDate ? new Date(filters.endDate) : undefined}
            onChange={(start, end) => {
              onChange({
                ...filters,
                startDate: start ? todayLocal(start) : '',
                endDate: end ? todayLocal(end) : ''
              });
            }}
            className="w-full !min-w-[160px]"
          />
        </div>

        {/* 按钮行：重置、搜索 — 放在所有搜索框之后，固定不缩小 */}
        <div className="flex gap-2 items-end flex-shrink-0 ml-auto">
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
