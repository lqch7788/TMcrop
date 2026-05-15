/**
 * 汇总表日期筛选器组件
 * 支持月份/季度/年度/自定义四种模式切换
 */

import { CalendarDays, CalendarRange } from 'lucide-react';

export interface SummaryDateFilterProps {
  /** 当前筛选模式 */
  mode: 'month' | 'quarter' | 'year' | 'custom';
  /** 模式切换回调 */
  onModeChange: (mode: 'month' | 'quarter' | 'year' | 'custom') => void;
  /** 开始日期 (YYYY-MM-DD) */
  startDate: string;
  /** 结束日期 (YYYY-MM-DD) */
  endDate: string;
  /** 日期变更回调 */
  onDateChange: (start: string, end: string) => void;
}

/** 模式选项配置 */
const MODE_OPTIONS: { value: 'month' | 'quarter' | 'year' | 'custom'; label: string }[] = [
  { value: 'month', label: '本月' },
  { value: 'quarter', label: '本季度' },
  { value: 'year', label: '本年度' },
  { value: 'custom', label: '自定义' },
];

export function SummaryDateFilter({ mode, onModeChange, startDate, endDate, onDateChange }: SummaryDateFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 模式切换分段按钮组 */}
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onModeChange(opt.value)}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${mode === opt.value
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 自定义日期范围输入（仅自定义模式显示） */}
      {mode === 'custom' && (
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onDateChange(e.target.value, endDate)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <span className="text-gray-400 text-sm">至</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onDateChange(startDate, e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <CalendarRange className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </div>
  );
}
