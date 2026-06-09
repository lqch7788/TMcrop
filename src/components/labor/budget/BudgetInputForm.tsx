import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Button, NumberInput, Label } from '@/components/ui';
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
            className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            {[2025, 2026, 2027].map((year) => (
              <option key={year} value={year}>
                {year}年
              </option>
            ))}
          </select>
          <Button variant="warning" size="sm" onClick={onReset}>
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 种植批次计划 */}
        <div className="col-span-2 border-b border-gray-200 pb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">种植批次计划</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="block text-xs text-gray-500 mb-1">种植批次数量</Label>
              <NumberInput
                value={input.batchCount}
                onChange={(val) => onUpdate({ batchCount: Number(val) })}
                decimals={0}
              />
            </div>
            <div>
              <Label className="block text-xs text-gray-500 mb-1">预期采收量(斤)</Label>
              <NumberInput
                value={input.expectedYield}
                onChange={(val) => onUpdate({ expectedYield: Number(val) })}
                decimals={0}
              />
            </div>
            <div>
              <Label className="block text-xs text-gray-500 mb-1">历史人工成本占比(%)</Label>
              <NumberInput
                value={input.laborCostRatio}
                onChange={(val) => onUpdate({ laborCostRatio: Number(val) })}
                decimals={2}
              />
            </div>
          </div>
        </div>

        {/* 季节性参数 */}
        <div className="col-span-2 border-b border-gray-200 pb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">季节性参数</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="block text-xs text-gray-500 mb-1">季节性波动系数(%)</Label>
              <NumberInput
                value={input.seasonFactor}
                onChange={(val) => onUpdate({ seasonFactor: Number(val) })}
                decimals={2}
              />
            </div>
            <div>
              <Label className="block text-xs text-gray-500 mb-1">是否旺季</Label>
              <select
                value={input.isPeakSeason ? '是' : '否'}
                onChange={(e) => onUpdate({ isPeakSeason: e.target.value === '是' })}
                className="w-full px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:ring-2 focus:ring-emerald-500"
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
              <Label className="block text-xs text-gray-500 mb-1">临时工比例(%)</Label>
              <NumberInput
                value={input.tempWorkerRatio}
                onChange={(val) => onUpdate({ tempWorkerRatio: Number(val) })}
                decimals={2}
              />
            </div>
            <div>
              <Label className="block text-xs text-gray-500 mb-1">临时工日均工资(元)</Label>
              <NumberInput
                value={input.tempWorkerDailyRate}
                onChange={(val) => onUpdate({ tempWorkerDailyRate: Number(val) })}
                decimals={2}
              />
            </div>
          </div>
        </div>

        {/* 正式工参数 */}
        <div className="col-span-2 border-b border-gray-200 pb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">正式工参数</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="block text-xs text-gray-500 mb-1">正式工人数</Label>
              <NumberInput
                value={input.formalWorkerCount}
                onChange={(val) => onUpdate({ formalWorkerCount: Number(val) })}
                decimals={0}
              />
            </div>
            <div>
              <Label className="block text-xs text-gray-500 mb-1">正式工人均月工资(元)</Label>
              <NumberInput
                value={input.formalWorkerAvgSalary}
                onChange={(val) => onUpdate({ formalWorkerAvgSalary: Number(val) })}
                decimals={2}
              />
            </div>
          </div>
        </div>

        {/* 福利保险 */}
        <div className="col-span-2 border-b border-gray-200 pb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">福利保险</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="block text-xs text-gray-500 mb-1">社保公积金比例(%)</Label>
              <NumberInput
                value={input.socialSecurityRate}
                onChange={(val) => onUpdate({ socialSecurityRate: Number(val) })}
                decimals={2}
              />
            </div>
            <div>
              <Label className="block text-xs text-gray-500 mb-1">福利补贴比例(%)</Label>
              <NumberInput
                value={input.benefitsRate}
                onChange={(val) => onUpdate({ benefitsRate: Number(val) })}
                decimals={2}
              />
            </div>
          </div>
        </div>

        {/* 超预算预警 */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-gray-700 mb-3">超预算预警</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="block text-xs text-gray-500 mb-1">预警阈值(%)</Label>
              <NumberInput
                value={input.warningThreshold}
                onChange={(val) => onUpdate({ warningThreshold: Number(val) })}
                decimals={2}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetInputForm;
