import { Search } from 'lucide-react';
import { TempTask, TempTaskUrgency } from '../../../types';
import { TEMP_TASK_URGENCY_CONFIG } from '../../../types';

interface TempTaskFiltersProps {
  searchTerm: string;
  urgencyFilter: 'all' | TempTaskUrgency;
  statusFilter: 'all' | TempTask['status'];
  onSearchChange: (value: string) => void;
  onUrgencyChange: (value: 'all' | TempTaskUrgency) => void;
  onStatusChange: (value: 'all' | TempTask['status']) => void;
}

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待执行' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

export function TempTaskFilters({
  searchTerm,
  urgencyFilter,
  statusFilter,
  onSearchChange,
  onUrgencyChange,
  onStatusChange,
}: TempTaskFiltersProps) {
  return (
    <div className="space-y-4">
      {/* 紧急程度筛选 */}
      <div className="bg-white rounded-xl p-1 inline-flex shadow-sm">
        {(['all', 'normal', 'urgent', 'critical'] as const).map((urgency) => (
          <button
            key={urgency}
            onClick={() => onUrgencyChange(urgency)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              urgencyFilter === urgency
                ? urgency === 'critical'
                  ? 'bg-red-500 text-white'
                  : urgency === 'urgent'
                    ? 'bg-amber-500 text-white'
                    : urgency === 'normal'
                      ? 'bg-gray-500 text-white'
                      : 'bg-emerald-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {urgency === 'all' ? '全部' : TEMP_TASK_URGENCY_CONFIG[urgency].label}
          </button>
        ))}
      </div>

      {/* 搜索和状态筛选 */}
      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 搜索 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索任务名称、任务编号..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as 'all' | TempTask['status'])}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white min-w-[140px]"
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default TempTaskFilters;
