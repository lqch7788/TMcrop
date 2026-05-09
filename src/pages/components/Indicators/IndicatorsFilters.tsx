/**
 * 指标筛选器组件
 * 提供类别筛选和关键词搜索功能
 */
import { Search } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { IndicatorCategory } from '../../types/indicators.types';
import { CATEGORIES } from '../../hooks/useIndicators';

interface IndicatorsFiltersProps {
  searchKeyword: string;
  categoryFilter: IndicatorCategory;
  onSearchChange: (value: string) => void;
  onCategoryChange: (category: IndicatorCategory) => void;
}

export default function IndicatorsFilters({
  searchKeyword,
  categoryFilter,
  onSearchChange,
  onCategoryChange,
}: IndicatorsFiltersProps) {

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        {/* 类别筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">类别：</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? 'blue' : 'ghost'}
                onClick={() => onCategoryChange(cat)}
                className="text-xs"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* 关键词搜索 */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索指标名称或编码..."
              value={searchKeyword}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
