/**
 * 公告筛选器组件
 * 提供类型筛选和关键词搜索功能
 */
import { Search } from 'lucide-react';

interface AnnouncementFiltersProps {
  searchKeyword: string;
  typeFilter: string;
  onSearchChange: (value: string) => void;
  onTypeChange: (type: string) => void;
}

export default function AnnouncementFilters({
  searchKeyword,
  typeFilter,
  onSearchChange,
  onTypeChange,
}: AnnouncementFiltersProps) {
  const types = ['全部', '生产公告', '行政公告'];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        {/* 类型筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">类型：</span>
          <div className="flex flex-wrap gap-2">
            {types.map(type => (
              <button
                key={type}
                onClick={() => onTypeChange(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  typeFilter === type
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-blue-50 border border-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* 关键词搜索 */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索公告标题或编号..."
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
