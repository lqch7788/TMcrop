/**
 * 成本核算Tab组件
 * 生产领料的成本核算功能
 */

import React, { useState, memo, useCallback } from 'react';
import { CostFilters } from '../../cost/CostFiltersForm';
import { CostTabSwitcher } from '../../cost/CostTabSwitcher';
import { CostFiltersForm } from '../../cost/CostFiltersForm';
import { CostKPICards } from '../../cost/CostKPICards';
import { CostPieChart } from '../../cost/CostPieChart';
import { CostTrendChart } from '../../cost/CostTrendChart';
import { CostComparisonTable } from '../../cost/CostComparisonTable';
import { CostDetailModal } from '../../cost/CostDetailModal';
import {
  filterCostRecords,
  calcCostTotal,
  calcMonthlyCost,
  aggregateByCategory,
  aggregateByDepartment,
  aggregateByBatch,
  aggregateByMonth,
  getFilteredMaterialDetails,
  getBatchMaterialDetails,
} from '../../../data/costData';

// 成本Tab组件接口
interface CostTabProps {
  // Props接口定义(如有需要可扩展)
}

// 获取初始成本筛选状态
const getInitialCostFilters = (): CostFilters => {
  const now = new Date();
  return {
    quickPeriod: 'year',
    dateRange: {
      start: `${now.getFullYear()}-01-01`,
      end: now.toISOString().split('T')[0],
    },
    departments: [],
    categories: [],
    batches: [],
    warehouses: [],
  };
};

/**
 * 成本核算Tab组件
 * 包含成本概览和分类对比两个子Tab
 */
const CostTab = memo(function CostTab() {
  // 成本核算页面状态
  const [costActiveTab, setCostActiveTab] = useState<'overview' | 'comparison'>('overview');
  const [costDetailModalOpen, setCostDetailModalOpen] = useState(false);
  const [costDetailTitle, setCostDetailTitle] = useState('');
  const [costDetailData, setCostDetailData] = useState<any[]>([]);
  const [costFilters, setCostFilters] = useState<CostFilters>(getInitialCostFilters);

  // 处理成本详情查看
  const handleViewDetail = useCallback((
    dimension: 'category' | 'department' | 'batch',
    value: string,
    filteredRecords: any[]
  ) => {
    const details = getFilteredMaterialDetails(filteredRecords, dimension, value);
    setCostDetailTitle(`${value} 明细`);
    setCostDetailData(details);
    setCostDetailModalOpen(true);
  }, []);

  return (
    <div className="space-y-4">
      {/* Tab切换 - 放在时间筛选上方 */}
      <CostTabSwitcher activeTab={costActiveTab} onTabChange={setCostActiveTab} />

      {/* 筛选表单 */}
      <CostFiltersForm filters={costFilters} onChange={setCostFilters} />

      {/* Tab 1: 成本概览 */}
      {costActiveTab === 'overview' && (
        <div className="space-y-4">
          {/* 动态计算KPI */}
          {(() => {
            const filteredRecords = filterCostRecords(costFilters);
            const totalCost = calcCostTotal(filteredRecords);
            const monthlyCost = calcMonthlyCost(filteredRecords);
            const batchData = aggregateByBatch(filteredRecords);
            const avgBatchCost = batchData.length > 0 ? totalCost / batchData.length : 0;
            const costDiffRate = -2.3; // 简化处理
            return (
              <CostKPICards
                totalCost={totalCost}
                monthlyCost={monthlyCost}
                avgBatchCost={avgBatchCost}
                costDiffRate={costDiffRate}
              />
            );
          })()}

          <div className="grid grid-cols-3 gap-4">
            {/* 成本构成饼图 */}
            <div className="col-span-1">
              {(() => {
                const filteredRecords = filterCostRecords(costFilters);
                const categoryData = aggregateByCategory(filteredRecords);
                const pieData = categoryData.map(cat => ({
                  name: cat.category,
                  value: cat.totalAmount,
                  percentage: cat.percentage,
                  solid: '#10B981',
                }));
                return <CostPieChart data={pieData} />;
              })()}
            </div>

            {/* 成本趋势图 */}
            <div className="col-span-2">
              {(() => {
                const filteredRecords = filterCostRecords(costFilters);
                const monthData = aggregateByMonth(filteredRecords);
                const trendData = monthData.map(m => ({
                  month: m.month,
                  totalCost: m.totalAmount,
                }));
                return <CostTrendChart data={trendData} />;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 分类对比 */}
      {costActiveTab === 'comparison' && (
        <div className="space-y-4">
          {(() => {
            const filteredRecords = filterCostRecords(costFilters);
            const categoryData = aggregateByCategory(filteredRecords);
            const deptData = aggregateByDepartment(filteredRecords);
            const batchData = aggregateByBatch(filteredRecords);
            const batchMaterialDetails = getBatchMaterialDetails(filteredRecords);
            return (
              <CostComparisonTable
                categoryData={categoryData}
                departmentData={deptData}
                batchData={batchData}
                batchMaterialDetails={batchMaterialDetails}
                onViewDetail={(dimension, value) => handleViewDetail(dimension, value, filteredRecords)}
              />
            );
          })()}
        </div>
      )}

      {/* 成本明细弹窗 */}
      <CostDetailModal
        isOpen={costDetailModalOpen}
        onClose={() => setCostDetailModalOpen(false)}
        title={costDetailTitle}
        data={costDetailData}
      />
    </div>
  );
});

export default CostTab;
