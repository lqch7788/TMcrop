/**
 * 问题分派筛选工具栏组件
 */

import React from 'react';
import { Send, Download, Trash2 } from 'lucide-react';
import { SourceFilter } from './SourceFilter';
import { Button } from '@/components/ui/button';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

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
  onExport: () => void;
  onCancelExport: () => void;
  onCancelBatchDelete: () => void;
  onCancelBatchDispatch: () => void;
  onConfirmDispatch?: () => void;    // 确认分派按钮回调
  onConfirmExport?: () => void;      // 确认导出按钮回调
  onConfirmDelete?: () => void;      // 确认删除按钮回调
  onCreate?: () => void;
  // 权限控制
  canCreate?: boolean;
  canDispatch?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
}

export function ProblemFilterToolbar({
  timeFilter,
  dateRange,
  onCreate,
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
  onExport,
  onCancelExport,
  onCancelBatchDelete,
  onCancelBatchDispatch,
  onConfirmDispatch,
  onConfirmExport,
  onConfirmDelete,
  canCreate = true,
  canDispatch = true,
  canDelete = true,
  canExport = true,
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
              <Button
                key={opt.value}
                variant="ghost"
                size="sm"
                onClick={() => onTimeFilterChange(opt.value as typeof timeFilter)}
                className={`rounded-none ${
                  timeFilter === opt.value
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* 自定义时间段筛选 */}
        {timeFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateRange.start}
              onChange={e => onDateRangeChange({ ...dateRange, start: e.target.value })}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-400">至</span>
            <Input
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
          <Select
            value={statusFilter}
            onValueChange={(val) => onStatusFilterChange(val as typeof statusFilter)}
          >
            <SelectTrigger className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-auto">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="pending">待分派</SelectItem>
              <SelectItem value="dispatched">已分派</SelectItem>
              <SelectItem value="handled">已处理</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 严重程度筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">严重程度：</span>
          <Select
            value={severityFilter}
            onValueChange={(val) => onSeverityFilterChange(val as typeof severityFilter)}
          >
            <SelectTrigger className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-auto">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="轻微">轻微</SelectItem>
              <SelectItem value="中等">中等</SelectItem>
              <SelectItem value="严重">严重</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 来源模块筛选 */}
        <SourceFilter
          value={sourceModuleFilter}
          onChange={onSourceModuleChange}
        />

        {/* 操作按钮 */}
        {exportMode ? (
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              onClick={onConfirmExport}
            >
              <Download className="w-4 h-4" />
              确认导出
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onCancelExport}
            >
              取消
            </Button>
          </div>
        ) : batchDeleteMode ? (
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={selectedRowsLength === 0}
            >
              <Trash2 className="w-4 h-4" />
              确认删除
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onCancelBatchDelete}
            >
              取消
            </Button>
          </div>
        ) : batchDispatchMode ? (
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="warning"
              onClick={onConfirmDispatch}
              disabled={selectedProblemsLength === 0}
            >
              <Send className="w-4 h-4" />
              确认分派
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onCancelBatchDispatch}
            >
              取消
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
