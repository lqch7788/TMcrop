import { Zap } from 'lucide-react';
import { energyConsumption } from '../../../data/mockData';

export function EnergyCard() {
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <span className="text-red-500">↑{trend}%</span>;
    if (trend < 0) return <span className="text-emerald-500">↓{Math.abs(trend)}%</span>;
    return <span className="text-gray-400">→</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-none border border-gray-100 hover:shadow-md transition-shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2 bg-gradient-to-br from-yellow-500 to-orange-600">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">今日能耗</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">水</span>
          <span className="font-medium">{energyConsumption.water}m³ {getTrendIcon(energyConsumption.waterTrend)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">电</span>
          <span className="font-medium">{energyConsumption.electricity}kWh {getTrendIcon(energyConsumption.electricityTrend)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">气</span>
          <span className="font-medium">{energyConsumption.gas}m³ {getTrendIcon(energyConsumption.gasTrend)}</span>
        </div>
      </div>
    </div>
  );
}
