import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ScheduleRecord, ShiftConfig, ViewMode } from './types';
import { todayLocal } from '../../../lib/dateUtils';
import { useDispatchOccupations } from '../../../hooks/useDispatchOccupations';

interface ScheduleCalendarProps {
  viewMode: ViewMode;
  selectedDate: string;
  weekDateRange: string[];
  monthDateRange: string[];
  scheduleList: ScheduleRecord[];
  shiftConfigs: ShiftConfig[];
  onDateChange: (date: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onScheduleClick?: (record: ScheduleRecord) => void;
}

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// 获取班次颜色
function getShiftColor(shift: string, configs: ShiftConfig[]): string {
  const config = configs.find(c => c.name === shift);
  return config?.color || 'bg-gray-500';
}

// 规范化排班记录（兼容snake_case和camelCase）
function normalizeRecord(record: any): ScheduleRecord {
  return {
    ...record,
    staffName: record.staffName || record.staff_name || '',
    workZone: record.workZone || record.work_zone || '',
  };
}

// 获取日期显示格式
function formatDateDisplay(dateStr: string, viewMode: ViewMode): string {
  const date = new Date(dateStr);
  if (viewMode === 'day') {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return String(date.getDate());
}

// 判断是否是今天
function isToday(dateStr: string): boolean {
  return dateStr === new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
}

// 判断是否是选中日期
function isSelected(dateStr: string, selectedDate: string): boolean {
  return dateStr === selectedDate;
}

// 判断是否是当前月份(用于月视图)
function isCurrentMonth(dateStr: string, selectedDate: string): boolean {
  const date = new Date(dateStr);
  const selected = new Date(selectedDate);
  return date.getMonth() === selected.getMonth() && date.getFullYear() === selected.getFullYear();
}

export function ScheduleCalendar({
  viewMode,
  selectedDate,
  weekDateRange,
  monthDateRange,
  scheduleList,
  shiftConfigs,
  onDateChange,
  onViewModeChange,
  onScheduleClick,
}: ScheduleCalendarProps) {
  // ★ Batch 4 B4.2：拉取今日排班占用（用于单元格任务数角标）
  const today = todayLocal();
  const { occupations } = useDispatchOccupations(today);

  // 规范化数据（兼容snake_case和camelCase）
  const normalizedList = React.useMemo(() => scheduleList.map(normalizeRecord), [scheduleList]);

  // 上一天/下周/上月
  const handlePrev = () => {
    const date = new Date(selectedDate);
    if (viewMode === 'day') {
      date.setDate(date.getDate() - 1);
    } else if (viewMode === 'week') {
      date.setDate(date.getDate() - 7);
    } else {
      date.setMonth(date.getMonth() - 1);
    }
    onDateChange(date.toLocaleDateString('zh-CN').replace(/\//g, '-'));
  };

  // 下一天/下周/下月
  const handleNext = () => {
    const date = new Date(selectedDate);
    if (viewMode === 'day') {
      date.setDate(date.getDate() + 1);
    } else if (viewMode === 'week') {
      date.setDate(date.getDate() + 7);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    onDateChange(date.toLocaleDateString('zh-CN').replace(/\//g, '-'));
  };

  // 回到今天
  const handleToday = () => {
    onDateChange(new Date().toLocaleDateString('zh-CN').replace(/\//g, '-'));
  };

  // 获取某天的排班记录
  const getScheduleForDate = (dateStr: string) => {
    return normalizedList.filter(s => s.date === dateStr);
  };

  // 渲染月视图
  const renderMonthView = () => {
    const weeks: string[][] = [];
    for (let i = 0; i < monthDateRange.length; i += 7) {
      weeks.push(monthDateRange.slice(i, i + 7));
    }

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* 星期标题 */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {WEEKDAYS.map(day => (
            <div key={day} className="py-2 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>
        {/* 日期网格 */}
        <div className="grid grid-cols-7">
          {monthDateRange.map((dateStr, idx) => {
            const schedules = getScheduleForDate(dateStr);
            const today = isToday(dateStr);
            const selected = isSelected(dateStr, selectedDate);
            const currentMonth = isCurrentMonth(dateStr, selectedDate);

            return (
              <div
                key={dateStr}
                onClick={() => onDateChange(dateStr)}
                className={`
                  min-h-24 border-b border-r border-gray-300 p-1 cursor-pointer transition-colors
                  ${selected ? 'bg-blue-500' : 'bg-blue-50 hover:bg-blue-100'}
                  ${!currentMonth ? 'bg-gray-100' : ''}
                `}
              >
                <div className={`
                  text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${today ? 'bg-red-500 text-white' : ''}
                  ${!currentMonth ? 'text-gray-400' : selected ? 'text-white' : 'text-gray-700'}
                `}>
                  {formatDateDisplay(dateStr, 'month')}
                </div>
                {/* 排班标签 */}
                <div className="space-y-0.5">
                  {schedules.slice(0, 3).map(schedule => {
                    // ★ Batch 4 B4.2：仅今日单元格显示任务数角标（occupations 数据源绑定 today）
                    const taskCount = today
                      ? (occupations.find(o => o.workerId === schedule.staffId)?.assignedTaskCount ?? 0)
                      : 0;
                    return (
                      <div
                        key={schedule.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onScheduleClick?.(schedule);
                        }}
                        className={`
                          relative text-xs px-1 py-0.5 rounded truncate text-white cursor-pointer
                          ${getShiftColor(schedule.shift, shiftConfigs)}
                          ${schedule.status === '已取消' ? 'opacity-50 line-through' : ''}
                        `}
                      >
                        {schedule.staffName} {schedule.shift}
                        {taskCount > 0 && (
                          <span
                            className="absolute bottom-0.5 right-0.5 min-w-[16px] h-[16px] px-1
                                       rounded-full bg-red-500 text-white text-[10px] font-bold
                                       flex items-center justify-center"
                          >
                            {taskCount}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {schedules.length > 3 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{schedules.length - 3} 更多
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 渲染周视图
  const renderWeekView = () => {
    const schedules = getScheduleForDate(selectedDate);

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* 星期选择器 */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {weekDateRange.map(dateStr => {
            const date = new Date(dateStr);
            const today = isToday(dateStr);
            const selected = isSelected(dateStr, selectedDate);

            return (
              <div
                key={dateStr}
                onClick={() => onDateChange(dateStr)}
                className={`
                  py-3 text-center cursor-pointer transition-colors
                  ${selected ? 'bg-blue-500' : 'bg-blue-50 hover:bg-blue-100'}
                `}
              >
                <div className={`text-xs mb-1 ${selected ? 'text-white/80' : 'text-gray-500'}`}>
                  {WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]}
                </div>
                <div className={`
                  text-lg font-medium w-8 h-8 mx-auto flex items-center justify-center rounded-full
                  ${today ? 'bg-red-500 text-white' : ''}
                  ${selected ? 'text-white' : 'text-gray-700'}
                `}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* 排班详情 */}
        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-3">
            {new Date(selectedDate).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </h3>
          {schedules.length === 0 ? (
            <div className="text-gray-400 text-center py-8">暂无排班</div>
          ) : (
            <div className="space-y-2">
              {schedules.map(schedule => {
                const shiftConfig = shiftConfigs.find(c => c.name === schedule.shift);
                return (
                  <div
                    key={schedule.id}
                    onClick={() => onScheduleClick?.(schedule)}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border cursor-pointer
                      ${schedule.status === '已取消' ? 'bg-gray-50 opacity-60' : 'bg-white hover:bg-gray-50'}
                      ${schedule.status === '已执行' ? 'border-green-200' : 'border-gray-200'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${getShiftColor(schedule.shift, shiftConfigs)}`} />
                      <div>
                        <div className="font-medium text-gray-800">{schedule.staffName}</div>
                        <div className="text-sm text-gray-500">{schedule.workZone}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-700">{schedule.shift}</div>
                      <div className="text-sm text-gray-500">
                        {shiftConfig?.startTime} - {shiftConfig?.endTime}
                      </div>
                    </div>
                    <div className={`
                      px-2 py-1 rounded text-xs
                      ${schedule.status === '已排班' ? 'bg-blue-100 text-blue-700' : ''}
                      ${schedule.status === '已执行' ? 'bg-green-100 text-green-700' : ''}
                      ${schedule.status === '已取消' ? 'bg-gray-100 text-gray-600' : ''}
                    `}>
                      {schedule.status}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染日视图
  const renderDayView = () => {
    const schedules = getScheduleForDate(selectedDate);
    const date = new Date(selectedDate);

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-xl font-medium text-gray-800">
            {date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </h3>
        </div>
        <div className="p-4">
          {schedules.length === 0 ? (
            <div className="text-gray-400 text-center py-12">暂无排班</div>
          ) : (
            <div className="space-y-3">
              {schedules.map(schedule => {
                const shiftConfig = shiftConfigs.find(c => c.name === schedule.shift);
                return (
                  <div
                    key={schedule.id}
                    onClick={() => onScheduleClick?.(schedule)}
                    className={`
                      p-4 rounded-lg border cursor-pointer
                      ${schedule.status === '已取消' ? 'bg-gray-50 opacity-60' : 'bg-white hover:bg-gray-50'}
                      ${schedule.status === '已执行' ? 'border-green-200' : 'border-gray-200'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded ${getShiftColor(schedule.shift, shiftConfigs)}`} />
                        <span className="font-medium text-gray-800">{schedule.staffName}</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-600">{schedule.workZone}</span>
                      </div>
                      <span className={`
                        px-3 py-1 rounded-full text-sm
                        ${schedule.status === '已排班' ? 'bg-blue-100 text-blue-700' : ''}
                        ${schedule.status === '已执行' ? 'bg-green-100 text-green-700' : ''}
                        ${schedule.status === '已取消' ? 'bg-gray-100 text-gray-600' : ''}
                      `}>
                        {schedule.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-6 text-sm text-gray-500">
                      <span>班次: {schedule.shift}</span>
                      <span>时间: {shiftConfig?.startTime} - {shiftConfig?.endTime}</span>
                      {schedule.checkIn && <span>签到: {schedule.checkIn}</span>}
                      {schedule.checkOut && <span>签退: {schedule.checkOut}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToday}
            className="text-blue-600 hover:bg-blue-50"
          >
            今天
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </Button>
          <div className="ml-4 text-lg font-medium text-gray-800">
            {new Date(selectedDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
          </div>
        </div>

        {/* 视图切换 */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant={viewMode === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('month')}
            className={viewMode === 'month' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
          >
            月
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('week')}
            className={viewMode === 'week' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
          >
            周
          </Button>
          <Button
            variant={viewMode === 'day' ? 'default' : 'ghost'}
            size="sm"
            className={viewMode === 'day' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
            onClick={() => onViewModeChange('day')}
          >
            日
          </Button>
        </div>
      </div>

      {/* 日历内容 */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
    </div>
  );
}

export default ScheduleCalendar;
