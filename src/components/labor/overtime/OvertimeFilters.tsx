import { Search, RotateCcw } from 'lucide-react';
import type { OvertimeFilters as OvertimeFiltersType, OvertimeType, OvertimeStatus } from './types';
import { Button } from '@/components/ui';
import { DatePicker } from '@/components/ui';

/**
 * 加班筛选栏组件
 */
interface OvertimeFiltersProps {
  filters: OvertimeFiltersType;
  onFiltersChange: (filters: OvertimeFiltersType) => void;
  onSearch: () => void;
}

const overtimeTypes: OvertimeType[] = ['普通加班', '周末加班', '节假日加班'];
const overtimeStatuses: OvertimeStatus[] = ['待审批', '已审批', '已驳回', '已取消'];

export function OvertimeFilters({ filters, onFiltersChange, onSearch }: OvertimeFiltersProps) {
  // 重置筛选条件
  const handleReset = () => {
    onFiltersChange({
      staffName: '',
      type: '',
      status: '',
      startDate: '',
      endDate: '',
    });
  };

  return (
    <div className="bg-[#F2F6FA] rounded-lg p-3">
      <div className="grid grid-cols-4 gap-3 items-end">
        {/* 员工姓名 */}
        <div>
          <input
            type="text"
            placeholder="员工姓名"
            value={filters.staffName}
            onChange={(e) => onFiltersChange({ ...filters, staffName: e.target.value })}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 加班类型 */}
        <div>
          <select
            value={filters.type}
            onChange={(e) => onFiltersChange({ ...filters, type: e.target.value as OvertimeType | '' })}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部类型</option>
            {overtimeTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* 审批状态 */}
        <div>
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as OvertimeStatus | '' })}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部状态</option>
            {overtimeStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {/* 按钮 */}
        <div className="flex gap-2">
          <Button size="sm" variant="warning" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
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

export default OvertimeFilters;
