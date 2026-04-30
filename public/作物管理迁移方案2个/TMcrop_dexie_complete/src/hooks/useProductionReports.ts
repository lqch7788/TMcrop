/**
 * 生产报表数据 Hook
 * 用于生产报表(Reports)页面的数据聚合
 * 支持 localStorage 持久化
 */

import { useState, useEffect, useMemo } from 'react';
import type { ReportStatCard } from '../types/views';
import { cropBatches, tasks } from '../data/mockData';
import { usePersistentAttendance } from './usePersistentAttendance';

/**
 * 生产报表数据 Hook
 */
export function useProductionReports() {
  const [loading, setLoading] = useState(true);
  const { attendance } = usePersistentAttendance();

  // 模拟异步加载
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // 产量统计数据 - 从 cropBatches 聚合
  const yieldStats = useMemo(() => {
    // 按作物和状态聚合产量
    const activeBatches = cropBatches.filter(b => b.status === 'in_progress' || b.status === 'completed');

    // 按作物名称分组汇总
    const byCrop = activeBatches.reduce((acc, batch) => {
      if (!acc[batch.cropName]) {
        acc[batch.cropName] = { yield: 0, count: 0 };
      }
      acc[batch.cropName].yield += batch.actualYield;
      acc[batch.cropName].count += 1;
      return acc;
    }, {} as Record<string, { yield: number; count: number }>);

    // 转换为月度数据（简化模拟：按作物分布到不同月份）
    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
    const cropNames = Object.keys(byCrop);

    return months.map((month, idx) => {
      // 模拟月度产量分布
      const baseYield = cropNames.reduce((sum, crop) => {
        return sum + byCrop[crop].yield;
      }, 0);

      // 按月份分配不同产量比例
      const monthRatio = [0.12, 0.15, 0.18, 0.20, 0.18, 0.17];
      const randomFactor = 0.9 + Math.random() * 0.2;

      return {
        month,
        yield: Math.round(baseYield * monthRatio[idx] * randomFactor),
        region: 'G001',
        crop: cropNames[idx % cropNames.length] || '番茄',
      };
    });
  }, []);

  // 作物产量占比
  const cropYieldData = useMemo(() => {
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
  }, []);

  // 成本分析数据 - 基于考勤数据计算人工成本
  const costAnalysis = useMemo(() => {
    // 计算人工成本（从考勤数据）
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
  }, [attendance]);

  // 月度工时数据 - 从考勤聚合
  const monthlyLabor = useMemo(() => {
    const baseHours = attendance.reduce((sum, a) => sum + a.hours, 0);

    const months = ['1月', '2月', '3月'];
    return months.map((month, idx) => {
      const monthRatio = [0.85, 0.92, 1.0];
      return {
        month,
        hours: Math.round(baseHours * 10 * monthRatio[idx]),
      };
    });
  }, [attendance]);

  // 统计卡片数据
  const statCards = useMemo((): ReportStatCard[] => {
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
  }, [monthlyLabor]);

  return {
    loading,
    yieldStats,
    cropYieldData,
    costAnalysis,
    monthlyLabor,
    statCards,
  };
}
