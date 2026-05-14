/**
 * 人效数据管理Hook
 *
 * V2.0架构改造：数据存储迁移到 useEfficiencyStore
 * 计算逻辑（summaryMetrics, trendData）保留在Hook层
 */
import { useEffect, useState, useMemo } from 'react';
import { useEfficiencyStore } from '@/stores';
import { EfficiencyTrend, EfficiencyFilters } from '../types';

export function useEfficiency() {
  const store = useEfficiencyStore();
  const [filters, setFilters] = useState<EfficiencyFilters>({
    startDate: '2023-05',
    endDate: '2024-04',
    department: '全部',
  });

  // 组件挂载时初始化种子数据
  useEffect(() => {
    store.initSeedData();
  }, []);

  // 根据筛选条件过滤数据
  const filteredData = useMemo(() => {
    return store.data.filter(item => {
      const matchDate = item.date >= filters.startDate && item.date <= filters.endDate;
      const matchDept = filters.department === '全部' || item.department === filters.department;
      return matchDate && matchDept;
    });
  }, [store.data, filters]);

  // 计算汇总指标（基于筛选后的数据）
  const summaryMetrics = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        avgOutputPerWorker: 0,
        avgEfficiency: 0,
        avgTaskCompletionRate: 0,
        avgAttendanceRate: 0,
        avgLaborCostRate: 0,
        avgSkillCoverage: 0,
      };
    }

    const sum = filteredData.reduce((acc, item) => ({
      output: acc.output + item.avgOutputPerWorker * item.totalWorkers,
      workers: acc.workers + item.totalWorkers,
      efficiency: acc.efficiency + item.avgEfficiency,
      taskRate: acc.taskRate + item.taskCompletionRate,
      attendance: acc.attendance + item.attendanceRate,
      laborCost: acc.laborCost + item.laborCostRate,
      skill: acc.skill + item.skillCoverage,
    }), { output: 0, workers: 0, efficiency: 0, taskRate: 0, attendance: 0, laborCost: 0, skill: 0 });

    return {
      avgOutputPerWorker: sum.output / sum.workers,
      avgEfficiency: sum.efficiency / filteredData.length,
      avgTaskCompletionRate: sum.taskRate / filteredData.length,
      avgAttendanceRate: sum.attendance / filteredData.length,
      avgLaborCostRate: sum.laborCost / filteredData.length,
      avgSkillCoverage: sum.skill / filteredData.length,
    };
  }, [filteredData]);

  // 趋势数据（按月份汇总）
  const trendData = useMemo((): EfficiencyTrend[] => {
    const monthlyMap = new Map<string, { output: number; efficiency: number; attendance: number; count: number }>();

    filteredData.forEach(item => {
      const existing = monthlyMap.get(item.date) || { output: 0, efficiency: 0, attendance: 0, count: 0 };
      monthlyMap.set(item.date, {
        output: existing.output + item.totalOutput,
        efficiency: existing.efficiency + item.avgEfficiency,
        attendance: existing.attendance + item.attendanceRate,
        count: existing.count + 1,
      });
    });

    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        output: data.output,
        efficiency: Number((data.efficiency / data.count).toFixed(2)),
        attendance: Number((data.attendance / data.count).toFixed(2)),
      }));
  }, [filteredData]);

  // 获取所有部门选项
  const departments = useMemo(() => {
    const depts = new Set(store.data.map(item => item.department));
    return ['全部', ...Array.from(depts)];
  }, [store.data]);

  // 更新筛选条件
  const updateFilters = (newFilters: Partial<EfficiencyFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return {
    data: filteredData,
    trendData,
    summaryMetrics,
    filters,
    departments,
    updateFilters,
  };
}
