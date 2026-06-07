import { Search, Filter, ChevronDown } from 'lucide-react';
import { TaskModeFilter } from './hooks/useTasksFilters';
import { Button } from '@/components/ui';

interface TasksFiltersProps {
  searchTerm: string;
  typeFilter: string;
  statusFilter: string;
  modeFilter: TaskModeFilter;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onModeChange: (value: TaskModeFilter) => void;
}

const taskTypes = [
  { value: 'all', label: '全部任务' },
  { value: 'irrigation', label: '浇水' },
  { value: 'fertilization', label: '施肥' },
  { value: 'pruning', label: '整枝' },
  { value: 'harvest', label: '采收' },
  { value: 'scouting', label: '巡田' },
  { value: 'spraying', label: '打药' },
  { value: 'weeding', label: '除草' },
];

const taskStatuses = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待执行' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const modeOptions: { value: TaskModeFilter; label: string; color: string }[] = [
  { value: 'all', label: '全部模式', color: 'bg-emerald-600 text-white' },
  { value: 'glass', label: '玻璃温室模式', color: 'bg-purple-600 text-white' },
  { value: 'solar', label: '日光温室模式', color: 'bg-amber-500 text-white' },
  { value: 'field', label: '大田模式', color: 'bg-emerald-600 text-white' },
];

export function TasksFilters({
  searchTerm,
  typeFilter,
  statusFilter,
  modeFilter,
  onSearchChange,
  onTypeChange,
  onStatusChange,
  onModeChange,
}: TasksFiltersProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 模式选择下拉 */}
        <div className="relative">
          <select
            value={modeFilter}
            onChange={(e) => onModeChange(e.target.value as TaskModeFilter)}
            className="appearance-none w-full lg:w-44 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {modeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索任务名称、任务编号..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value)}
            className="appearance-none w-full lg:w-40 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {taskTypes.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="appearance-none w-full lg:w-40 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {taskStatuses.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4" />
          更多筛选
        </Button>
      </div>
    </div>
  );
}

export default TasksFilters;
