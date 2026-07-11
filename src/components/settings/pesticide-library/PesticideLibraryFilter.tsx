/**
 * 药剂知识库筛选工具栏组件
 * 筛选字段：药剂名称、生产厂家、药剂类型（2026-07-10 新增）
 */
import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
// 2026-07-10：药剂类型下拉（用 DictSelect 字典选择器）
import { DictSelect } from '@/components/common/settings/DictSelect';

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
        {/* 药剂名称 - 无标题搜索框 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={filters.pesticideName || ''}
            onChange={(e) => updateFilter('pesticideName', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="搜索药剂名称"
            className="w-full h-10 pl-10 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
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

        {/* 2026-07-10：药剂类型下拉过滤（按一级 + 二级 dictCode 精确匹配） */}
        <div className="flex-1 min-w-[160px]">
          <Label className="text-gray-700">药剂类型</Label>
          <DictSelect
            category="pesticide_type"
            value={filters.pesticideType || ''}
            onChange={(val) => updateFilter('pesticideType', val)}
            placeholder="全部类型"
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