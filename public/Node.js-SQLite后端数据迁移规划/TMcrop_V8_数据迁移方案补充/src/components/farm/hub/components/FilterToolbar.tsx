/**
 * 筛选工具栏组件
 * 包含筛选条件和操作按钮
 */

import React from 'react';
import { Upload, Sparkles, List, Calendar as CalendarIcon } from 'lucide-react';
import { STATUS_OPTIONS, TIME_FILTER_OPTIONS } from '../constants/taskDispatchConstants';

interface FilterToolbarProps {
  // 筛选值
  taskIdSearch: string;
  timeFilter: string;
  fieldFilter: string;
  assigneeFilter: string;
  statusFilter: string;

  // 数据
  fields: Array<{ id: string; name: string; crop: string }>;
  staff: Array<{ id: number; name: string }>;

  // 视图模式
  viewMode: 'list' | 'calendar';

  // 操作
  onTaskIdChange: (value: string) => void;
  onTimeFilterChange: (value: string) => void;
  onFieldFilterChange: (value: string) => void;
  onAssigneeFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onResetFilters: () => void;
  onImport: () => void;
  onSmartRecommend: () => void;
  onViewModeChange: (mode: 'list' | 'calendar') => void;
  // 权限控制
  canImport?: boolean;
  canSmartRecommend?: boolean;
}

export function FilterToolbar({
  taskIdSearch,
  timeFilter,
  fieldFilter,
  assigneeFilter,
  statusFilter,
  fields,
  staff,
  viewMode,
  onTaskIdChange,
  onTimeFilterChange,
  onFieldFilterChange,
  onAssigneeFilterChange,
  onStatusFilterChange,
  onResetFilters,
  onImport,
  onSmartRecommend,
  onViewModeChange,
  canImport = true,
  canSmartRecommend = true,
}: FilterToolbarProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <div className="flex flex-wrap items-end gap-4">
        {/* 筛选条件 - 均匀分布 grid */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* 任务ID搜索 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">任务ID</label>
            <input
              type="text"
              value={taskIdSearch}
              onChange={(e) => onTaskIdChange(e.target.value)}
              placeholder="搜索任务ID"
              className="w-full px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* 时间范围筛选 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">时间范围</label>
            <select
              value={timeFilter}
              onChange={(e) => onTimeFilterChange(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {TIME_FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 任务区域筛选 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">任务区域编号</label>
            <select
              value={fieldFilter}
              onChange={(e) => onFieldFilterChange(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">全部任务区域</option>
              {fields.map(f => (
                <option key={f.id} value={f.name}>{f.name} ({f.crop})</option>
              ))}
            </select>
          </div>

          {/* 执行人筛选 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">执行人</label>
            <select
              value={assigneeFilter}
              onChange={(e) => onAssigneeFilterChange(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">全部人员</option>
              {staff.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* 状态筛选 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onResetFilters}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg shadow-sm transition-colors"
          >
            重置
          </button>
          {canImport && (
            <button
              onClick={onImport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg shadow-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              批量导入
            </button>
          )}
          {canSmartRecommend && (
            <button
              onClick={onSmartRecommend}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white text-sm rounded-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 transition-all duration-300 animate-pulse-subtle"
            >
              <Sparkles className="w-4 h-4" />
              智能推荐
            </button>
          )}

          {/* 视图切换 */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden ml-2">
            <button
              onClick={() => onViewModeChange('list')}
              className={`px-3 py-2 flex items-center gap-1 text-sm ${viewMode === 'list' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4" />
              列表
            </button>
            <button
              onClick={() => onViewModeChange('calendar')}
              className={`px-3 py-2 flex items-center gap-1 text-sm ${viewMode === 'calendar' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <CalendarIcon className="w-4 h-4" />
              日历
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
