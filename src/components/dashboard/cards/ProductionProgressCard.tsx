import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useDashboardStore } from '../../../stores/useDashboardStore';
import { CardSkeleton } from './CardSkeleton';

export function ProductionProgressCard() {
  const navigate = useNavigate();
  const batchStats = useDashboardStore((s) => s.batchStats);
  const isLoading = useDashboardStore((s) => s.isLoading);
  const fetchBatchStats = useDashboardStore((s) => s.fetchBatchStats);

  useEffect(() => {
    fetchBatchStats({ limit: '50' });
  }, [fetchBatchStats]);

  // 从批次统计数据中计算生产进度（采收期批次和剩余天数）
  const productionProgress = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 筛选即将进入采收期的批次（status 为 in_progress 或 planted）
    const nearHarvest = batchStats
      .filter((b) => b.expectedHarvestDate && (b.status === 'in_progress' || b.status === 'planted'))
      .map((b) => {
        const harvestDate = new Date(b.expectedHarvestDate);
        const daysLeft = Math.max(0, Math.ceil((harvestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        return { name: b.cropName, daysLeft };
      })
      .filter((b) => b.daysLeft <= 30) // 30天内采收
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);

    return {
      harvestReady: nearHarvest.length,
      batches: nearHarvest,
    };
  }, [batchStats]);

  return (
    <button
      type="button"
      onClick={() => navigate('/production')}
      className="flex flex-col text-left w-full h-full bg-white rounded-xl shadow-none border border-gray-100 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 p-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
      aria-label={`生产进度：${productionProgress.harvestReady} 个批次在 30 天内进入采收期，点击查看生产计划`}
    >
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
              <span className="text-xs text-gray-600">{batch.daysLeft}天后</span>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}
