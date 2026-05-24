import { Search, RotateCw } from 'lucide-react';
import type { LeaveFiltersProps, LeaveType, LeaveStatus } from './types';
import { Button } from '@/components/ui/button';

/**
 * 请假管理筛选栏组件
 */
export function LeaveFilters({ filters, onFiltersChange, onSearch }: LeaveFiltersProps) {
  const leaveTypes: LeaveType[] = ['事假', '病假', '年假', '婚假', '产假', '陪产假', '丧假', '工伤假'];
  const statuses: LeaveStatus[] = ['待审批', '已通过', '已拒绝', '已取消'];

  // 重置筛选条件
  const handleReset = () => {
    onFiltersChange({
      staffName: '',
      leaveType: '',
      status: '',
      startDate: '',
      endDate: '',
    });
  };

  return (
    <div className="bg-[#F2F6FA] rounded-lg p-3">
      <div className="flex flex-wrap gap-3 items-end">
        {/* 员工姓名 */}
        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            value={filters.staffName}
            onChange={(e) => onFiltersChange({ ...filters, staffName: e.target.value })}
            placeholder="搜索姓名..."
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 请假类型 */}
        <div className="w-[140px]">
          <select
            value={filters.leaveType}
            onChange={(e) => onFiltersChange({ ...filters, leaveType: e.target.value as LeaveType | '' })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部类型</option>
            {leaveTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* 状态 */}
        <div className="w-[140px]">
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as LeaveStatus | '' })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部状态</option>
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCw className="w-4 h-4" />
            重置
          </Button>
          <Button size="sm" variant="default" onClick={onSearch}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}
