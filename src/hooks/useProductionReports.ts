/**
 * 生产报表数据 Hook
 * 用于生产报表(Reports)页面的数据聚合
 * 支持后端 API 和 mockData 回退
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ReportStatCard } from '../types/views';
import { cropBatches, tasks } from '../data/mockData';
import { usePersistentAttendance } from './usePersistentAttendance';
import {
  getProductionOverview,
  getYieldStats,
  getLaborStats,
  getCostStats as getSummaryCostStats,
  type YieldStatsItem,
  type LaborStatsItem,
  type LaborStatsSummary,
  type ProductionOverview,
} from '../services/summaryService';
// 导入成本统计 API（包含物料和能源成本）
import { getCostStats } from '../services/costService';

interface YieldStatRow {
  month: string;
  yield: number;
  region?: string;
  crop?: string;
}

interface CostAnalysisRow {
  name: string;
  value: number;
  period: string;
  crop?: string;
}

interface MonthlyLaborRow {
  month: string;
  hours: number;
}

interface CropYieldRow {
  name: string;
  value: number;
}

/**
 * 生产报表数据 Hook
 */
export function useProductionReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<ProductionOverview | null>(null);
  const [yieldStats, setYieldStats] = useState<YieldStatsItem[]>([]);
  const [laborStats, setLaborStats] = useState<{ details: LaborStatsItem[]; summary: LaborStatsSummary } | null>(null);
  // 新增：成本统计数据（来自 costService，包含物料和能源成本）
  // 注意：API返回的是驼峰命名，这里保持一致
  const [costStatsData, setCostStatsData] = useState<{
    labor: Array<{ costCategory: string; costType: string; month: string; workHours: number; totalAmount: number; workerCount: number }>;
    material: Array<{ costCategory: string; costType: string; costTypeCode: string; month: string; totalQuantity: number; totalAmount: number; recordCount: number }>;
    energy: Array<{ costCategory: string; costType: string; costTypeCode: string; month: string; totalQuantity: number; totalAmount: number; recordCount: number }>;
  } | null>(null);
  const [costStatsSummary, setCostStatsSummary] = useState<{
    total_labor_cost: number;
    total_material_cost: number;
    total_energy_cost: number;
    total_cost: number;
    total_work_hours: number;
    avg_hourly_rate: number;
  } | null>(null);
  const { attendance } = usePersistentAttendance();

  // 从后端加载生产报表数据
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 并行获取所有数据（包括成本统计）
      const [overviewData, yieldData, laborData, costData] = await Promise.all([
        getProductionOverview({}),
        getYieldStats({ group_by: 'month' }),
        getLaborStats({ group_by: 'month' }),
        getCostStats({ cost_type: 'all' }), // 获取所有成本类型
      ]);

      setOverview(overviewData);
      setYieldStats(yieldData);
      setLaborStats(laborData);
      // 设置成本统计数据
      if (costData?.data) {
        setCostStatsData(costData.data);
        setCostStatsSummary(costData.summary);
      }
    } catch (err) {
      console.error('加载生产报表数据失败:', err);
      setError('加载数据失败');
      // 回退到本地数据
      fallbackToLocalData();
    } finally {
      setLoading(false);
    }
  }, []);

  // 回退到本地数据
  const fallbackToLocalData = useCallback(() => {
    // 产量统计数据
    const activeBatches = cropBatches.filter(b => b.status === 'in_progress' || b.status === 'completed');
    const byCrop = activeBatches.reduce((acc, batch) => {
      if (!acc[batch.cropName]) {
        acc[batch.cropName] = { yield: 0, count: 0 };
      }
      acc[batch.cropName].yield += batch.actualYield;
      acc[batch.cropName].count += 1;
      return acc;
    }, {} as Record<string, { yield: number; count: number }>);

    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
    const cropNames = Object.keys(byCrop);

    const localYieldStats: YieldStatRow[] = months.map((month, idx) => {
      const baseYield = cropNames.reduce((sum, crop) => sum + byCrop[crop].yield, 0);
      const monthRatio = [0.12, 0.15, 0.18, 0.20, 0.18, 0.17];
      const randomFactor = 0.9 + Math.random() * 0.2;

      return {
        month,
        yield: Math.round(baseYield * monthRatio[idx] * randomFactor),
        region: 'G001',
        crop: cropNames[idx % cropNames.length] || '番茄',
      };
    });

    setYieldStats(localYieldStats.map(s => ({
      name: s.month,
      value: s.yield,
      count: 1,
    })));

    // 人工统计数据
    const baseHours = attendance.reduce((sum, a) => sum + a.hours, 0);
    const localLaborStats: MonthlyLaborRow[] = months.map((month, idx) => {
      const monthRatio = [0.85, 0.92, 1.0];
      return {
        month,
        hours: Math.round(baseHours * 10 * monthRatio[idx]),
      };
    });

    setLaborStats({
      details: localLaborStats.map(s => ({
        name: s.month,
        hours: s.hours,
        amount: s.hours * 30,
      })),
      summary: {
        total_hours: localLaborStats.reduce((sum, m) => sum + m.hours, 0),
        total_amount: localLaborStats.reduce((sum, m) => sum + m.hours * 30, 0),
        avg_hourly_rate: 30,
      },
    });
  }, [attendance]);

  // 初次加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 转换产量统计数据
  const yieldStatsConverted = useMemo((): YieldStatRow[] => {
    if (!yieldStats || yieldStats.length === 0) {
      return [];
    }

    return yieldStats.map(s => ({
      month: s.name || s.month,  // API返回 name="2026-04" 格式
      yield: s.value,
      region: 'G001',
      crop: s.name,
    }));
  }, [yieldStats]);

  // 作物产量占比
  const cropYieldData = useMemo((): CropYieldRow[] => {
    if (!yieldStats || yieldStats.length === 0) {
      // 回退到 mockData
      const activeBatches = cropBatches.filter(b => b.status === 'in_progress' || b.status === 'completed');
      const byCrop = activeBatches.reduce((acc, batch) => {
        if (!acc[batch.cropName]) {
          acc[batch.cropName] = 0;
        }
        acc[batch.cropName] += batch.actualYield;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(byCrop).map(([name, value]) => ({
        name,
        value,
      }));
    }

    // 按作物分组聚合
    const byCrop = yieldStats.reduce((acc, s) => {
      const name = s.name;
      if (!acc[name]) {
        acc[name] = 0;
      }
      acc[name] += s.value;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(byCrop).map(([name, value]) => ({
      name,
      value,
    }));
  }, [yieldStats]);

  // 成本分析数据 - 使用真实的成本统计数据
  const costAnalysis = useMemo((): CostAnalysisRow[] => {
    // 如果有从API获取的真实成本数据，则使用真实数据
    if (costStatsData) {
      const result: CostAnalysisRow[] = [];

      // 人工成本
      if (costStatsData.labor && costStatsData.labor.length > 0) {
        const totalLabor = costStatsData.labor.reduce((sum, item) => sum + Number(item.totalAmount), 0);
        result.push({ name: '人工成本', value: Math.round(totalLabor), period: 'month' });
      }

      // 物料成本（按类型汇总）
      if (costStatsData.material && costStatsData.material.length > 0) {
        const materialByType = costStatsData.material.reduce((acc, item) => {
          // costType 是英文，需要转换为中文标签
          const typeName = getCostTypeLabel(item.costType) || '其他物料';
          acc[typeName] = (acc[typeName] || 0) + Number(item.totalAmount);
          return acc;
        }, {} as Record<string, number>);

        Object.entries(materialByType).forEach(([type, amount]) => {
          result.push({ name: type, value: Math.round(amount), period: 'month' });
        });
      }

      // 能源成本（按类型汇总）
      if (costStatsData.energy && costStatsData.energy.length > 0) {
        const energyByType = costStatsData.energy.reduce((acc, item) => {
          const typeName = getCostTypeLabel(item.costType) || '其他能源';
          acc[typeName] = (acc[typeName] || 0) + Number(item.totalAmount);
          return acc;
        }, {} as Record<string, number>);

        Object.entries(energyByType).forEach(([type, amount]) => {
          result.push({ name: type, value: Math.round(amount), period: 'month' });
        });
      }

      // 如果没有真实数据，返回空数组让UI显示"暂无数据"
      if (result.length === 0) {
        return [];
      }

      return result;
    }

    // 如果有 laborStats 但没有 costStatsData，使用 laborStats 数据
    if (laborStats) {
      return [
        { name: '人工成本', value: Math.round(laborStats.summary.total_amount), period: 'month' },
        { name: '化肥成本', value: 28000, period: 'month', crop: 'C001' },
        { name: '农药成本', value: 15000, period: 'month', crop: 'C002' },
        { name: '种子种苗', value: 22000, period: 'quarter' },
        { name: '基质农膜', value: 18000, period: 'quarter', crop: 'C001' },
        { name: '能源成本', value: 15000, period: 'year' },
        { name: '其他成本', value: 13800, period: 'month', crop: 'C003' },
      ];
    }

    // 回退到考勤数据计算
    const totalLaborHours = attendance.reduce((sum, a) => sum + a.hours, 0);
    const laborCost = totalLaborHours * 30;

    return [
      { name: '人工成本', value: Math.round(laborCost), period: 'month' },
      { name: '化肥成本', value: 28000, period: 'month', crop: 'C001' },
      { name: '农药成本', value: 15000, period: 'month', crop: 'C002' },
      { name: '种子种苗', value: 22000, period: 'quarter' },
      { name: '基质农膜', value: 18000, period: 'quarter', crop: 'C001' },
      { name: '能源成本', value: 15000, period: 'year' },
      { name: '其他成本', value: 13800, period: 'month', crop: 'C003' },
    ];
  }, [costStatsData, costStatsSummary, laborStats, attendance]);

  // 成本类型标签映射（英文 -> 中文）
  function getCostTypeLabel(type?: string): string {
    if (!type) return '其他';
    const labelMap: Record<string, string> = {
      'fertilizer': '肥料',
      'pesticide': '农药',
      'seed': '种子种苗',
      'film': '基质农膜',
      'electricity': '电费',
      'water': '水费',
      'gas': '燃气费',
      'utility': '水电费',
      'maintenance': '维修费',
      'other': '其他',
    };
    return labelMap[type] || type;
  }

  // 月度工时数据
  const monthlyLabor = useMemo((): MonthlyLaborRow[] => {
    if (laborStats?.details) {
      return laborStats.details.map(d => ({
        month: d.month || d.name,
        hours: d.hours,
      }));
    }

    // 回退到考勤数据
    const baseHours = attendance.reduce((sum, a) => sum + a.hours, 0);
    const months = ['1月', '2月', '3月'];
    return months.map((month, idx) => {
      const monthRatio = [0.85, 0.92, 1.0];
      return {
        month,
        hours: Math.round(baseHours * 10 * monthRatio[idx]),
      };
    });
  }, [laborStats, attendance]);

  // 统计卡片数据
  const statCards = useMemo((): ReportStatCard[] => {
    if (overview) {
      return [
        { label: '生产批次', value: overview.batch.active_count, icon: '📦', iconBgColor: 'bg-blue-500' },
        { label: '总产量', value: (overview.yield.month_total_yield / 10000).toFixed(1) + '万kg', icon: '📈', iconBgColor: 'bg-green-500' },
        { label: '任务完成率', value: overview.task.completion_rate + '%', icon: '✅', iconBgColor: 'bg-purple-500' },
        { label: '总工时', value: overview.labor.total_hours.toLocaleString(), icon: '⏱️', iconBgColor: 'bg-amber-500' },
      ];
    }

    // 回退到 mockData
    const totalBatches = cropBatches.length;
    const totalYield = cropBatches.reduce((sum, b) => sum + b.actualYield, 0);
    const avgCompletion = cropBatches.length > 0
      ? (cropBatches.reduce((sum, b) => {
          const batchTasks = tasks.filter(t => t.batchId === b.id);
          const completed = batchTasks.filter(t => t.status === 'completed').length;
          return sum + (batchTasks.length > 0 ? (completed / batchTasks.length) * 100 : 0);
        }, 0) / cropBatches.length).toFixed(1)
      : '0';

    return [
      { label: '生产批次', value: totalBatches, icon: '📦', iconBgColor: 'bg-blue-500' },
      { label: '总产量', value: (totalYield / 10000).toFixed(1) + '万kg', icon: '📈', iconBgColor: 'bg-green-500' },
      { label: '平均完成率', value: avgCompletion + '%', icon: '✅', iconBgColor: 'bg-purple-500' },
      { label: '总工时', value: monthlyLabor.reduce((sum, m) => sum + m.hours, 0), icon: '⏱️', iconBgColor: 'bg-amber-500' },
    ];
  }, [overview, monthlyLabor]);

  return {
    loading,
    error,
    yieldStats: yieldStatsConverted,
    cropYieldData,
    costAnalysis,
    monthlyLabor,
    statCards,
    overview,
    refresh: loadData,
  };
}
