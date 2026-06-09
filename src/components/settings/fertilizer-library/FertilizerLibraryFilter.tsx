/**
 * 肥料知识库筛选工具栏组件
 * 筛选字段：肥料名称
 */
import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';

interface FertilizerLibraryFilterProps {
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
  onSearch: () => void;
  onReset: () => void;
}

export function FertilizerLibraryFilter({
  filters,
  onChange,
  onSearch,
  onReset,
}: FertilizerLibraryFilterProps) {
  const updateFilter = (key: string, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm mb-4">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 肥料名称 - 无标题搜索框 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={filters.fertilizerName || ''}
            onChange={(e) => updateFilter('fertilizerName', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="搜索肥料名称"
            className="w-full h-10 pl-10 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
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
