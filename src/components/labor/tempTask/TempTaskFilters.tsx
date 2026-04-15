import { Search, AlertTriangle, Clock } from 'lucide-react';
import { TempTask, TempTaskUrgency } from '../../../types';
import { TEMP_TASK_URGENCY_CONFIG } from '../../../types';

interface TempTaskFiltersProps {
  searchTerm: string;
  urgencyFilter: 'all' | TempTaskUrgency;
  statusFilter: 'all' | TempTask['status'];
  overdueFilter: 'all' | 'overdue' | 'warning';
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    critical: number;
    overdue: number;
    warning: number;
  };
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
  stats,
  onSearchChange,
  onUrgencyChange,
  onStatusChange,
  onOverdueChange,
}: TempTaskFiltersProps) {
  return (
    <div className="space-y-4">
      {/* 统计信息 + 紧急程度筛选 */}
      <div className="flex items-center justify-between">
        {/* 超时统计徽章 */}
        <div className="flex items-center gap-3">
          {stats.overdue > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              <span>已超时 {stats.overdue} 个</span>
            </div>
          )}
          {stats.warning > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
              <Clock className="w-4 h-4" />
              <span>即将到期 {stats.warning} 个</span>
            </div>
          )}
        </div>

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
    </div>
  );
}

export default TempTaskFilters;
