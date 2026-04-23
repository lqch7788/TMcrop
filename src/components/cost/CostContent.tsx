import React, { useState } from 'react';
import { CostTabSwitcher } from './CostTabSwitcher';
import CostKPICards from './CostKPICards';
import CostPieChart from './CostPieChart';
import CostTrendChart from './CostTrendChart';
import CostComparisonCharts from './CostComparisonCharts';
import CostComparisonTable from './CostComparisonTable';
import CostFiltersForm from './CostFiltersForm';
import CostBatchTable from './CostBatchTable';
import CostDetailModal from './CostDetailModal';

// 导入数据
import { monthlyStatisticsData, categoryPieData, trendChartData } from '../../data/materialReceivingData';

// 批次成本数据类型
interface BatchCostDetail {
  batchCode: string;
  cropName: string;
  area: string;
  materialCount: number;
  totalCost: number;
  unitCost: number;
}

// 从领料统计数据计算成本数据
const calculateCostData = () => {
  const totalCost = monthlyStatisticsData.reduce((sum, d) => sum + d.totalAmount, 0);
  const monthlyCost = monthlyStatisticsData
    .filter(d => d.month === '03')
    .reduce((sum, d) => sum + d.totalAmount, 0);
  const avgBatchCost = totalCost / Math.max(monthlyStatisticsData.length, 1);
  const costDiffRate = monthlyStatisticsData.length > 0
    ? monthlyStatisticsData.reduce((sum, d) => sum + d.differenceRate, 0) / monthlyStatisticsData.length
    : 0;

  return {
    totalCost,
    monthlyCost,
    avgBatchCost,
    costDiffRate,
  };
};

// 部门成本数据
const getDepartmentCostData = () => {
  const deptData = monthlyStatisticsData.reduce((acc, d) => {
    if (!acc[d.department]) {
      acc[d.department] = { name: d.department, value: 0, percentage: 0 };
    }
    acc[d.department].value += d.totalAmount;
    return acc;
  }, {} as Record<string, { name: string; value: number; percentage: number }>);

  const total = Object.values(deptData).reduce((sum, d) => sum + d.value, 0);
  return Object.values(deptData).map(d => ({
    ...d,
    percentage: total > 0 ? (d.value / total) * 100 : 0,
  }));
};

// 分类成本数据
const getCategoryCostData = () => {
  return categoryPieData;
};

// 月度趋势数据
const getMonthlyTrendData = () => {
  return trendChartData.map(d => ({
    month: d.month,
    cost: d.amount,
    quantity: d.quantity,
  }));
};

// 批次成本数据
const getBatchCostData = (): BatchCostDetail[] => {
  return [
    { batchCode: 'FQ2026-001', cropName: '番茄', area: '玻璃温室A区', materialCount: 8, totalCost: 25600, unitCost: 12.8 },
    { batchCode: 'FQ2026-002', cropName: '黄瓜', area: '日光温室1号', materialCount: 6, totalCost: 18900, unitCost: 9.5 },
    { batchCode: 'FQ2026-003', cropName: '茄子', area: '塑料大棚2号', materialCount: 5, totalCost: 14200, unitCost: 7.1 },
    { batchCode: 'FQ2026-004', cropName: '辣椒', area: '日光温室2号', materialCount: 7, totalCost: 21500, unitCost: 10.8 },
    { batchCode: 'FQ2026-005', cropName: '水稻', area: 'A1地块', materialCount: 4, totalCost: 9800, unitCost: 4.9 },
  ];
};

type TabKey = 'overview' | 'comparison';

export const CostContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [filters, setFilters] = useState({
    dateRange: { start: '2025-01', end: '2025-12' },
    department: '全部',
    category: '全部',
  });
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const costData = calculateCostData();
  const departmentData = getDepartmentCostData();
  const categoryData = getCategoryCostData();
  const trendData = getMonthlyTrendData();
  const batchData = getBatchCostData();

  const handleViewDetail = (record: any) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      {/* 成本Tab切换 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <CostTabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* 成本概览内容 */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI卡片 */}
          <CostKPICards
            totalCost={costData.totalCost}
            monthlyCost={costData.monthlyCost}
            avgBatchCost={costData.avgBatchCost}
            costDiffRate={costData.costDiffRate}
          />

          {/* 筛选表单 */}
          <CostFiltersForm filters={filters} onChange={setFilters} />

          {/* 图表区域 */}
          <div className="grid grid-cols-2 gap-6">
            {/* 成本构成饼图 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">成本构成分析</h3>
              <CostPieChart data={categoryData} />
            </div>

            {/* 月度趋势图 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">成本趋势</h3>
              <CostTrendChart data={trendData} />
            </div>
          </div>

          {/* 批次明细表 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">批次成本明细</h3>
            <CostBatchTable data={batchData} />
          </div>
        </div>
      )}

      {/* 分类对比内容 */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          {/* 分类对比图表 */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">部门成本对比</h3>
              <CostComparisonCharts type="department" data={departmentData} />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">分类成本对比</h3>
              <CostComparisonCharts type="category" data={categoryData} />
            </div>
          </div>

          {/* 对比表格 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">成本对比明细</h3>
            <CostComparisonTable departmentData={departmentData} categoryData={categoryData} />
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      <CostDetailModal
        isOpen={showDetailModal}
        record={selectedRecord}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  );
};

export default CostContent;
