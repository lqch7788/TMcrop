/**
 * 任务类型Tab筛选组件
 */

import { TaskFilterType } from './types';

interface TaskFilterTabsProps {
  taskFilter: TaskFilterType;
  taskCounts: {
    all: number;
    problem: number;
    production: number;
    temp: number;
  };
  onFilterChange: (filter: TaskFilterType) => void;
}

/**
 * 任务类型Tab筛选组件
 */
export function TaskFilterTabs({
  taskFilter,
  taskCounts,
  onFilterChange,
}: TaskFilterTabsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            taskFilter === 'all'
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          全部任务
          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
            {taskCounts.all}
          </span>
        </button>
        <button
          onClick={() => onFilterChange('production')}
          className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            taskFilter === 'production'
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          农事任务处理
          <span className="px-2 py-0.5 bg-blue-200 text-blue-600 rounded-full text-xs">
            {taskCounts.production}
          </span>
        </button>
        <button
          onClick={() => onFilterChange('temp')}
          className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            taskFilter === 'temp'
              ? 'border-orange-500 text-orange-600 bg-orange-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          临时任务处理
          <span className="px-2 py-0.5 bg-orange-200 text-orange-600 rounded-full text-xs">
            {taskCounts.temp}
          </span>
        </button>
        <button
          onClick={() => onFilterChange('problem')}
          className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            taskFilter === 'problem'
              ? 'border-orange-500 text-orange-600 bg-orange-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          巡查反馈处理
          <span className="px-2 py-0.5 bg-orange-200 text-orange-600 rounded-full text-xs">
            {taskCounts.problem}
          </span>
        </button>
      </div>
    </div>
  );
}

export default TaskFilterTabs;
