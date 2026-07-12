/**
 * 药剂库筛选器组件（扁平化 2026-07-12）
 * 筛选字段：药剂名称搜索、生产厂家、药剂类型
 */
import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Button, Input } from '@/components/ui';
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
    <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 flex-wrap">
        {/* 药剂名称搜索 */}
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={filters.pesticideName || ''}
            onChange={(e) => updateFilter('pesticideName', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="搜索药剂名称"
            className="w-full h-10 pl-10 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 生产厂家 */}
        <div className="w-[180px]">
          <Input
            type="text"
            value={filters.manufacturer || ''}
            onChange={(e) => updateFilter('manufacturer', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="生产厂家"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 药剂类型 */}
        <div className="w-[160px]">
          <DictSelect
            category="pesticide_type"
            value={filters.pesticide_type || ''}
            onChange={(val) => updateFilter('pesticide_type', val)}
            placeholder="药剂类型"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <Button variant="warning" size="sm" onClick={onReset}>
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
          <Button variant="default" size="sm" onClick={onSearch}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}
