import { Search, Plus } from 'lucide-react';
import type { OvertimeFilters as OvertimeFiltersType, OvertimeType, OvertimeStatus } from './types';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/DatePicker';

/**
 * 加班筛选栏组件
 */
interface OvertimeFiltersProps {
  filters: OvertimeFiltersType;
  onFiltersChange: (filters: OvertimeFiltersType) => void;
  onSearch: () => void;
  onAdd: () => void;
}

const overtimeTypes: OvertimeType[] = ['普通加班', '周末加班', '节假日加班'];
const overtimeStatuses: OvertimeStatus[] = ['待审批', '已审批', '已驳回', '已取消'];

export function OvertimeFilters({ filters, onFiltersChange, onSearch, onAdd }: OvertimeFiltersProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex flex-wrap gap-3">
        {/* 员工姓名 */}
        <div className="flex-shrink-0">
          <input
            type="text"
            placeholder="员工姓名"
            value={filters.staffName}
            onChange={(e) => onFiltersChange({ ...filters, staffName: e.target.value })}
            className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 加班类型 */}
        <div className="flex-shrink-0">
          <select
            value={filters.type}
            onChange={(e) => onFiltersChange({ ...filters, type: e.target.value as OvertimeType | '' })}
            className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">全部类型</option>
            {overtimeTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* 审批状态 */}
        <div className="flex-shrink-0">
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as OvertimeStatus | '' })}
            className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">全部状态</option>
            {overtimeStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {/* 开始日期 */}
        <div className="flex-shrink-0">
          <DatePicker
            selected={filters.startDate ? new Date(filters.startDate) : undefined}
            onChange={(date: Date) => onFiltersChange({ ...filters, startDate: date.toISOString().slice(0, 10) })}
            placeholder="开始日期"
          />
        </div>

        {/* 结束日期 */}
        <div className="flex-shrink-0">
          <DatePicker
            selected={filters.endDate ? new Date(filters.endDate) : undefined}
            onChange={(date: Date) => onFiltersChange({ ...filters, endDate: date.toISOString().slice(0, 10) })}
            placeholder="结束日期"
          />
        </div>

        {/* 搜索按钮 */}
        <Button onClick={onSearch}>
          <Search className="w-4 h-4" />
          搜索
        </Button>

        {/* 新增按钮 */}
        <Button variant="blue" onClick={onAdd}>
          <Plus className="w-4 h-4" />
          申请加班
        </Button>
      </div>
    </div>
  );
}

export default OvertimeFilters;
