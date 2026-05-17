/**
 * 每日工单汇总数据 Hook
 *
 * 数据源（升级方案V1.0）：
 * - 主数据源：useTasks → farmTaskStore → API，按任务聚合
 * - 补充数据：usePersistentWorkLogs，用于获取实际工时/人数
 *
 * 设计原则：聚合所有 TaskRecord（来自 useTasks），按执行人/日期/任务来源展示
 */

import { useState, useEffect, useMemo } from 'react';
import type { DailyWorkSummaryRow, DailyWorkStatCard, DailyWorkFilters } from '../types/views';
import { usePersistentWorkLogs } from './usePersistentWorkLogs';
import { usePersistentAttendance } from './usePersistentAttendance';
import { useTasks, TASK_STATUS_CONFIG } from './useTasks';

/**
 * 每日工单汇总数据 Hook
 * 以任务为主数据源，工作日志作为补充（工时/人数）
 */
export function useDailyWorkSummary(filters?: DailyWorkFilters) {
  const [loading, setLoading] = useState(true);
  const { workLogs } = usePersistentWorkLogs();
  const { attendance } = usePersistentAttendance();
  const { tasks } = useTasks();

  // 模拟异步加载
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [filters?.date, filters?.greenhouse, filters?.taskType]);

  // 聚合每日工单数据（主数据源：tasks → 工单行）
  const summaries = useMemo((): DailyWorkSummaryRow[] => {
    const rows: DailyWorkSummaryRow[] = tasks
      .filter(t => t.id && t.title) // 过滤无效任务
      .map(task => {
        // 从工作日志中查找关联记录，用于补充工时/人数
        const matchedLogs = workLogs.filter(
          w => w.taskId === task.id || w.taskCode === task.taskCode
        );
        const totalHours = matchedLogs.reduce((sum, w) => sum + (w.workloadHours || 0), 0);
        const totalDays = matchedLogs.reduce((sum, w) => sum + (w.workloadDays || 0), 0);
        const totalWorkers = matchedLogs.length > 0
          ? Math.max(...matchedLogs.map(w => w.workers || 0))
          : 0;

        // 获取该日期的考勤数据来计算工时（通过姓名匹配）
        const dayAttendance = attendance.filter(
          a => a.workerName === task.assigneeName && a.date === task.dueDate
        );
        const attendanceHours = dayAttendance.reduce((sum, a) => sum + (a.hours || 0), 0);

        // 状态标签
        const statusConfig = TASK_STATUS_CONFIG[task.status];
        const status = statusConfig?.label || task.status;

        // 完成率
        const completionRate = task.status === 'completed' || task.status === 'waiting_acceptance'
          ? '100%'
          : task.status === 'cancelled' || task.status === 'abandoned'
            ? '0%'
            : `${task.progress || 0}%`;

        return {
          id: task.id,
          date: task.dueDate || '',
          taskId: task.id,
          taskCode: task.taskCode || task.id || '-',
          greenhouse: task.greenhouseName || '-',
          crop: task.cropName || '-',
          taskType: task.typeName || task.type || '-',
          plannedArea: 0,
          completedArea: 0,
          workloadDays: totalDays || undefined,
          workloadHours: totalHours || attendanceHours || undefined,
          workers: totalWorkers || undefined,
          status,
          completionRate,
        };
      });

    // 按日期降序排序
    rows.sort((a, b) => b.date.localeCompare(a.date));

    return rows;
  }, [tasks, workLogs, attendance]);

  // 应用筛选
  const filteredSummaries = useMemo(() => {
    if (!filters) return summaries;
    return summaries.filter(s => {
      if (filters.date && s.date !== filters.date) return false;
      if (filters.greenhouse && filters.greenhouse !== '全部' && !s.greenhouse.includes(filters.greenhouse)) return false;
      if (filters.taskType && filters.taskType !== '全部' && !s.taskType.includes(filters.taskType)) return false;
      return true;
    });
  }, [summaries, filters?.date, filters?.greenhouse, filters?.taskType]);

  // 计算统计卡片数据（基于任务状态）
  const statCards = useMemo((): DailyWorkStatCard[] => {
    const total = summaries.length;
    const completed = summaries.filter(s => s.status === '已完成').length;
    const inProgress = summaries.filter(s =>
      ['已接受', '处理中', '返工中'].includes(s.status)
    ).length;
    const pending = summaries.filter(s => s.status === '待接受').length;

    return [
      { label: '任务总数', value: total, icon: '📋', iconBgColor: 'bg-blue-500' },
      { label: '已作业', value: completed, icon: '✓', iconBgColor: 'bg-green-500' },
      { label: '进行中', value: inProgress, icon: '⟳', iconBgColor: 'bg-amber-500' },
      { label: '待接受', value: pending, icon: '📨', iconBgColor: 'bg-purple-500' },
    ];
  }, [summaries]);

  // 获取筛选选项（从 tasks 提取）
  const filterOptions = useMemo(() => {
    // 日期选项（从截止日期提取）
    const dates = [...new Set(tasks.map(t => t.dueDate).filter(Boolean))].sort((a, b) => String(b).localeCompare(String(a)));
    const dateOptions = [
      { value: '', label: '全部' },
      ...dates.map(d => ({ value: d || '', label: d || '' })),
    ];

    // 温室选项
    const greenhouseNames = [...new Set(tasks.map(t => t.greenhouseName).filter(Boolean))];
    const greenhouseOptions = [
      { value: '', label: '全部' },
      ...greenhouseNames.map(g => ({ value: g || '', label: g || '' })),
    ];

    // 作业类型选项
    const taskTypeSet = new Set<string>();
    tasks.forEach(t => {
      const name = t.typeName || t.type;
      if (name) taskTypeSet.add(name);
    });
    const taskTypeOptions = [
      { value: '', label: '全部' },
      ...[...taskTypeSet].map(t => ({ value: t, label: t })),
    ];

    return { dates: dateOptions, greenhouses: greenhouseOptions, taskTypes: taskTypeOptions };
  }, [tasks]);

  return {
    summaries: filteredSummaries,
    statCards,
    loading,
    filterOptions,
    totalCount: summaries.length,
  };
}
