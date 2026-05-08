/**
 * 工人考勤 - 筛选栏组件
 */
import { Search } from 'lucide-react';
import { AttendanceFilters, DEPT_OPTIONS } from './types';
import { Button } from '@/components/ui/button';

interface WorkerAttendanceFiltersProps {
  filters: AttendanceFilters;
  onFiltersChange: (filters: Partial<AttendanceFilters>) => void;
}

export function WorkerAttendanceFilters({
  filters,
  onFiltersChange,
}: WorkerAttendanceFiltersProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 时间筛选 */}
        <div className="flex-1 min-w-[250px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">时间</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onFiltersChange({ startDate: e.target.value })}
              className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
            <span className="text-gray-500">至</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onFiltersChange({ endDate: e.target.value })}
              className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* 部门筛选 */}
        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
          <select
            value={filters.dept}
            onChange={(e) => onFiltersChange({ dept: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {DEPT_OPTIONS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* 姓名/工号筛选 */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">姓名/工号</label>
          <input
            type="text"
            value={filters.keyword}
            onChange={(e) => onFiltersChange({ keyword: e.target.value })}
            placeholder="请输入"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button size="sm" variant="secondary">
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}