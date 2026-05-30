/**
 * 批次汇总数据 Hook
 * 用于生产汇总表(PlanSummary)页面的数据聚合
 * 支持后端 API 和 mockData 回退
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { BatchSummaryRow, SummaryStatCard, BatchFilters } from '../types/views';
import { useProductionPlanStore } from '../stores/useProductionPlanStore';
import { useFarmTaskStore } from '../stores/farmTaskStore';
import { getBatchStats, type BatchStatsItem } from '../services/summaryService';
import { Package, Sprout, TrendingUp, CheckCircle } from 'lucide-react';

/**
 * 批次汇总数据 Hook
 */
export function useBatchSummary(filters?: BatchFilters) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchStats, setBatchStats] = useState<BatchStatsItem[]>([]);

  // 在 hook 顶层订阅 Store 数据（响应式）
  const plans = useProductionPlanStore((state) => state.plans);
  const tasks = useFarmTaskStore((state) => state.tasks);

  // 构建 mockData 的函数（在 fallback 时直接使用已订阅的数据）
  const buildMockData = useCallback((plansData: typeof plans, tasksData: typeof tasks): BatchStatsItem[] => {
    return plansData.map(batch => {
      const batchTasks = tasksData.filter((t: any) => t.batchId === batch.id);
      const completedTasks = batchTasks.filter((t: any) => t.status === 'completed');
      const completionRate = batchTasks.length > 0
        ? Math.round((completedTasks.length / batchTasks.length) * 100)
        : 0;

      return {
        id: batch.id,
        batchCode: batch.batchCode,
        batchName: batch.cropName,
        cropName: batch.cropName,
        variety: batch.variety,
        greenhouse: batch.greenhouseName || '',
        plantingArea: batch.plantingArea,
        targetYield: batch.targetYield,
        actualQuantity: batch.actualYield,
        harvestQuantity: batch.actualYield,
        completionRate,
        status: batch.status,
        plantingDate: batch.startDate,
        expectedHarvestDate: (batch as any).endDate || batch.expectedHarvestDate || '',
        actualHarvestDate: '',
        taskCount: batchTasks.length,
        completedTaskCount: completedTasks.length,
        pendingTaskCount: batchTasks.filter((t: any) => t.status === 'pending').length,
        inProgressTaskCount: batchTasks.filter((t: any) => t.status === 'in_progress').length,
        totalWorkHours: batchTasks.reduce((sum: number, t: any) => sum + (t.workDuration || t.estimatedHours || 0), 0),
        laborCost: 0,
        remainingYield: batch.targetYield - batch.actualYield,
      };
    });
  }, []);

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
      // logger.error('加载批次汇总数据失败:', err);
      setError('加载数据失败');
      // 回退到 mockData（使用已订阅的响应式数据）
      setBatchStats(buildMockData(plans, tasks));
    } finally {
      setLoading(false);
    }
  }, [filters?.cropName, filters?.status, filters?.greenhouse, plans, tasks, buildMockData]);

  // 初次加载和数据变化时获取数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 转换为页面需要的行数据格式
  const summaryRows = useMemo((): BatchSummaryRow[] => {
    return batchStats.map(batch => {
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
    // plantingArea 是温室/区域名称字符串，统计不同区域（温室）数量
    const greenhouseCount = new Set(filteredSummaries.map(s => s.plantingArea)).size;
    const totalActualYield = filteredSummaries.reduce((sum, s) => sum + s.actualYield, 0);
    const avgCompletion = total > 0
      ? (filteredSummaries.reduce((sum, s) => sum + parseFloat(s.completionRate), 0) / total).toFixed(1)
      : '0';

    return [
      { label: '生产批次', value: total, icon: <Package className="w-4 h-4 text-white" />, iconBgColor: 'bg-blue-500' },
      { label: '种植区域', value: greenhouseCount, icon: <Sprout className="w-4 h-4 text-white" />, iconBgColor: 'bg-green-500' },
      { label: '总产量', value: totalActualYield.toLocaleString() + ' kg', icon: <TrendingUp className="w-4 h-4 text-white" />, iconBgColor: 'bg-orange-500' },
      { label: '平均完成率', value: avgCompletion + '%', icon: <CheckCircle className="w-4 h-4 text-white" />, iconBgColor: 'bg-purple-500' },
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
 * 获取批次下拉选项（从响应式 Store 获取）
 */
export function useBatchFilterOptions() {
  // 使用响应式订阅
  const plans = useProductionPlanStore((state) => state.plans);

  const cropNames = useMemo(() => {
    const names = [...new Set(plans.map(b => b.cropName))];
    return [
      { value: '', label: '全部' },
      ...names.map(n => ({ value: n, label: n })),
    ];
  }, [plans]);

  const statuses = useMemo(() => [
    { value: '', label: '全部' },
    { value: 'planned', label: '计划中' },
    { value: 'in_progress', label: '进行中' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
    { value: 'suspended', label: '已暂停' },
  ], []);

  const greenhouses = useMemo(() => {
    const names = [...new Set(plans.map(b => b.greenhouseName))];
    return [
      { value: '', label: '全部' },
      ...names.map(n => ({ value: n, label: n })),
    ];
  }, [plans]);

  return { cropNames, statuses, greenhouses };
}
