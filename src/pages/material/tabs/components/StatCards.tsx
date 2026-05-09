// StatCards 组件 - 统计卡片区域
// 显示领料单数、领料总量、总金额、差异率四个统计卡片
import { ClipboardList, Package, TrendingDown } from 'lucide-react';
import type { StatSummaryData } from '../types/statisticsTab.types';

interface StatCardsProps {
  /** 统计数据 */
  data: StatSummaryData;
}

export function StatCards({ data }: StatCardsProps) {
  return (
    /* 统计卡片区域 - 紧凑横向布局 */
    <div className="grid grid-cols-4 gap-3 mb-4">
      {/* 卡片1: 领料单数 */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg p-3 border border-emerald-200/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs text-emerald-600/70">领料单数</div>
            <div className="text-xl font-bold text-emerald-700">{data.requisitionCount}</div>
          </div>
        </div>
      </div>

      {/* 卡片2: 领料总量 */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs text-blue-600/70">领料总量</div>
            <div className="text-xl font-bold text-blue-700">{data.totalQuantity.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 卡片3: 总金额 */}
      <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-lg p-3 border border-amber-200/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">¥</span>
          </div>
          <div>
            <div className="text-xs text-amber-600/70">总金额</div>
            <div className="text-xl font-bold text-amber-700">¥{data.totalAmount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 卡片4: 差异率 */}
      <div className={`bg-gradient-to-br rounded-lg p-3 border ${
        data.avgDifferenceRate < 0
          ? 'from-green-50 to-green-100/50 border-green-200/50'
          : 'from-red-50 to-red-100/50 border-red-200/50'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            data.avgDifferenceRate < 0 ? 'bg-green-500' : 'bg-red-500'
          }`}>
            <TrendingDown className={`w-4 h-4 text-white ${data.avgDifferenceRate >= 0 ? 'transform rotate-180' : ''}`} />
          </div>
          <div>
            <div className={`text-xs ${data.avgDifferenceRate < 0 ? 'text-green-600/70' : 'text-red-600/70'}`}>差异率</div>
            <div className={`text-xl font-bold ${data.avgDifferenceRate < 0 ? 'text-green-700' : 'text-red-700'}`}>
              {data.avgDifferenceRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
