import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/DatePicker';
import type { WorkLogFiltersProps } from './types';
import { Label } from '@/components/ui/label';

/**
 * 工作日志筛选栏组件
 */
export function WorkLogFilters({ filters, onFiltersChange, onSearch }: WorkLogFiltersProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 日期筛选 */}
        <div className="min-w-[180px]">
          <Label className="block text-sm font-medium text-gray-700 mb-1">日期</Label>
          <DatePicker
            selected={filters.date ? new Date(filters.date) : undefined}
            onChange={(date) => onFiltersChange({ ...filters, date: date.toISOString().split('T')[0] })}
            className="w-full"
          />
        </div>

        {/* 工人筛选 */}
        <div className="flex-1 min-w-[180px]">
          <Label className="block text-sm font-medium text-gray-700 mb-1">工人</Label>
          <input
            type="text"
            value={filters.worker}
            onChange={(e) => onFiltersChange({ ...filters, worker: e.target.value })}
            placeholder="请输入姓名"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 大棚筛选 */}
        <div className="min-w-[150px]">
          <Label className="block text-sm font-medium text-gray-700 mb-1">大棚</Label>
          <select
            value={filters.greenhouse}
            onChange={(e) => onFiltersChange({ ...filters, greenhouse: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option>全部</option>
            <option>1号棚</option>
            <option>2号棚</option>
            <option>3号棚</option>
            <option>4号棚</option>
            <option>5号棚</option>
            <option>6号棚</option>
          </select>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onSearch}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}
