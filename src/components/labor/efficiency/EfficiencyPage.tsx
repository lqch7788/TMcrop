/**
 * 人效分析页面容器
 */

import React from 'react';
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
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">人效分析</h1>
        <p className="text-sm text-gray-500 mt-1">查看各部门人效指标及趋势分析</p>
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
