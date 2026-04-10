import { TrendingUp } from 'lucide-react';
import { productionProgress } from '../../../data/mockData';

export function ProductionProgressCard() {
  return (
    <div className="bg-white rounded-xl shadow-none border border-gray-100 hover:shadow-md transition-shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2 bg-gradient-to-br from-violet-500 to-purple-600">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">生产进度</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-violet-600">{productionProgress.harvestReady}</span>
          <span className="text-sm text-gray-500">个批次进入采收期</span>
        </div>
        <div className="space-y-1 mt-2">
          {productionProgress.batches.map((batch, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{batch.name}</span>
              <span className="text-xs text-gray-400">{batch.daysLeft}天后</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
