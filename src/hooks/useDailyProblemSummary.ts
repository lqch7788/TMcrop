/**
 * 每日问题汇总数据 Hook
 * 用于每日问题汇总表(DailyProblemSummary)页面的数据聚合
 * 支持后端 API 和 localStorage 持久化
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { DailyProblemSummaryRow, DailyProblemStatCard, DailyProblemFilters } from '../types/views';
import { usePersistentProblems, type ProblemEntry } from './usePersistentProblems';
import {
  getProblemDailySummary,
  getProblemSummaryOverview,
  type ProblemDailyItem,
  type ProblemSummaryOverview,
} from '../services/summaryService';

/**
 * 每日问题汇总数据 Hook
 */
export function useDailyProblemSummary(filters?: DailyProblemFilters) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<ProblemDailyItem[]>([]);
  const [overview, setOverview] = useState<ProblemSummaryOverview | null>(null);
  const { problems } = usePersistentProblems();

  // 从后端加载问题汇总数据
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 并行获取汇总数据和概览
      const [summaryData, overviewData] = await Promise.all([
        getProblemDailySummary({
          start_date: filters?.date || undefined,
          end_date: filters?.date ? filters.date + ' 23:59:59' : undefined,
          greenhouse_name: filters?.greenhouse && filters.greenhouse !== '全部' ? filters.greenhouse : undefined,
          group_by: 'date',
        }),
        getProblemSummaryOverview({
          start_date: filters?.date || undefined,
          end_date: filters?.date ? filters.date + ' 23:59:59' : undefined,
        }),
      ]);

      setSummaries(summaryData);
      setOverview(overviewData);
    } catch (err) {
      console.error('加载问题汇总数据失败:', err);
      setError('加载数据失败');
      // 回退到本地数据
      fallbackToLocalData();
    } finally {
      setLoading(false);
    }
  }, [filters?.date, filters?.greenhouse]);

  // 回退到本地数据
  const fallbackToLocalData = useCallback(() => {
    const localSummaries: ProblemDailyItem[] = [];

    // 按日期分组汇总本地问题数据
    const problemsByDate = problems.reduce((acc, p) => {
      const date = p.checkDate;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(p);
      return acc;
    }, {} as Record<string, ProblemEntry[]>);

    Object.entries(problemsByDate).forEach(([date, dateProblems]) => {
      localSummaries.push({
        date,
        month: date.substring(0, 7),
        total: dateProblems.length,
        pending: dateProblems.filter(p => p.status === '待处理').length,
        in_progress: dateProblems.filter(p => p.status === '处理中').length,
        resolved: dateProblems.filter(p => p.status === '已处理').length,
        high_priority: dateProblems.filter(p => p.issueSeverity === '严重').length,
        medium_priority: dateProblems.filter(p => p.issueSeverity === '中等').length,
        low_priority: dateProblems.filter(p => p.issueSeverity === '轻微').length,
      });
    });

    setSummaries(localSummaries.sort((a, b) => b.date.localeCompare(a.date)));

    // 计算概览
    const total = problems.length;
    setOverview({
      total,
      pending: problems.filter(p => p.status === '待处理').length,
      in_progress: problems.filter(p => p.status === '处理中').length,
      resolved: problems.filter(p => p.status === '已处理').length,
      high_priority: problems.filter(p => p.issueSeverity === '严重').length,
      month_new: problems.filter(p => {
        const problemDate = new Date(p.checkDate);
        const now = new Date();
        return problemDate.getMonth() === now.getMonth() && problemDate.getFullYear() === now.getFullYear();
      }).length,
      trend: 0,
      resolution_rate: total > 0 ? Math.round((problems.filter(p => p.status === '已处理').length / total) * 100) : 0,
    });
  }, [problems]);

  // 初次加载和数据变化时获取数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 转换为页面需要的行数据格式
  const summaryRows = useMemo((): DailyProblemSummaryRow[] => {
    return summaries.map((s, idx) => ({
      id: String(idx + 1),
      date: s.date || s.month,
      total: s.total,
      pending: s.pending,
      inProgress: s.in_progress,
      resolved: s.resolved,
      highPriority: s.high_priority,
      mediumPriority: s.medium_priority,
      lowPriority: s.low_priority,
      // 扩展字段
      month_new: s.total,
    })) as DailyProblemSummaryRow[];
  }, [summaries]);

  // 过滤后的汇总
  const filteredSummaries = useMemo(() => {
    if (!filters?.date) return summaryRows;
    return summaryRows.filter(s => s.date === filters.date);
  }, [summaryRows, filters?.date]);

  // 计算统计卡片数据
  const statCards = useMemo((): DailyProblemStatCard[] => {
    const data = overview || {
      total: 0,
      pending: 0,
      in_progress: 0,
      resolved: 0,
      high_priority: 0,
    };

    return [
      { label: '问题总数', value: data.total, icon: '⚠️', iconBgColor: 'bg-red-500' },
      { label: '待处理', value: data.pending, icon: '⏳', iconBgColor: 'bg-gray-500' },
      { label: '处理中', value: data.in_progress, icon: '!', iconBgColor: 'bg-amber-500' },
      { label: '已处理', value: data.resolved, icon: '✓', iconBgColor: 'bg-green-500' },
    ];
  }, [overview]);

  // 获取筛选选项（从本地数据获取）
  const filterOptions = useMemo(() => {
    // 日期选项
    const dates = [...new Set(problems.map(p => p.checkDate))].sort((a, b) => b.localeCompare(a));
    const dateOptions = [
      { value: '', label: '全部' },
      ...dates.map(d => ({ value: d, label: d })),
    ];

    // 温室选项
    const greenhouses = [...new Set(problems.map(p => p.greenhouseName))];
    const greenhouseOptions = [
      { value: '', label: '全部' },
      ...greenhouses.map(g => ({ value: g, label: g })),
    ];

    return { dates: dateOptions, greenhouses: greenhouseOptions };
  }, [problems]);

  return {
    summaries: filteredSummaries,
    statCards,
    loading,
    error,
    filterOptions,
    totalCount: summaryRows.length,
    overview,
    refresh: loadData,
  };
}
