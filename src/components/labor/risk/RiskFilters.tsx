import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import type { RiskFilters, AlertLevel, AlertType } from './types';
import { AlertTypeNames, AlertLevelNames } from './types';

interface RiskFiltersProps {
  filters: RiskFilters;
  onUpdate: (filters: Partial<RiskFilters>) => void;
  onClear: () => void;
}

export function RiskFilters({ filters, onUpdate, onClear }: RiskFiltersProps) {
  const hasFilters = filters.alertType || filters.level || filters.status || filters.keyword;

  return (
    <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg">
      {/* 关键词搜索 */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="搜索预警标题、内容、人员..."
          value={filters.keyword || ''}
          onChange={(e) => onUpdate({ keyword: e.target.value || undefined })}
          className="pl-9 bg-white"
        />
      </div>

      {/* 预警类型筛选 */}
      <Select
        value={filters.alertType || 'all'}
        onValueChange={(value) =>
          onUpdate({ alertType: value === 'all' ? undefined : (value as AlertType) })
        }
      >
        <SelectTrigger className="w-[160px] bg-white">
          <SelectValue placeholder="预警类型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部类型</SelectItem>
          {(Object.keys(AlertTypeNames) as AlertType[]).map((type) => (
            <SelectItem key={type} value={type}>
              {AlertTypeNames[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 预警等级筛选 */}
      <Select
        value={filters.level || 'all'}
        onValueChange={(value) =>
          onUpdate({ level: value === 'all' ? undefined : (value as AlertLevel) })
        }
      >
        <SelectTrigger className="w-[140px] bg-white">
          <SelectValue placeholder="预警等级" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部等级</SelectItem>
          {(Object.keys(AlertLevelNames) as AlertLevel[]).map((level) => (
            <SelectItem key={level} value={level}>
              {AlertLevelNames[level]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 状态筛选 */}
      <Select
        value={filters.status || 'all'}
        onValueChange={(value) =>
          onUpdate({
            status: value === 'all' ? undefined : (value as 'pending' | 'handled'),
          })
        }
      >
        <SelectTrigger className="w-[120px] bg-white">
          <SelectValue placeholder="处理状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          <SelectItem value="pending">待处理</SelectItem>
          <SelectItem value="handled">已处理</SelectItem>
        </SelectContent>
      </Select>

      {/* 清除筛选 */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-gray-500">
          <X className="w-4 h-4 mr-1" />
          清除
        </Button>
      )}
    </div>
  );
}
