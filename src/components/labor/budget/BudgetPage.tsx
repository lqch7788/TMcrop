import React from 'react';
import { AlertTriangle, AlertCircle, Info, Calculator } from 'lucide-react';
import { useBudget } from './hooks/useBudget';
import { BudgetChart } from './BudgetChart';
import { BudgetInputForm } from './BudgetInputForm';
import type { BudgetWarning } from './types';

export const BudgetPage: React.FC = () => {
  const {
    input,
    output,
    selectedYear,
    setSelectedYear,
    updateInput,
    resetInput,
  } = useBudget();

  // 预警级别颜色
  const warningColors: Record<BudgetWarning['level'], string> = {
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    critical: 'bg-red-50 border-red-200 text-red-700',
  };

  const warningIcons: Record<BudgetWarning['level'], React.ReactNode> = {
    info: <Info className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    critical: <AlertCircle className="w-5 h-5" />,
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">工资预算预测</h1>
            <p className="text-xs text-gray-500">基于种植批次计划的人工成本预算分析</p>
          </div>
        </div>
      </div>

      {/* 预警信息 */}
      {output.warnings.length > 0 && (
        <div className="space-y-2">
          {output.warnings.map((warning, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${warningColors[warning.level]}`}
            >
              {warningIcons[warning.level]}
              <span className="text-sm">{warning.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* 左侧：参数设置 */}
        <div className="col-span-1">
          <BudgetInputForm
            input={input}
            onUpdate={updateInput}
            onReset={resetInput}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </div>

        {/* 右侧：图表 */}
        <div className="col-span-2 space-y-4">
          <BudgetChart
            monthlyData={output.monthlyBudget}
            quarterlyData={output.quarterlyBudget}
          />
        </div>
      </div>

      {/* 年度汇总 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{selectedYear}年度预算汇总</h3>
        <div className="grid grid-cols-5 gap-4">
          <SummaryCard
            label="年度总成本"
            value={`${(output.yearlyBudget.totalLaborCost / 10000).toFixed(2)}万元`}
            subValue={`¥${output.yearlyBudget.totalLaborCost.toLocaleString()}`}
            color="emerald"
          />
          <SummaryCard
            label="正式工成本"
            value={`${(output.yearlyBudget.formalWorkerCost / 10000).toFixed(2)}万元`}
            subValue={`占比${((output.yearlyBudget.formalWorkerCost / output.yearlyBudget.totalLaborCost) * 100).toFixed(1)}%`}
            color="blue"
          />
          <SummaryCard
            label="临时工成本"
            value={`${(output.yearlyBudget.tempWorkerCost / 10000).toFixed(2)}万元`}
            subValue={`占比${((output.yearlyBudget.tempWorkerCost / output.yearlyBudget.totalLaborCost) * 100).toFixed(1)}%`}
            color="amber"
          />
          <SummaryCard
            label="预计总采收量"
            value={`${(output.yearlyBudget.totalYield / 10000).toFixed(2)}万斤`}
            subValue={`人均${(output.yearlyBudget.totalYield / output.yearlyBudget.avgHeadcount).toFixed(0)}斤/人`}
            color="purple"
          />
          <SummaryCard
            label="平均单位成本"
            value={`¥${output.yearlyBudget.avgCostPerUnit.toFixed(2)}/斤`}
            subValue={`预警阈值${input.warningThreshold}%`}
            color="gray"
          />
        </div>

        {/* 季度分布 */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">季度成本分布</h4>
          <div className="grid grid-cols-4 gap-4">
            {output.quarterlyBudget.map((quarter) => (
              <div key={quarter.quarter} className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">{quarter.quarter}</div>
                <div className="text-lg font-semibold text-gray-900">
                  {(quarter.laborCost / 10000).toFixed(2)}万元
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  用工{quarter.headcount}人 | 采收{quarter.yieldPrediction.toLocaleString()}斤
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 月度明细表 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">月度预算明细</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">月份</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">总成本(万元)</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">正式工(万元)</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">临时工(万元)</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">社保(万元)</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">福利(万元)</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">人数</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">采收量(万斤)</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">单位成本</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-300">
              {output.monthlyBudget.map((month) => (
                <tr key={month.month} className="hover:bg-blue-100 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{month.month}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-emerald-600 whitespace-nowrap">
                    {(month.laborCost / 10000).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {(month.formalWorkerCost / 10000).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {(month.tempWorkerCost / 10000).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {(month.socialSecurity / 10000).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {(month.benefits / 10000).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{month.headcount}</td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {(month.yieldPrediction / 10000).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">¥{month.costPerUnit.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 汇总卡片组件
const SummaryCard: React.FC<{
  label: string;
  value: string;
  subValue: string;
  color: string;
}> = ({ label, value, subValue, color }) => {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    gray: 'bg-gray-50 text-gray-600',
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colorClasses[color]} mb-2`}>
        {label}
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{subValue}</div>
    </div>
  );
};

export default BudgetPage;
