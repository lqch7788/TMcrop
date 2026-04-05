import { Search, Filter, ChevronDown } from 'lucide-react';
import { TaskModeFilter } from './hooks/useTasksFilters';

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
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="bg-white rounded-xl p-1 inline-flex shadow-sm">
        {modeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onModeChange(option.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              modeFilter === option.value
                ? option.color
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
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

          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors bg-white">
            <Filter className="w-4 h-4" />
            更多筛选
          </button>
        </div>
      </div>
    </div>
  );
}

export default TasksFilters;
