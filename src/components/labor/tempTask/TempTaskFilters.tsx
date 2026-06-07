import { Search, AlertTriangle, Clock } from 'lucide-react';
import { TempTask, TempTaskUrgency } from '../../../types';
import { TEMP_TASK_URGENCY_CONFIG } from '../../../types';
import { Button } from '@/components/ui';

interface TempTaskFiltersProps {
  searchTerm: string;
  urgencyFilter: 'all' | TempTaskUrgency;
  statusFilter: 'all' | TempTask['status'];
  overdueFilter: 'all' | 'overdue' | 'warning';
  onSearchChange: (value: string) => void;
  onUrgencyChange: (value: 'all' | TempTaskUrgency) => void;
  onStatusChange: (value: 'all' | TempTask['status']) => void;
  onOverdueChange: (value: 'all' | 'overdue' | 'warning') => void;
}

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待执行' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const overdueOptions = [
  { value: 'all', label: '全部' },
  { value: 'overdue', label: '已超时' },
  { value: 'warning', label: '即将到期' },
];

export function TempTaskFilters({
  searchTerm,
  urgencyFilter,
  statusFilter,
  overdueFilter,
  onSearchChange,
  onUrgencyChange,
  onStatusChange,
  onOverdueChange,
}: TempTaskFiltersProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        {/* 紧急程度筛选（放在搜索框前面） */}
        <div className="bg-white rounded-xl p-1 inline-flex shadow-sm flex-shrink-0">
          {(['all', 'normal', 'urgent', 'critical'] as const).map((urgency) => (
            <Button
              key={urgency}
              onClick={() => onUrgencyChange(urgency)}
              variant={urgencyFilter === urgency ? 'default' : 'ghost'}
              size="sm"
              className={`transition-all ${
                urgencyFilter === urgency
                  ? urgency === 'critical'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : urgency === 'urgent'
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : urgency === 'normal'
                        ? 'bg-gray-500 hover:bg-gray-600 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'text-gray-600'
              }`}
            >
              {urgency === 'all' ? '全部' : TEMP_TASK_URGENCY_CONFIG[urgency].label}
            </Button>
          ))}
        </div>

        {/* 搜索 */}
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索任务名称、任务编号..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* 超时筛选 */}
        <select
          value={overdueFilter}
          onChange={(e) => onOverdueChange(e.target.value as 'all' | 'overdue' | 'warning')}
          className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white min-w-[120px]"
        >
          {overdueOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

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
  );
}

export default TempTaskFilters;
