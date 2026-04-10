/**
 * 批次汇总数据 Hook
 * 用于生产汇总表(PlanSummary)页面的数据聚合
 */

import { useState, useEffect, useMemo } from 'react';
import type { BatchSummaryRow, SummaryStatCard, BatchFilters } from '../types/views';
import { cropBatches, tasks } from '../data/mockData';

/**
 * 批次汇总数据 Hook
 */
export function useBatchSummary(filters?: BatchFilters) {
  const [loading, setLoading] = useState(true);

  // 模拟异步加载
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [filters?.cropName, filters?.status, filters?.greenhouse]);

  // 聚合批次汇总数据
  const summaries = useMemo((): BatchSummaryRow[] => {
    return cropBatches.map(batch => {
      // 聚合任务
      const batchTasks = tasks.filter(t => t.batchId === batch.id);
      const completedTasks = batchTasks.filter(t => t.status === 'completed');

      // 计算完成率
      const completionRate = batchTasks.length > 0
        ? ((completedTasks.length / batchTasks.length) * 100).toFixed(1) + '%'
        : '0%';

      // 计算状态样式
      const statusClass = getStatusClass(completionRate, batch.status);

      // 获取温室名称
      const greenhouseName = typeof batch.greenhouse === 'string'
        ? batch.greenhouse
        : batch.greenhouseName || '';

      return {
        id: batch.id,
        batchCode: batch.batchCode,
        cropName: batch.cropName,
        variety: batch.variety,
        greenhouse: greenhouseName,
        plantingArea: batch.plantingArea,
        targetYield: batch.targetYield,
        actualYield: batch.actualYield,
        completionRate,
        status: batch.status,
        statusClass,
        taskCount: batchTasks.length,
        completedTaskCount: completedTasks.length,
        totalWorkHours: batchTasks.reduce((sum, t) => sum + t.workDuration, 0),
        laborCost: 0, // TODO: 从 WorkLog/Attendance 聚合
        materialCost: 0, // TODO: 从 MaterialReceiving 聚合
      };
    });
  }, [cropBatches, tasks]);

  // 应用筛选
  const filteredSummaries = useMemo(() => {
    if (!filters) return summaries;
    return summaries.filter(s => {
      if (filters.cropName && s.cropName !== filters.cropName) return false;
      if (filters.status && s.status !== filters.status) return false;
      if (filters.greenhouse && s.greenhouse !== filters.greenhouse) return false;
      return true;
    });
  }, [summaries, filters?.cropName, filters?.status, filters?.greenhouse]);

  // 计算统计卡片数据
  const statCards = useMemo((): SummaryStatCard[] => {
    const total = filteredSummaries.length;
    const totalArea = filteredSummaries.reduce((sum, s) => sum + s.plantingArea, 0);
    const totalTargetYield = filteredSummaries.reduce((sum, s) => sum + s.targetYield, 0);
    const totalActualYield = filteredSummaries.reduce((sum, s) => sum + s.actualYield, 0);
    const avgCompletion = total > 0
      ? (filteredSummaries.reduce((sum, s) => sum + parseFloat(s.completionRate), 0) / total).toFixed(1)
      : '0';

    return [
      { label: '生产批次', value: total, icon: '📦', iconBgColor: 'bg-blue-500' },
      { label: '种植面积', value: totalArea + '亩', icon: '🌱', iconBgColor: 'bg-green-500' },
      { label: '总产量', value: totalActualYield.toLocaleString() + ' kg', icon: '📈', iconBgColor: 'bg-orange-500' },
      { label: '平均完成率', value: avgCompletion + '%', icon: '✅', iconBgColor: 'bg-purple-500' },
    ];
  }, [filteredSummaries]);

  return {
    summaries: filteredSummaries,
    statCards,
    loading,
    totalCount: summaries.length,
  };
}

/**
 * 获取状态样式
 */
function getStatusClass(completionRate: string, status: string): 'normal' | 'warning' | 'danger' {
  if (status === 'completed') return 'normal';
  if (status === 'cancelled' || status === 'suspended') return 'danger';

  const rate = parseFloat(completionRate);
  if (rate >= 80) return 'normal';
  if (rate >= 50) return 'warning';
  return 'danger';
}

/**
 * 获取批次下拉选项
 */
export function useBatchFilterOptions() {
  const cropNames = useMemo(() => {
    const names = [...new Set(cropBatches.map(b => b.cropName))];
    return [
      { value: '', label: '全部' },
      ...names.map(n => ({ value: n, label: n })),
    ];
  }, []);

  const statuses = useMemo(() => [
    { value: '', label: '全部' },
    { value: 'planned', label: '计划中' },
    { value: 'in_progress', label: '进行中' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
    { value: 'suspended', label: '已暂停' },
  ], []);

  const greenhouses = useMemo(() => {
    const names = [...new Set(cropBatches.map(b =>
      typeof b.greenhouse === 'string' ? b.greenhouse : b.greenhouseName
    ))];
    return [
      { value: '', label: '全部' },
      ...names.map(n => ({ value: n, label: n })),
    ];
  }, []);

  return { cropNames, statuses, greenhouses };
}
