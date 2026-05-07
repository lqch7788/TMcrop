/**
 * 人效数据管理Hook
 */

import { useState, useMemo } from 'react';
import { EfficiencyMetrics, EfficiencyTrend, EfficiencyFilters } from '../types';

// Mock数据：12条月度汇总数据（2023-05到2024-04）
const MOCK_DATA: EfficiencyMetrics[] = [
  { id: '1', date: '2023-05', department: '生产部', totalWorkers: 45, totalOutput: 8920, avgOutputPerWorker: 198.2, totalHours: 3520, avgEfficiency: 0.92, taskCompletionRate: 0.88, attendanceRate: 0.95, laborCostRate: 0.32, skillCoverage: 0.78 },
  { id: '2', date: '2023-06', department: '生产部', totalWorkers: 48, totalOutput: 9450, avgOutputPerWorker: 196.9, totalHours: 3680, avgEfficiency: 0.94, taskCompletionRate: 0.91, attendanceRate: 0.96, laborCostRate: 0.31, skillCoverage: 0.80 },
  { id: '3', date: '2023-07', department: '生产部', totalWorkers: 50, totalOutput: 10200, avgOutputPerWorker: 204.0, totalHours: 3850, avgEfficiency: 0.96, taskCompletionRate: 0.93, attendanceRate: 0.97, laborCostRate: 0.30, skillCoverage: 0.82 },
  { id: '4', date: '2023-08', department: '生产部', totalWorkers: 47, totalOutput: 9780, avgOutputPerWorker: 208.1, totalHours: 3620, avgEfficiency: 0.95, taskCompletionRate: 0.92, attendanceRate: 0.94, laborCostRate: 0.31, skillCoverage: 0.81 },
  { id: '5', date: '2023-09', department: '生产部', totalWorkers: 52, totalOutput: 10920, avgOutputPerWorker: 210.0, totalHours: 4010, avgEfficiency: 0.98, taskCompletionRate: 0.95, attendanceRate: 0.98, laborCostRate: 0.29, skillCoverage: 0.85 },
  { id: '6', date: '2023-10', department: '生产部', totalWorkers: 55, totalOutput: 12100, avgOutputPerWorker: 220.0, totalHours: 4250, avgEfficiency: 1.02, taskCompletionRate: 0.97, attendanceRate: 0.97, laborCostRate: 0.28, skillCoverage: 0.87 },
  { id: '7', date: '2023-11', department: '生产部', totalWorkers: 53, totalOutput: 11860, avgOutputPerWorker: 223.8, totalHours: 4080, avgEfficiency: 1.00, taskCompletionRate: 0.96, attendanceRate: 0.96, laborCostRate: 0.29, skillCoverage: 0.86 },
  { id: '8', date: '2023-12', department: '生产部', totalWorkers: 50, totalOutput: 11500, avgOutputPerWorker: 230.0, totalHours: 3850, avgEfficiency: 0.99, taskCompletionRate: 0.94, attendanceRate: 0.95, laborCostRate: 0.30, skillCoverage: 0.85 },
  { id: '9', date: '2024-01', department: '生产部', totalWorkers: 48, totalOutput: 10800, avgOutputPerWorker: 225.0, totalHours: 3690, avgEfficiency: 0.97, taskCompletionRate: 0.93, attendanceRate: 0.93, laborCostRate: 0.31, skillCoverage: 0.84 },
  { id: '10', date: '2024-02', department: '生产部', totalWorkers: 46, totalOutput: 10220, avgOutputPerWorker: 222.2, totalHours: 3540, avgEfficiency: 0.95, taskCompletionRate: 0.91, attendanceRate: 0.94, laborCostRate: 0.32, skillCoverage: 0.83 },
  { id: '11', date: '2024-03', department: '生产部', totalWorkers: 52, totalOutput: 11960, avgOutputPerWorker: 230.0, totalHours: 4010, avgEfficiency: 1.01, taskCompletionRate: 0.96, attendanceRate: 0.97, laborCostRate: 0.29, skillCoverage: 0.87 },
  { id: '12', date: '2024-04', department: '生产部', totalWorkers: 54, totalOutput: 12680, avgOutputPerWorker: 234.8, totalHours: 4160, avgEfficiency: 1.03, taskCompletionRate: 0.98, attendanceRate: 0.98, laborCostRate: 0.28, skillCoverage: 0.89 },
];

// 技术部数据
const MOCK_DATA_TECH: EfficiencyMetrics[] = [
  { id: '13', date: '2023-05', department: '技术部', totalWorkers: 20, totalOutput: 4200, avgOutputPerWorker: 210.0, totalHours: 1560, avgEfficiency: 0.90, taskCompletionRate: 0.85, attendanceRate: 0.96, laborCostRate: 0.35, skillCoverage: 0.90 },
  { id: '14', date: '2023-06', department: '技术部', totalWorkers: 22, totalOutput: 4560, avgOutputPerWorker: 207.3, totalHours: 1680, avgEfficiency: 0.92, taskCompletionRate: 0.88, attendanceRate: 0.97, laborCostRate: 0.34, skillCoverage: 0.91 },
  { id: '15', date: '2023-07', department: '技术部', totalWorkers: 24, totalOutput: 5040, avgOutputPerWorker: 210.0, totalHours: 1820, avgEfficiency: 0.94, taskCompletionRate: 0.90, attendanceRate: 0.98, laborCostRate: 0.33, skillCoverage: 0.92 },
  { id: '16', date: '2023-08', department: '技术部', totalWorkers: 23, totalOutput: 4870, avgOutputPerWorker: 211.7, totalHours: 1750, avgEfficiency: 0.93, taskCompletionRate: 0.89, attendanceRate: 0.96, laborCostRate: 0.34, skillCoverage: 0.91 },
  { id: '17', date: '2023-09', department: '技术部', totalWorkers: 25, totalOutput: 5400, avgOutputPerWorker: 216.0, totalHours: 1910, avgEfficiency: 0.96, taskCompletionRate: 0.92, attendanceRate: 0.98, laborCostRate: 0.32, skillCoverage: 0.93 },
  { id: '18', date: '2023-10', department: '技术部', totalWorkers: 26, totalOutput: 5720, avgOutputPerWorker: 220.0, totalHours: 1980, avgEfficiency: 0.98, taskCompletionRate: 0.94, attendanceRate: 0.97, laborCostRate: 0.31, skillCoverage: 0.94 },
  { id: '19', date: '2023-11', department: '技术部', totalWorkers: 25, totalOutput: 5600, avgOutputPerWorker: 224.0, totalHours: 1910, avgEfficiency: 0.97, taskCompletionRate: 0.93, attendanceRate: 0.96, laborCostRate: 0.32, skillCoverage: 0.93 },
  { id: '20', date: '2023-12', department: '技术部', totalWorkers: 24, totalOutput: 5400, avgOutputPerWorker: 225.0, totalHours: 1840, avgEfficiency: 0.96, taskCompletionRate: 0.91, attendanceRate: 0.95, laborCostRate: 0.33, skillCoverage: 0.92 },
  { id: '21', date: '2024-01', department: '技术部', totalWorkers: 23, totalOutput: 5100, avgOutputPerWorker: 221.7, totalHours: 1760, avgEfficiency: 0.94, taskCompletionRate: 0.89, attendanceRate: 0.94, laborCostRate: 0.34, skillCoverage: 0.91 },
  { id: '22', date: '2024-02', department: '技术部', totalWorkers: 22, totalOutput: 4900, avgOutputPerWorker: 222.7, totalHours: 1690, avgEfficiency: 0.93, taskCompletionRate: 0.88, attendanceRate: 0.95, laborCostRate: 0.34, skillCoverage: 0.90 },
  { id: '23', date: '2024-03', department: '技术部', totalWorkers: 24, totalOutput: 5400, avgOutputPerWorker: 225.0, totalHours: 1840, avgEfficiency: 0.97, taskCompletionRate: 0.92, attendanceRate: 0.97, laborCostRate: 0.32, skillCoverage: 0.93 },
  { id: '24', date: '2024-04', department: '技术部', totalWorkers: 25, totalOutput: 5750, avgOutputPerWorker: 230.0, totalHours: 1920, avgEfficiency: 0.99, taskCompletionRate: 0.95, attendanceRate: 0.98, laborCostRate: 0.31, skillCoverage: 0.95 },
];

// 合并所有数据
const ALL_MOCK_DATA = [...MOCK_DATA, ...MOCK_DATA_TECH];

export function useEfficiency() {
  const [filters, setFilters] = useState<EfficiencyFilters>({
    startDate: '2023-05',
    endDate: '2024-04',
    department: '全部',
  });

  // 根据筛选条件过滤数据
  const filteredData = useMemo(() => {
    return ALL_MOCK_DATA.filter(item => {
      const matchDate = item.date >= filters.startDate && item.date <= filters.endDate;
      const matchDept = filters.department === '全部' || item.department === filters.department;
      return matchDate && matchDept;
    });
  }, [filters]);

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
    const depts = new Set(ALL_MOCK_DATA.map(item => item.department));
    return ['全部', ...Array.from(depts)];
  }, []);

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
