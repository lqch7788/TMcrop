/**
 * 批次成本聚合 Hook
 * 用于生产汇总表的成本对比分析
 */

import { useState, useEffect, useMemo } from 'react';
import type { CostComparison, BatchCostDetail, BatchFilters } from '../types/views';
import {
  getCostComparison,
  getBatchCostDetail,
  getBatchSummaries,
} from '../data/summaryData';

/**
 * 批次成本数据 Hook
 */
export function useBatchCosts(filters?: BatchFilters) {
  const [loading, setLoading] = useState(true);

  // 模拟异步加载
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [filters?.cropName, filters?.status, filters?.greenhouse]);

  // 获取成本对比数据
  const costComparisons = useMemo((): CostComparison[] => {
    const comparisons = getCostComparison();

    // 应用筛选
    const summaries = getBatchSummaries();
    const filteredBatchIds = new Set(
      summaries
        .filter(s => {
          if (filters?.cropName && s.cropName !== filters.cropName) return false;
          if (filters?.status && s.status !== filters.status) return false;
          if (filters?.greenhouse && s.greenhouse !== filters.greenhouse) return false;
          return true;
        })
        .map(s => s.id)
    );

    return comparisons.filter(c => filteredBatchIds.has(c.batchId));
  }, [filters?.cropName, filters?.status, filters?.greenhouse]);

  // 计算成本汇总
  const costSummary = useMemo(() => {
    const totalBudget = costComparisons.reduce((sum, c) => sum + c.budgetCost, 0);
    const totalActual = costComparisons.reduce((sum, c) => sum + c.actualCost, 0);
    const totalVariance = totalActual - totalBudget;
    const varianceRate = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0;

    return {
      totalBudget,
      totalActual,
      totalVariance,
      varianceRate,
    };
  }, [costComparisons]);

  return {
    costComparisons,
    costSummary,
    loading,
  };
}

/**
 * 获取单个批次的成本明细
 */
export function useBatchCostDetail(batchId: string | null) {
  const [loading, setLoading] = useState(true);
  const [costDetail, setCostDetail] = useState<BatchCostDetail | null>(null);

  useEffect(() => {
    if (!batchId) {
      setCostDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      const detail = getBatchCostDetail(batchId);
      setCostDetail(detail);
      setLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [batchId]);

  return { costDetail, loading };
}

export default {
  useBatchCosts,
  useBatchCostDetail,
};
