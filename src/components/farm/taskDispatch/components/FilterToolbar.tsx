/**
 * 筛选工具栏组件
 * 包含筛选条件和操作按钮
 */

import React from 'react';
import { Upload, Sparkles, List, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../../../ui/button';
import { STATUS_OPTIONS, TIME_FILTER_OPTIONS } from '../constants/taskDispatchConstants';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';

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
}: FilterToolbarProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <div className="flex flex-wrap items-end gap-4">
        {/* 筛选条件 - 均匀分布 grid */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* 任务ID搜索 */}
          <div>
            <Label className="text-xs text-gray-500">任务ID</Label>
            <Input
              type="text"
              value={taskIdSearch}
              onChange={(e) => onTaskIdChange(e.target.value)}
              placeholder="搜索任务ID"
              className="w-full px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* 时间范围筛选 */}
          <div>
            <Label className="text-xs text-gray-500">时间范围</Label>
            <Select
              value={timeFilter}
              onValueChange={(val) => onTimeFilterChange(val)}
            >
              <SelectTrigger className="w-full px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                {TIME_FILTER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 任务区域筛选 */}
          <div>
            <Label className="text-xs text-gray-500">任务区域编号</Label>
            <Select
              value={fieldFilter}
              onValueChange={(val) => onFieldFilterChange(val)}
            >
              <SelectTrigger className="w-full px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <SelectValue placeholder="全部任务区域" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部任务区域</SelectItem>
                {fields.map(f => (
                  <SelectItem key={f.id} value={f.name}>{f.name} ({f.crop})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 执行人筛选 */}
          <div>
            <Label className="text-xs text-gray-500">执行人</Label>
            <Select
              value={assigneeFilter}
              onValueChange={(val) => onAssigneeFilterChange(val)}
            >
              <SelectTrigger className="w-full px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <SelectValue placeholder="全部人员" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部人员</SelectItem>
                {staff.map(s => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 状态筛选 */}
          <div>
            <Label className="text-xs text-gray-500">状态</Label>
            <Select
              value={statusFilter}
              onValueChange={(val) => onStatusFilterChange(val)}
            >
              <SelectTrigger className="w-full px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={onResetFilters}
          >
            重置
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onImport}
          >
            <Upload className="w-4 h-4" />
            批量导入
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onSmartRecommend}
            className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 transition-all duration-300"
          >
            <Sparkles className="w-4 h-4" />
            智能推荐
          </Button>

          {/* 视图切换 */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewModeChange('list')}
              className={`rounded-none ${viewMode === 'list' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4" />
              列表
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewModeChange('calendar')}
              className={`rounded-none ${viewMode === 'calendar' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <CalendarIcon className="w-4 h-4" />
              日历
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
