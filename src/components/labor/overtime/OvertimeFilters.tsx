import { Search, Plus } from 'lucide-react';
import type { OvertimeFilters as OvertimeFiltersType, OvertimeType, OvertimeStatus } from './types';

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
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
            className="w-36 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 结束日期 */}
        <div className="flex-shrink-0">
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
            className="w-36 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 搜索按钮 */}
        <button
          onClick={onSearch}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Search className="w-4 h-4" />
          搜索
        </button>

        {/* 新增按钮 */}
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          申请加班
        </button>
      </div>
    </div>
  );
}

export default OvertimeFilters;
