/**
 * 药剂知识库筛选工具栏组件
 * 筛选字段：药剂名称、生产厂家
 */
import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

interface PesticideLibraryFilterProps {
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
  onSearch: () => void;
  onReset: () => void;
}

export function PesticideLibraryFilter({
  filters,
  onChange,
  onSearch,
  onReset,
}: PesticideLibraryFilterProps) {
  const updateFilter = (key: string, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm mb-4">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 药剂名称 */}
        <div className="flex-1 min-w-[140px]">
          <Label className="text-gray-700">药剂名称</Label>
          <Input
            type="text"
            value={filters.pesticideName || ''}
            onChange={(e) => updateFilter('pesticideName', e.target.value)}
            placeholder="请输入药剂名称"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
          />
        </div>

        {/* 生产厂家 */}
        <div className="flex-1 min-w-[140px]">
          <Label className="text-gray-700">生产厂家</Label>
          <Input
            type="text"
            value={filters.manufacturer || ''}
            onChange={(e) => updateFilter('manufacturer', e.target.value)}
            placeholder="请输入生产厂家"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
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
