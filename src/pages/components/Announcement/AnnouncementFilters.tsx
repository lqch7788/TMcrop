/**
 * 公告筛选器组件
 * 提供类型筛选和关键词搜索功能
 */
import { Search } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

import type { ReactNode } from 'react';

interface AnnouncementFiltersProps {
  searchKeyword: string;
  typeFilter: string;
  onSearchChange: (value: string) => void;
  onTypeChange: (type: string) => void;
  children?: ReactNode;
}

export default function AnnouncementFilters({
  searchKeyword,
  typeFilter,
  onSearchChange,
  onTypeChange,
  children,
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
              <Button
                key={type}
                variant={typeFilter === type ? 'blue' : 'ghost'}
                size="sm"
                onClick={() => onTypeChange(type)}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        {/* 关键词搜索 */}
        <div className="w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索公告标题或编号..."
              value={searchKeyword}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 操作按钮 */}
        {children && (
          <div className="flex items-center gap-3 ml-auto">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
