/**
 * 每日问题汇总数据 Hook
 * 用于每日问题汇总表(DailyProblemSummary)页面的数据聚合
 * 支持 localStorage 持久化
 */

import { useState, useEffect, useMemo } from 'react';
import type { DailyProblemSummaryRow, DailyProblemStatCard, DailyProblemFilters } from '../types/views';
import { usePersistentProblems, type ProblemEntry } from './usePersistentProblems';

/**
 * 每日问题汇总数据 Hook
 */
export function useDailyProblemSummary(filters?: DailyProblemFilters) {
  const [loading, setLoading] = useState(true);
  const { problems } = usePersistentProblems();

  // 模拟异步加载
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [filters?.date, filters?.greenhouse]);

  // 聚合问题记录为汇总行
  const summaries = useMemo((): DailyProblemSummaryRow[] => {
    // 判断问题类型
    const getProblemType = (issueText: string): string => {
      if (issueText.includes('蚜虫') || issueText.includes('虫') || issueText.includes('蜗牛')) return '虫害';
      if (issueText.includes('病') || issueText.includes('斑') || issueText.includes('灰霉') || issueText.includes('病毒')) return '病害';
      if (issueText.includes('温度') || issueText.includes('旱') || issueText.includes('涝')) return '环境';
      if (issueText.includes('水') || issueText.includes('肥')) return '水肥';
      return '其他';
    };

    // 转换为汇总行
    const rows: DailyProblemSummaryRow[] = problems.map((p: ProblemEntry) => {
      return {
        id: String(p.id),
        date: p.checkDate,
        greenhouse: p.greenhouseName,
        crop: p.cropName,
        worker: p.inspectorName,
        problemType: getProblemType(p.issueText),
        description: p.issueText,
        severity: p.issueSeverity,
        status: p.status,
        handler: p.handler || '-',
        // 保留完整数据用于详情查看
        _problemData: p,
      } as DailyProblemSummaryRow & { _problemData: ProblemEntry };
    });

    // 按日期降序排序
    rows.sort((a, b) => b.date.localeCompare(a.date));

    return rows;
  }, [problems]);

  // 应用筛选
  const filteredSummaries = useMemo(() => {
    if (!filters) return summaries;
    return summaries.filter(s => {
      if (filters.date && s.date !== filters.date) return false;
      if (filters.greenhouse && filters.greenhouse !== '全部' && !s.greenhouse.includes(filters.greenhouse)) return false;
      return true;
    });
  }, [summaries, filters?.date, filters?.greenhouse]);

  // 计算统计卡片数据
  const statCards = useMemo((): DailyProblemStatCard[] => {
    const total = filteredSummaries.length;
    const pending = filteredSummaries.filter(s => s.status === '待处理').length;
    const handling = filteredSummaries.filter(s => s.status === '处理中').length;
    const handled = filteredSummaries.filter(s => s.status === '已处理').length;

    return [
      { label: '问题总数', value: total, icon: '⚠️', iconBgColor: 'bg-red-500' },
      { label: '待处理', value: pending, icon: '⏳', iconBgColor: 'bg-gray-500' },
      { label: '处理中', value: handling, icon: '!', iconBgColor: 'bg-amber-500' },
      { label: '已处理', value: handled, icon: '✓', iconBgColor: 'bg-green-500' },
    ];
  }, [filteredSummaries]);

  // 获取筛选选项
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
    filterOptions,
    totalCount: summaries.length,
  };
}
