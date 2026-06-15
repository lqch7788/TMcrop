import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useDashboardStore } from '../../../stores/useDashboardStore';

/** 能耗数据（后续迁移到独立指标 API /api/summary/indicators） */
const defaultEnergy = {
  water: 120,
  electricity: 380,
  gas: 25,
  waterTrend: 10,
  electricityTrend: -5,
  gasTrend: 0,
  date: '2024-03-15',
};

export function EnergyCard() {
  const navigate = useNavigate();
  const dashboardStats = useDashboardStore((s) => s.dashboardStats);
  const fetchDashboardStats = useDashboardStore((s) => s.fetchDashboardStats);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // 能耗数据暂使用默认值，后续迁移到 /api/summary/indicators
  const energyConsumption = defaultEnergy;

  // 2026-06-15 P0-6: 趋势加图标(色盲可读) + aria-label(屏幕阅读器可读)
  // 业务语义: 能耗增加(↑)为"坏" -> 红色; 减少(↓)为"好" -> 绿色; 持平 -> 中性灰
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return (
      <span className="inline-flex items-center gap-0.5 text-red-600" aria-label={`同比上升 ${trend}%`}>
        <TrendingUp className="w-3 h-3" aria-hidden="true" />{trend}%
      </span>
    );
    if (trend < 0) return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600" aria-label={`同比下降 ${Math.abs(trend)}%`}>
        <TrendingDown className="w-3 h-3" aria-hidden="true" />{Math.abs(trend)}%
      </span>
    );
    return (
      <span className="inline-flex items-center text-gray-600" aria-label="同比持平">
        <Minus className="w-3 h-3" aria-hidden="true" />
      </span>
    );
  };

  return (
    <button
      type="button"
      onClick={() => navigate('/summary/indicators')}
      className="flex flex-col text-left w-full h-full bg-white rounded-xl shadow-none border border-gray-100 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 p-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:outline-none"
      aria-label={`今日能耗：水 ${energyConsumption.water} 立方米、电 ${energyConsumption.electricity} 千瓦时、气 ${energyConsumption.gas} 立方米，点击查看指标详情`}
    >
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
    </button>
  );
}
