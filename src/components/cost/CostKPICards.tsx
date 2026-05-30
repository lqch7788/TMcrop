import React from 'react';
import { TrendingUp, TrendingDown, Calendar, BarChart2 } from 'lucide-react';

interface CostKPICardsProps {
  totalCost: number;
  monthlyCost: number;
  avgBatchCost: number;
  costDiffRate: number;
}

export const CostKPICards: React.FC<CostKPICardsProps> = ({
  totalCost,
  monthlyCost,
  avgBatchCost,
  costDiffRate,
}) => {
  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      {/* 累计总成本 */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg p-3 border border-emerald-200/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">¥</span>
          </div>
          <div>
            <div className="text-xs text-emerald-600/70">累计总成本</div>
            <div className="text-xl font-bold text-emerald-700">¥{totalCost.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 本月成本 */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs text-blue-600/70">本月成本</div>
            <div className="text-xl font-bold text-blue-700">¥{monthlyCost.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 平均批次成本 */}
      <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-lg p-3 border border-amber-200/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs text-amber-600/70">平均批次成本</div>
            <div className="text-xl font-bold text-amber-700">¥{avgBatchCost.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 成本差异率 */}
      <div className={`bg-gradient-to-br rounded-lg p-3 border ${
        costDiffRate < 0
          ? 'from-green-50 to-green-100/50 border-green-200/50'
          : 'from-red-50 to-red-100/50 border-red-200/50'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            costDiffRate < 0 ? 'bg-green-500' : 'bg-red-500'
          }`}>
            <TrendingDown className={`w-4 h-4 text-white ${costDiffRate >= 0 ? 'transform rotate-180' : ''}`} />
          </div>
          <div>
            <div className={`text-xs ${costDiffRate < 0 ? 'text-green-600/70' : 'text-red-600/70'}`}>成本差异率</div>
            <div className={`text-xl font-bold ${costDiffRate < 0 ? 'text-green-700' : 'text-red-700'}`}>
              {costDiffRate > 0 ? '+' : ''}{costDiffRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostKPICards;
// logger.info('组件创建成功: CostKPICards');
