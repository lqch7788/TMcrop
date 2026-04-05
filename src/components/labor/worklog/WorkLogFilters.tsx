import { Search, Plus } from 'lucide-react';
import type { WorkLogFiltersProps } from './types';

/**
 * 工作日志筛选栏组件
 */
export function WorkLogFilters({ filters, onFiltersChange, onSearch, onAdd }: WorkLogFiltersProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 日期筛选 */}
        <div className="min-w-[180px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => onFiltersChange({ ...filters, date: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 工人筛选 */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">工人</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">大棚</label>
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
          <button
            onClick={onSearch}
            className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            搜索
          </button>
          <button
            onClick={onAdd}
            className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新建日志
          </button>
        </div>
      </div>
    </div>
  );
}
