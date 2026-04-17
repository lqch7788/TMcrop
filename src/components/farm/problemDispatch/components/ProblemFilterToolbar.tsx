/**
 * 问题分派筛选工具栏组件
 */

import React from 'react';
import { Send, Download, Trash2 } from 'lucide-react';
import { SourceFilter } from './SourceFilter';

interface ProblemFilterToolbarProps {
  // 筛选状态
  timeFilter: 'all' | 'week' | 'month' | 'year' | 'custom';
  dateRange: { start: string; end: string };
  statusFilter: 'all' | 'pending' | 'dispatched' | 'handled';
  severityFilter: 'all' | '轻微' | '中等' | '严重';
  sourceModuleFilter: string;
  // 模式状态
  exportMode: boolean;
  batchDeleteMode: boolean;
  batchDispatchMode: boolean;
  selectedRowsLength: number;
  selectedProblemsLength: number;
  // 回调
  onTimeFilterChange: (value: 'all' | 'week' | 'month' | 'year' | 'custom') => void;
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onStatusFilterChange: (value: 'all' | 'pending' | 'dispatched' | 'handled') => void;
  onSeverityFilterChange: (value: 'all' | '轻微' | '中等' | '严重') => void;
  onSourceModuleChange: (value: any) => void;
  // 操作回调
  onBatchDispatch: () => void;
  onBatchDelete: () => void;
  onShowDeleteWarning: () => void;
  onExport: () => void;
  onCancelExport: () => void;
  onCancelBatchDelete: () => void;
  onCancelBatchDispatch: () => void;
}

export function ProblemFilterToolbar({
  timeFilter,
  dateRange,
  statusFilter,
  severityFilter,
  sourceModuleFilter,
  exportMode,
  batchDeleteMode,
  batchDispatchMode,
  selectedRowsLength,
  selectedProblemsLength,
  onTimeFilterChange,
  onDateRangeChange,
  onStatusFilterChange,
  onSeverityFilterChange,
  onSourceModuleChange,
  onBatchDispatch,
  onBatchDelete,
  onShowDeleteWarning,
  onExport,
  onCancelExport,
  onCancelBatchDelete,
  onCancelBatchDispatch,
}: ProblemFilterToolbarProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-4 flex-wrap">
        {/* 时间筛选 */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {[
              { value: 'all', label: '全部' },
              { value: 'week', label: '本周' },
              { value: 'month', label: '本月' },
              { value: 'year', label: '本年' },
              { value: 'custom', label: '时间段' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => onTimeFilterChange(opt.value as typeof timeFilter)}
                className={`px-3 py-1.5 text-sm ${
                  timeFilter === opt.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 自定义时间段筛选 */}
        {timeFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={e => onDateRangeChange({ ...dateRange, start: e.target.value })}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-400">至</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => onDateRangeChange({ ...dateRange, end: e.target.value })}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* 状态筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">状态：</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {[
              { value: 'all', label: '全部' },
              { value: 'pending', label: '待分派' },
              { value: 'dispatched', label: '已分派' },
              { value: 'handled', label: '已处理' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => onStatusFilterChange(opt.value as typeof statusFilter)}
                className={`px-3 py-1.5 text-sm ${
                  statusFilter === opt.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 严重程度筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">严重程度：</span>
          <select
            value={severityFilter}
            onChange={e => onSeverityFilterChange(e.target.value as typeof severityFilter)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部</option>
            <option value="轻微">轻微</option>
            <option value="中等">中等</option>
            <option value="严重">严重</option>
          </select>
        </div>

        {/* 来源模块筛选 */}
        <SourceFilter
          value={sourceModuleFilter}
          onChange={onSourceModuleChange}
        />

        {/* 操作按钮 */}
        {exportMode ? (
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onShowDeleteWarning}
              className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              确认导出
            </button>
            <button
              onClick={onCancelExport}
              className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
          </div>
        ) : batchDeleteMode ? (
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onShowDeleteWarning}
              disabled={selectedRowsLength === 0}
              className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              确认删除
            </button>
            <button
              onClick={onCancelBatchDelete}
              className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
          </div>
        ) : batchDispatchMode ? (
          <div className="flex gap-2 ml-auto">
            <button
              disabled={selectedProblemsLength === 0}
              className="h-8 px-3 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              确认分派
            </button>
            <button
              onClick={onCancelBatchDispatch}
              className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
          </div>
        ) : (
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onBatchDispatch}
              className="h-8 px-3 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 flex items-center gap-1"
            >
              <Send className="w-4 h-4" />
              批量分派
            </button>
            <button
              onClick={onExport}
              className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
