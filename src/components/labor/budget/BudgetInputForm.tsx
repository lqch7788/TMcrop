import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { BudgetInput } from './types';

interface BudgetInputFormProps {
  input: BudgetInput;
  onUpdate: (input: Partial<BudgetInput>) => void;
  onReset: () => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export const BudgetInputForm: React.FC<BudgetInputFormProps> = ({
  input,
  onUpdate,
  onReset,
  selectedYear,
  onYearChange,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">预算参数设置</h3>
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            {[2025, 2026, 2027].map((year) => (
              <option key={year} value={year}>
                {year}年
              </option>
            ))}
          </select>
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <RefreshCw className="w-3 h-3" />
            重置
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 种植批次计划 */}
        <div className="col-span-2 border-b border-gray-200 pb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">种植批次计划</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">种植批次数量</label>
              <input
                type="number"
                value={input.batchCount}
                onChange={(e) => onUpdate({ batchCount: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">预期采收量(斤)</label>
              <input
                type="number"
                value={input.expectedYield}
                onChange={(e) => onUpdate({ expectedYield: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">历史人工成本占比(%)</label>
              <input
                type="number"
                value={input.laborCostRatio}
                onChange={(e) => onUpdate({ laborCostRatio: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 季节性参数 */}
        <div className="col-span-2 border-b border-gray-200 pb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">季节性参数</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">季节性波动系数(%)</label>
              <input
                type="number"
                value={input.seasonFactor}
                onChange={(e) => onUpdate({ seasonFactor: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">是否旺季</label>
              <select
                value={input.isPeakSeason ? '是' : '否'}
                onChange={(e) => onUpdate({ isPeakSeason: e.target.value === '是' })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="是">是</option>
                <option value="否">否</option>
              </select>
            </div>
          </div>
        </div>

        {/* 临时工参数 */}
        <div className="col-span-2 border-b border-gray-200 pb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">临时工参数</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">临时工比例(%)</label>
              <input
                type="number"
                value={input.tempWorkerRatio}
                onChange={(e) => onUpdate({ tempWorkerRatio: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">临时工日均工资(元)</label>
              <input
                type="number"
                value={input.tempWorkerDailyRate}
                onChange={(e) => onUpdate({ tempWorkerDailyRate: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 正式工参数 */}
        <div className="col-span-2 border-b border-gray-200 pb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">正式工参数</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">正式工人数</label>
              <input
                type="number"
                value={input.formalWorkerCount}
                onChange={(e) => onUpdate({ formalWorkerCount: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">正式工人均月工资(元)</label>
              <input
                type="number"
                value={input.formalWorkerAvgSalary}
                onChange={(e) => onUpdate({ formalWorkerAvgSalary: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 福利保险 */}
        <div className="col-span-2 border-b border-gray-200 pb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">福利保险</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">社保公积金比例(%)</label>
              <input
                type="number"
                value={input.socialSecurityRate}
                onChange={(e) => onUpdate({ socialSecurityRate: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">福利补贴比例(%)</label>
              <input
                type="number"
                value={input.benefitsRate}
                onChange={(e) => onUpdate({ benefitsRate: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 超预算预警 */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-gray-700 mb-3">超预算预警</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">预警阈值(%)</label>
              <input
                type="number"
                value={input.warningThreshold}
                onChange={(e) => onUpdate({ warningThreshold: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetInputForm;
