/**
 * 每日工单汇总数据 Hook
 * 用于每日工单汇总表(DailyWorkSummary)页面的数据聚合
 * 支持 localStorage 持久化
 */

import { useState, useEffect, useMemo } from 'react';
import type { DailyWorkSummaryRow, DailyWorkStatCard, DailyWorkFilters } from '../types/views';
import { usePersistentWorkLogs, INITIAL_WORK_LOGS } from './usePersistentWorkLogs';
import { usePersistentAttendance, INITIAL_ATTENDANCE } from './usePersistentAttendance';
import { useTasks, Task, INITIAL_TASKS } from './useTasks';

/**
 * 每日工单汇总数据 Hook
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

  // 聚合每日工单数据
  const summaries = useMemo((): DailyWorkSummaryRow[] => {
    // 直接返回每条工单作为一行，保留任务编号等信息
    const rows: DailyWorkSummaryRow[] = workLogs.map(log => {
      // 获取该日期的考勤数据来计算工时（通过姓名匹配）
      const dayAttendance = attendance.filter(a => a.date === log.date);

      // 获取任务状态（如果有关联任务）
      let status = '已完成';
      let completionRate = '100%';
      if (log.taskId) {
        const task = tasks.find(t => t.id === log.taskId);
        if (task) {
          if (task.status === 'completed') {
            status = '已完成';
            completionRate = '100%';
          } else if (task.status === 'in_progress' || task.status === 'accepted') {
            status = '进行中';
            completionRate = `${task.progress}%`;
          } else if (task.status === 'waiting_acceptance') {
            status = '待验收';
            completionRate = '100%';
          } else if (task.status === 'rejected') {
            status = '已驳回';
            completionRate = `${task.progress}%`;
          } else {
            status = '待接受';
            completionRate = '0%';
          }
        }
      }

      // 临时任务（无 taskId）根据工单数据判断
      if (!log.taskId && log.problems && log.problems !== '无') {
        status = '已处理';
      }

      return {
        id: log.taskId ? `${log.date}-${log.taskId}` : `${log.date}-${log.id}`,
        date: log.date,
        taskId: log.taskId,
        taskCode: log.batchCode || log.code, // 显示批次编号或工单编号
        greenhouse: log.greenhouse,
        crop: log.crop,
        taskType: log.tasks,
        plannedArea: 0,
        completedArea: 0,
        workerCount: 1,
        workHours: dayAttendance.find(a => a.name === log.worker)?.hours || 0,
        status,
        completionRate,
      };
    });

    // 按日期降序排序
    rows.sort((a, b) => b.date.localeCompare(a.date));

    return rows;
  }, [workLogs, attendance, tasks]);

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

  // 计算统计卡片数据
  const statCards = useMemo((): DailyWorkStatCard[] => {
    const totalWorkOrders = workLogs.length;
    const totalHours = attendance.reduce((sum, a) => sum + a.hours, 0);
    const completedCount = filteredSummaries.filter(s => s.status === '已完成').length;

    return [
      { label: '工单总数', value: totalWorkOrders, icon: '📋', iconBgColor: 'bg-blue-500' },
      { label: '已作业', value: completedCount, icon: '✓', iconBgColor: 'bg-green-500' },
      { label: '进行中', value: totalWorkOrders - completedCount, icon: '⟳', iconBgColor: 'bg-amber-500' },
      { label: '总工时', value: totalHours.toFixed(1) + 'h', icon: '∑', iconBgColor: 'bg-purple-500' },
    ];
  }, [filteredSummaries, workLogs, attendance]);

  // 获取筛选选项
  const filterOptions = useMemo(() => {
    // 日期选项
    const dates = [...new Set(workLogs.map(w => w.date))].sort((a, b) => b.localeCompare(a));
    const dateOptions = [
      { value: '', label: '全部' },
      ...dates.map(d => ({ value: d, label: d })),
    ];

    // 温室选项
    const greenhouseOptions = [
      { value: '', label: '全部' },
      { value: '1号棚', label: '1号棚' },
      { value: '2号棚', label: '2号棚' },
      { value: '3号棚', label: '3号棚' },
      { value: '4号棚', label: '4号棚' },
      { value: '5号棚', label: '5号棚' },
      { value: '6号棚', label: '6号棚' },
    ];

    // 作业类型选项
    const taskTypeSet = new Set<string>();
    workLogs.forEach(w => {
      w.tasks.split('、').forEach(t => taskTypeSet.add(t));
    });
    const taskTypeOptions = [
      { value: '', label: '全部' },
      ...[...taskTypeSet].map(t => ({ value: t, label: t })),
    ];

    return { dates: dateOptions, greenhouses: greenhouseOptions, taskTypes: taskTypeOptions };
  }, [workLogs]);

  return {
    summaries: filteredSummaries,
    statCards,
    loading,
    filterOptions,
    totalCount: summaries.length,
  };
}

// 导出初始数据常量，供其他模块使用
export { INITIAL_WORK_LOGS, INITIAL_ATTENDANCE };
