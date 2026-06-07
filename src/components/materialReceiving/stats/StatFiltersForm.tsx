import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';

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
          <Label className="text-sm font-medium text-gray-700">时间:</Label>
          <DatePicker
            selected={dateRange.start ? new Date(dateRange.start) : undefined}
            onChange={(d) => onDateRangeChange({ ...dateRange, start: d.toISOString().slice(0, 10) })}
            placeholder="开始日期"
          />
          <span className="text-gray-400">至</span>
          <DatePicker
            selected={dateRange.end ? new Date(dateRange.end) : undefined}
            onChange={(d) => onDateRangeChange({ ...dateRange, end: d.toISOString().slice(0, 10) })}
            placeholder="结束日期"
          />
        </div>

        {/* 快捷筛选按钮 */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickFilter('currentWeek')}
            className={`${quickFilterPeriod === 'currentWeek'
                ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-500'
                : 'text-gray-700 hover:shadow-sm'
            }`}
          >
            本周
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickFilter('currentMonth')}
            className={`${quickFilterPeriod === 'currentMonth'
                ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-500'
                : 'text-gray-700 hover:shadow-sm'
            }`}
          >
            本月
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickFilter('currentQuarter')}
            className={`${quickFilterPeriod === 'currentQuarter'
                ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-500'
                : 'text-gray-700 hover:shadow-sm'
            }`}
          >
            本季
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickFilter('currentYear')}
            className={`${quickFilterPeriod === 'currentYear'
                ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-500'
                : 'text-gray-700 hover:shadow-sm'
            }`}
          >
            本年
          </Button>
        </div>

        {/* 重置按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-10"
        >
          <RefreshCw className="w-4 h-4" />
          重置
        </Button>
      </div>
    </div>
  );
};

export default StatFiltersForm;
