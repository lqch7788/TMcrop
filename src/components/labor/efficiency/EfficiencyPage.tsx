/**
 * 人效分析页面容器
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { EfficiencyDashboard } from './EfficiencyDashboard';
import { EfficiencyChart } from './EfficiencyChart';
import { EfficiencyTable } from './EfficiencyTable';
import { EfficiencyFilters } from './EfficiencyFilters';
import { useEfficiency } from './hooks/useEfficiency';

export const EfficiencyPage: React.FC = () => {
  const {
    data,
    trendData,
    summaryMetrics,
    filters,
    departments,
    updateFilters,
  } = useEfficiency();

  // 重置筛选条件
  const handleReset = () => {
    updateFilters({
      startDate: '2023-05',
      endDate: '2024-04',
      department: '全部',
    });
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">人效分析</h1>
            <p className="text-xs text-gray-500">查看各部门人效指标及趋势分析</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <EfficiencyFilters
        filters={filters}
        departments={departments}
        onFilterChange={updateFilters}
        onReset={handleReset}
      />

      {/* 核心指标仪表盘 */}
      <EfficiencyDashboard metrics={summaryMetrics} />

      {/* 趋势图表 */}
      <div className="mb-6">
        <EfficiencyChart data={trendData} />
      </div>

      {/* 详细数据表格 */}
      <EfficiencyTable data={data} />
    </div>
  );
};

export default EfficiencyPage;
