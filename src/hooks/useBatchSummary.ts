/**
 * 批次汇总数据 Hook
 * 用于生产汇总表(PlanSummary)页面的数据聚合
 * 支持后端 API 和 mockData 回退
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { BatchSummaryRow, SummaryStatCard, BatchFilters } from '../types/views';
import { cropBatches, tasks } from '../data/mockData';
import { getBatchStats, type BatchStatsItem } from '../services/summaryService';

/**
 * 批次汇总数据 Hook
 */
export function useBatchSummary(filters?: BatchFilters) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchStats, setBatchStats] = useState<BatchStatsItem[]>([]);

  // 从后端加载批次汇总数据
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getBatchStats({
        crop_name: filters?.cropName && filters.cropName !== '全部' ? filters.cropName : undefined,
        status: filters?.status && filters.status !== '全部' ? filters.status : undefined,
        greenhouse_name: filters?.greenhouse && filters.greenhouse !== '全部' ? filters.greenhouse : undefined,
      });
      setBatchStats(data);
    } catch (err) {
      console.error('加载批次汇总数据失败:', err);
      setError('加载数据失败');
      // 回退到 mockData
      fallbackToMockData();
    } finally {
      setLoading(false);
    }
  }, [filters?.cropName, filters?.status, filters?.greenhouse]);

  // 回退到 mockData
  const fallbackToMockData = useCallback(() => {
    const mockData: BatchStatsItem[] = cropBatches.map(batch => {
      const batchTasks = tasks.filter(t => t.batchId === batch.id);
      const completedTasks = batchTasks.filter(t => t.status === 'completed');
      const completionRate = batchTasks.length > 0
        ? Math.round((completedTasks.length / batchTasks.length) * 100)
        : 0;

      return {
        id: batch.id,
        batchCode: batch.batchCode,
        batchName: batch.batchName || batch.batchCode,
        cropName: batch.cropName,
        variety: batch.variety,
        greenhouse: typeof batch.greenhouse === 'string' ? batch.greenhouse : batch.greenhouseName || '',
        plantingArea: batch.plantingArea,
        targetYield: batch.targetYield,
        actualQuantity: batch.actualYield,
        harvestQuantity: batch.actualYield,
        completionRate,
        status: batch.status,
        plantingDate: batch.startDate,
        expectedHarvestDate: batch.endDate,
        actualHarvestDate: '',
        taskCount: batchTasks.length,
        completedTaskCount: completedTasks.length,
        pendingTaskCount: batchTasks.filter(t => t.status === 'pending').length,
        inProgressTaskCount: batchTasks.filter(t => t.status === 'in_progress').length,
        totalWorkHours: batchTasks.reduce((sum, t) => sum + t.workDuration, 0),
        laborCost: 0,
        remainingYield: batch.targetYield - batch.actualYield,
      };
    });
    setBatchStats(mockData);
  }, []);

  // 初次加载和数据变化时获取数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 转换为页面需要的行数据格式
  const summaryRows = useMemo((): BatchSummaryRow[] => {
    return batchStats.map(batch => {
      // 计算状态样式
      const statusClass = getStatusClass(batch.completionRate, batch.status);

      return {
        id: batch.id,
        batchCode: batch.batchCode,
        cropName: batch.cropName,
        variety: batch.variety,
        greenhouse: batch.greenhouse,
        plantingArea: batch.plantingArea,
        targetYield: batch.targetYield,
        actualYield: batch.harvestQuantity || batch.actualQuantity,
        completionRate: batch.completionRate.toString() + '%',
        status: batch.status,
        statusClass,
        taskCount: batch.taskCount,
        completedTaskCount: batch.completedTaskCount,
        totalWorkHours: batch.totalWorkHours,
        laborCost: batch.laborCost,
        materialCost: 0,
      };
    });
  }, [batchStats]);

  // 应用筛选
  const filteredSummaries = useMemo(() => {
    if (!filters) return summaryRows;
    return summaryRows.filter(s => {
      if (filters.cropName && filters.cropName !== '全部' && s.cropName !== filters.cropName) return false;
      if (filters.status && filters.status !== '全部' && s.status !== filters.status) return false;
      if (filters.greenhouse && filters.greenhouse !== '全部' && !s.greenhouse.includes(filters.greenhouse)) return false;
      return true;
    });
  }, [summaryRows, filters?.cropName, filters?.status, filters?.greenhouse]);

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
    error,
    totalCount: summaryRows.length,
    refresh: loadData,
  };
}

/**
 * 获取状态样式
 */
function getStatusClass(completionRate: number | string, status: string): 'normal' | 'warning' | 'danger' {
  if (status === 'completed') return 'normal';
  if (status === 'cancelled' || status === 'suspended') return 'danger';

  const rate = typeof completionRate === 'string' ? parseFloat(completionRate) : completionRate;
  if (rate >= 80) return 'normal';
  if (rate >= 50) return 'warning';
  return 'danger';
}

/**
 * 获取批次下拉选项（从 mockData 获取，保持兼容性）
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
