import { Search, Plus } from 'lucide-react';
import type { LeaveFiltersProps, LeaveType, LeaveStatus } from './types';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Label } from '@/components/ui/label';

/**
 * 请假管理筛选栏组件
 */
export function LeaveFilters({ filters, onFiltersChange, onSearch, onAdd }: LeaveFiltersProps) {
  const leaveTypes: LeaveType[] = ['事假', '病假', '年假', '婚假', '产假', '陪产假', '丧假', '工伤假'];
  const statuses: LeaveStatus[] = ['待审批', '已通过', '已拒绝', '已取消'];

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 员工姓名 */}
        <div className="flex-1 min-w-[180px]">
          <Label className="block text-sm font-medium text-gray-700 mb-1">员工姓名</Label>
          <input
            type="text"
            value={filters.staffName}
            onChange={(e) => onFiltersChange({ ...filters, staffName: e.target.value })}
            placeholder="请输入姓名"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 请假类型 */}
        <div className="min-w-[150px]">
          <Label className="block text-sm font-medium text-gray-700 mb-1">请假类型</Label>
          <select
            value={filters.leaveType}
            onChange={(e) => onFiltersChange({ ...filters, leaveType: e.target.value as LeaveType | '' })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {leaveTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* 状态 */}
        <div className="min-w-[150px]">
          <Label className="block text-sm font-medium text-gray-700 mb-1">状态</Label>
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as LeaveStatus | '' })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {/* 开始日期 */}
        <div className="min-w-[150px]">
          <Label className="block text-sm font-medium text-gray-700 mb-1">开始日期</Label>
          <DatePicker
            selected={filters.startDate ? new Date(filters.startDate) : undefined}
            onChange={(date: Date) => onFiltersChange({ ...filters, startDate: date.toISOString().slice(0, 10) })}
            placeholder="选择开始日期"
          />
        </div>

        {/* 结束日期 */}
        <div className="min-w-[150px]">
          <Label className="block text-sm font-medium text-gray-700 mb-1">结束日期</Label>
          <DatePicker
            selected={filters.endDate ? new Date(filters.endDate) : undefined}
            onChange={(date: Date) => onFiltersChange({ ...filters, endDate: date.toISOString().slice(0, 10) })}
            placeholder="选择结束日期"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onSearch}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
          <Button size="sm" onClick={onAdd}>
            <Plus className="w-4 h-4" />
            新建请假
          </Button>
        </div>
      </div>
    </div>
  );
}
