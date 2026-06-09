/**
 * 日历视图组件
 * 功能：按日/周/月展示任务安排
 */

import React, { useState, useMemo } from 'react';
import { Task } from '../../../hooks/useTasks';
import {
  format,
  isSameDay,
  parseISO,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  addMonths,
  subWeeks,
  subMonths,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  isToday,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui';

type CalendarViewType = 'day' | 'week' | 'month';

interface CalendarViewProps {
  tasks: Task[];
  onSelectTask?: (task: Task) => void;
  onSelectDate?: (date: Date) => void;
}

// 获取某天的任务
function getTasksForDate(date: Date, tasks: Task[]): Task[] {
  return tasks.filter(task => {
    try {
      if (!task.dueDate) return false;
      const taskDate = parseISO(task.dueDate);
      return isSameDay(taskDate, date);
    } catch {
      return false;
    }
  });
}

// 星期标题
const weekDaysZh = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// 状态颜色映射
const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600' },
  pending: { bg: 'bg-blue-100', text: 'text-blue-600' },
  accepted: { bg: 'bg-cyan-100', text: 'text-cyan-600' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
  waiting_acceptance: { bg: 'bg-purple-100', text: 'text-purple-600' },
  completed: { bg: 'bg-green-100', text: 'text-green-600' },
  rejected: { bg: 'bg-red-100', text: 'text-red-600' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-400' },
  abandoned: { bg: 'bg-orange-100', text: 'text-orange-600' },
};

// 任务类型颜色
const typeColors = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
];

function getTypeColor(typeName?: string): string {
  if (!typeName) return typeColors[0];
  const hash = typeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return typeColors[hash % typeColors.length];
}

/**
 * 日视图组件
 */
function DayView({
  date,
  tasks,
  onSelectTask,
}: {
  date: Date;
  tasks: Task[];
  onSelectTask?: (task: Task) => void;
}) {
  const dayTasks = getTasksForDate(date, tasks);

  return (
    <div className="space-y-4">
      {dayTasks.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CalendarIcon className="w-12 h-12 mx-auto mb-2" />
          <p>当天没有任务安排</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayTasks.map(task => (
            <div
              key={task.id}
              onClick={() => onSelectTask?.(task)}
              className={`p-4 rounded-xl border border-gray-100 hover:shadow-md cursor-pointer transition-shadow ${
                task.status === 'completed' ? 'bg-gray-50' :
                task.status === 'in_progress' ? 'bg-blue-50' :
                task.status === 'pending' ? 'bg-white' :
                task.status === 'rejected' ? 'bg-red-50' :
                'bg-orange-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${getTypeColor(task.typeName)}`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {task.greenhouseName || task.fieldName || ''} · {task.assigneeName || '未分配'}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  statusColors[task.status]?.bg || 'bg-gray-100'
                } ${statusColors[task.status]?.text || 'text-gray-600'}`}>
                  {task.statusName || task.status}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                <span>计划：{task.dueDate || '未设置'}</span>
                <span>进度：{task.progress || 0}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 周视图组件
 */
function WeekView({
  month,
  tasks,
  onSelectDate,
  onSelectTask,
}: {
  month: Date;
  tasks: Task[];
  onSelectDate?: (date: Date) => void;
  onSelectTask?: (task: Task) => void;
}) {
  const weekStart = startOfWeek(month, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* 星期头部 */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day, i) => (
            <div
              key={i}
              className={`text-center py-2 rounded-lg ${isToday(day) ? 'bg-emerald-100' : 'bg-gray-50'}`}
            >
              <div className="text-xs text-gray-500">{weekDaysZh[i]}</div>
              <div className={`text-lg font-medium ${isToday(day) ? 'text-emerald-600' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* 任务网格 */}
        <div className="grid grid-cols-7 gap-2 min-h-[400px]">
          {weekDays.map((day, dayIndex) => {
            const dayTasks = getTasksForDate(day, tasks);
            return (
              <div
                key={dayIndex}
                onClick={() => onSelectDate?.(day)}
                className={`rounded-lg p-2 min-h-[400px] cursor-pointer transition-colors ${
                  isToday(day) ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="space-y-1">
                  {dayTasks.length === 0 ? (
                    <div className="text-center text-gray-300 text-xs py-4">-</div>
                  ) : (
                    dayTasks.slice(0, 5).map(task => (
                      <div
                        key={task.id}
                        onClick={(e) => { e.stopPropagation(); onSelectTask?.(task); }}
                        className={`px-2 py-1 rounded text-xs text-white truncate cursor-pointer ${getTypeColor(task.typeName)}`}
                        title={`${task.title} - ${task.greenhouseName || ''}`}
                      >
                        {task.title || task.typeName || '任务'}
                      </div>
                    ))
                  )}
                  {dayTasks.length > 5 && (
                    <div className="text-xs text-gray-500 text-center">+{dayTasks.length - 5} 更多</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 月视图组件
 */
function MonthView({
  month,
  tasks,
  onSelectDate,
  onSelectTask,
}: {
  month: Date;
  tasks: Task[];
  onSelectDate?: (date: Date) => void;
  onSelectTask?: (task: Task) => void;
}) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = startOfWeek(monthEnd, { weekStartsOn: 1 });

  // 生成日历格子
  const days = eachDayOfInterval({ start: calendarStart, end: addDays(calendarEnd, 6) });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* 星期头部 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDaysZh.map((day, i) => (
            <div key={i} className="text-center py-2 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-600">{day}</div>
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="space-y-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map((day, dayIndex) => {
                const dayTasks = getTasksForDate(day, tasks);
                const isCurrentMonth = isSameMonth(day, month);
                return (
                  <div
                    key={dayIndex}
                    onClick={() => onSelectDate?.(day)}
                    className={`min-h-[80px] p-2 rounded-lg cursor-pointer transition-colors ${
                      !isCurrentMonth ? 'bg-gray-50 text-gray-300' :
                      isToday(day) ? 'bg-emerald-100 hover:bg-emerald-200' :
                      'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isToday(day) ? 'text-emerald-600' : 'text-gray-700'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 3).map(task => (
                        <div
                          key={task.id}
                          onClick={(e) => { e.stopPropagation(); onSelectTask?.(task); }}
                          className={`px-1 py-0.5 rounded text-xs text-white truncate ${getTypeColor(task.typeName)}`}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-gray-500">+{dayTasks.length - 3}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 日历视图主组件
 */
export function CalendarView({ tasks, onSelectTask, onSelectDate }: CalendarViewProps) {
  const [viewType, setViewType] = useState<CalendarViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // 导航函数
  const goToPrevious = () => {
    if (viewType === 'day') {
      setCurrentDate(prev => addDays(prev, -1));
    } else if (viewType === 'week') {
      setCurrentDate(prev => subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => subMonths(prev, 1));
    }
  };

  const goToNext = () => {
    if (viewType === 'day') {
      setCurrentDate(prev => addDays(prev, 1));
    } else if (viewType === 'week') {
      setCurrentDate(prev => addWeeks(prev, 1));
    } else {
      setCurrentDate(prev => addMonths(prev, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    if (viewType === 'month') {
      setViewType('day');
    }
    onSelectDate?.(date);
  };

  // 获取标题
  const getTitle = () => {
    if (viewType === 'day') {
      return format(currentDate, 'yyyy年M月d日 EEEE', { locale: zhCN });
    } else if (viewType === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, 'M月d日', { locale: zhCN })} - ${format(weekEnd, 'M月d日', { locale: zhCN })}`;
    } else {
      return format(currentDate, 'yyyy年M月', { locale: zhCN });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* 日历头部导航 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </Button>
          <h2 className="text-xl font-semibold text-gray-900">
            {getTitle()}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          >
            今天
          </Button>
        </div>

        {/* 视图切换 */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(['day', 'week', 'month'] as CalendarViewType[]).map((type) => (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              onClick={() => setViewType(type)}
              className={`${
                viewType === type
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {type === 'day' ? '日' : type === 'week' ? '周' : '月'}
            </Button>
          ))}
        </div>
      </div>

      {/* 日历内容 */}
      <div className="mt-4">
        {viewType === 'day' && (
          <DayView
            date={selectedDate || currentDate}
            tasks={tasks}
            onSelectTask={onSelectTask}
          />
        )}
        {viewType === 'week' && (
          <WeekView
            month={currentDate}
            tasks={tasks}
            onSelectDate={handleSelectDate}
            onSelectTask={onSelectTask}
          />
        )}
        {viewType === 'month' && (
          <MonthView
            month={currentDate}
            tasks={tasks}
            onSelectDate={handleSelectDate}
            onSelectTask={onSelectTask}
          />
        )}
      </div>
    </div>
  );
}

export default CalendarView;
