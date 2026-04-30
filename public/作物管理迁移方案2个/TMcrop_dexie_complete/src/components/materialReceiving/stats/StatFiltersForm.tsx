import React from 'react';
import { RefreshCw } from 'lucide-react';

interface StatFiltersFormProps {
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  quickFilterPeriod: string;
  onQuickFilter: (period: string) => void;
  onReset: () => void;
}

export const StatFiltersForm: React.FC<StatFiltersFormProps> = ({
  dateRange,
  onDateRangeChange,
  quickFilterPeriod,
  onQuickFilter,
  onReset,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        {/* 时间范围 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">时间:</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-gray-400">至</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 快捷筛选按钮 */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onQuickFilter('currentWeek')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              quickFilterPeriod === 'currentWeek'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:shadow-sm'
            }`}
          >
            本周
          </button>
          <button
            onClick={() => onQuickFilter('currentMonth')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              quickFilterPeriod === 'currentMonth'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:shadow-sm'
            }`}
          >
            本月
          </button>
          <button
            onClick={() => onQuickFilter('currentQuarter')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              quickFilterPeriod === 'currentQuarter'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:shadow-sm'
            }`}
          >
            本季
          </button>
          <button
            onClick={() => onQuickFilter('currentYear')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              quickFilterPeriod === 'currentYear'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:shadow-sm'
            }`}
          >
            本年
          </button>
        </div>

        {/* 重置按钮 */}
        <button
          onClick={onReset}
          className="h-9 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          重置
        </button>
      </div>
    </div>
  );
};

export default StatFiltersForm;
console.log('组件创建成功: StatFiltersForm');
