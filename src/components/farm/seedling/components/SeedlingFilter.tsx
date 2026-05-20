/**
 * 育苗筛选工具栏组件
 */

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { SeedlingFilters } from '../../../../types/crop';
import { Button } from '@/components/ui/button';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

interface SeedlingFilterProps {
  filters: SeedlingFilters;
  onChange: (filters: SeedlingFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  cropNames: Array<{ value: string; label: string }>;
  seedlingTypes: Array<{ value: string; label: string }>;
  sites: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string }>;
}

export function SeedlingFilter({
  filters,
  onChange,
  onSearch,
  onReset,
  cropNames,
  seedlingTypes,
  sites,
  statusOptions
}: SeedlingFilterProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 作物品种 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">作物品种</label>
          <Select
            value={filters.cropName}
            onValueChange={(val) => onChange({ ...filters, cropName: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {cropNames.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 育苗批号 */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">育苗批号</label>
          <Input
            type="text"
            value={filters.seedlingCode}
            onChange={(e) => onChange({ ...filters, seedlingCode: e.target.value })}
            placeholder="请输入育苗批号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 育苗方式 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">育苗方式</label>
          <Select
            value={filters.seedlingType}
            onValueChange={(val) => onChange({ ...filters, seedlingType: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {seedlingTypes.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 种源批号 */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">种源批号</label>
          <Input
            type="text"
            value={filters.sourceCode}
            onChange={(e) => onChange({ ...filters, sourceCode: e.target.value })}
            placeholder="请输入种源批号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 温室场地 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">温室场地</label>
          <Select
            value={filters.siteName}
            onValueChange={(val) => onChange({ ...filters, siteName: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {sites.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 状态 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
          <Select
            value={filters.status}
            onValueChange={(val) => onChange({ ...filters, status: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {statusOptions.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 按钮行 */}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onReset}>
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
          <Button onClick={onSearch}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>

    </div>
  );
}
