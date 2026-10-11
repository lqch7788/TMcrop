import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useDashboardStore } from '../../../stores/useDashboardStore';

/**
 * 今日能耗卡
 * 2026-10-11 数据真实化：原 defaultEnergy 硬编码改为 /api/summary/cost-stats 的 energy 明细
 * （energy_costs 表：水/电/气按账期聚合），展示最新账期用量 + 与上一账期的环比趋势
 */

/** 能耗类型 → 计量单位（与 energy_costs 表 unit 一致） */
const ENERGY_UNIT_LABELS: Record<string, string> = {
  electricity: '度',
  water: '吨',
  gas: 'm³',
};

export function EnergyCard() {
  const navigate = useNavigate();
  const costStats = useDashboardStore((s) => s.costStats);
  const fetchCostStats = useDashboardStore((s) => s.fetchCostStats);

  useEffect(() => {
    fetchCostStats();
  }, [fetchCostStats]);

  // 最新账期的水/电/气用量 + 与上一账期的环比趋势（真实数据，energy_costs 表）
  const energyConsumption = useMemo(() => {
    const energy = costStats?.energy || [];
    if (energy.length === 0) return null;

    const months = Array.from(new Set(energy.map((i) => i.month))).filter(Boolean).sort();
    const latestMonth = months[months.length - 1];
    const prevMonth = months[months.length - 2];
    const sumOf = (month: string, type: string) =>
      energy
        .filter((i) => i.month === month && i.costType === type)
        .reduce((s, i) => s + (Number(i.totalQuantity) || 0), 0);
    // 环比趋势：与上一有数据的账期对比（上一期无数据显示持平）
    const trend = (cur: number, prevValue: number) =>
      prevValue > 0 ? Math.round(((cur - prevValue) / prevValue) * 100) : 0;

    const water = Math.round(sumOf(latestMonth, 'water'));
    const electricity = Math.round(sumOf(latestMonth, 'electricity'));
    const gas = Math.round(sumOf(latestMonth, 'gas'));
    return {
      month: latestMonth,
      water,
      waterTrend: trend(water, sumOf(prevMonth, 'water')),
      electricity,
      electricityTrend: trend(electricity, sumOf(prevMonth, 'electricity')),
      gas,
      gasTrend: trend(gas, sumOf(prevMonth, 'gas')),
    };
  }, [costStats]);

  // 2026-06-15 P0-6: 趋势加图标(色盲可读) + aria-label(屏幕阅读器可读)
  // 业务语义: 能耗增加(↑)为"坏" -> 红色; 减少(↓)为"好" -> 绿色; 持平 -> 中性灰
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return (
      <span className="inline-flex items-center gap-0.5 text-red-600" aria-label={`较上期上升 ${trend}%`}>
        <TrendingUp className="w-3 h-3" aria-hidden="true" />{trend}%
      </span>
    );
    if (trend < 0) return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600" aria-label={`较上期下降 ${Math.abs(trend)}%`}>
        <TrendingDown className="w-3 h-3" aria-hidden="true" />{Math.abs(trend)}%
      </span>
    );
    return (
      <span className="inline-flex items-center text-gray-600" aria-label="较上期持平">
        <Minus className="w-3 h-3" aria-hidden="true" />
      </span>
    );
  };

  return (
    <button
      type="button"
      onClick={() => navigate('/summary/indicators')}
      className="flex flex-col text-left w-full h-full bg-white rounded-xl shadow-none border border-gray-100 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 p-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:outline-none"
      aria-label={energyConsumption
        ? `能耗统计（${energyConsumption.month} 账期）：水 ${energyConsumption.water} 吨、电 ${energyConsumption.electricity} 度、气 ${energyConsumption.gas} 立方米，点击查看指标详情`
        : '能耗统计：暂无数据'}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2 bg-gradient-to-br from-yellow-500 to-orange-600">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900 whitespace-nowrap">能耗统计</span>
        </div>
      </div>
      {!energyConsumption ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400 py-4">
          暂无能耗数据
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">水</span>
            <span className="font-medium">{energyConsumption.water}{ENERGY_UNIT_LABELS.water} {getTrendIcon(energyConsumption.waterTrend)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">电</span>
            <span className="font-medium">{energyConsumption.electricity}{ENERGY_UNIT_LABELS.electricity} {getTrendIcon(energyConsumption.electricityTrend)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">气</span>
            <span className="font-medium">{energyConsumption.gas}{ENERGY_UNIT_LABELS.gas} {getTrendIcon(energyConsumption.gasTrend)}</span>
          </div>
          {/* 账期口径说明（放到数据下方，避免挤占标题行） */}
          <div className="text-right text-[10px] text-gray-400">{energyConsumption.month} 账期</div>
        </div>
      )}
    </button>
  );
}
