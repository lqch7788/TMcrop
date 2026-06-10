/**
 * 工人考勤 - 筛选栏组件
 */
import { Search, RotateCcw } from 'lucide-react';
import { AttendanceFilters, DEPT_OPTIONS } from './types';
import { Button } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Label } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';

interface WorkerAttendanceFiltersProps {
  filters: AttendanceFilters;
  onFiltersChange: (filters: Partial<AttendanceFilters>) => void;
}

export function WorkerAttendanceFilters({
  filters,
  onFiltersChange,
}: WorkerAttendanceFiltersProps) {
  // 重置筛选条件
  const handleReset = () => {
    onFiltersChange({
      startDate: '',
      endDate: '',
      dept: '全部',
      keyword: '',
    });
  };

  return (
    <div className="bg-[#F2F6FA] rounded-lg p-3">
      <div className="grid grid-cols-4 gap-3 items-end">
        {/* 时间筛选 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">时间</Label>
          <div className="grid grid-cols-2 gap-1 items-center">
            <DatePicker
              selected={filters.startDate ? new Date(filters.startDate) : undefined}
              onChange={(date: Date) => onFiltersChange({ startDate: todayLocal(date) })}
              placeholder="开始"
            />
            <DatePicker
              selected={filters.endDate ? new Date(filters.endDate) : undefined}
              onChange={(date: Date) => onFiltersChange({ endDate: todayLocal(date) })}
              placeholder="结束"
            />
          </div>
        </div>

        {/* 部门筛选 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">部门</Label>
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
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">姓名/工号</Label>
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
          <Button size="sm" variant="warning" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
          <Button size="sm" variant="default" onClick={() => onFiltersChange({ ...filters })}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}