/**
 * 指标看板页面 - 种植关键指标仪表盘
 * 数据源：useSummaryDataStore → indicators (ProductionIndicator[])
 * 路由：/summary/indicators
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Gauge, Star, Target, TrendingUp, DollarSign,
  CheckCircle2, Loader2
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip
} from 'recharts';
import { PageHeader, GaugeChart } from '../../components/summary';
import { Button } from '../../components/ui';
import { useSummaryDataStore } from '../../stores';

// ========== 颜色常量 ==========
const COLORS = {
  emerald: '#10b981',
  emeraldLight: '#d1fae5',
  amber: '#f59e0b',
  amberLight: '#fef3c7',
  red: '#ef4444',
  redLight: '#fee2e2',
  slate: '#64748b',
  blue: '#3b82f6',
};

// ========== 周期选项 ==========
type PeriodMode = 'month' | 'quarter' | 'year';
const PERIOD_OPTIONS: { value: PeriodMode; label: string }[] = [
  { value: 'month', label: '本月' },
  { value: 'quarter', label: '本季度' },
  { value: 'year', label: '本年度' },
];

// ========== 信号灯组件 ==========
function TrafficLight({
  status,
  label,
}: {
  status: 'good' | 'warning' | 'bad';
  label: string;
}) {
  const lightConfig = {
    good: { color: COLORS.emerald, bg: COLORS.emeraldLight, text: '正常', textColor: 'text-emerald-700' },
    warning: { color: COLORS.amber, bg: COLORS.amberLight, text: '注意', textColor: 'text-amber-700' },
    bad: { color: COLORS.red, bg: COLORS.redLight, text: '超标', textColor: 'text-red-700' },
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-3">
        {(['good', 'warning', 'bad'] as const).map((s) => {
          const cfg = lightConfig[s];
          const isActive = s === status;
          return (
            <div
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                width: isActive ? 32 : 20,
                height: isActive ? 32 : 20,
                backgroundColor: isActive ? cfg.color : '#e5e7eb',
                boxShadow: isActive ? `0 0 12px ${cfg.color}80` : 'none',
              }}
            />
          );
        })}
      </div>
      <span className={`text-xs font-medium ${lightConfig[status].textColor}`}>
        {lightConfig[status].text}
      </span>
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}

// ========== 加载状态 ==========
function LoadingView() {
  return (
    <div className="flex items-center justify-center h-96 bg-[#F2F6FA]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-slate-500 animate-spin" />
        <span className="text-gray-500">加载指标数据中...</span>
      </div>
    </div>
  );
}

// ========== 空状态 ==========
function EmptyView({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-6 bg-[#F2F6FA] p-6">
      <PageHeader
        icon={<Gauge className="w-6 h-6 text-white" />}
        title="指标看板"
        description="种植关键指标仪表盘、阈值告警与实时监控"
      />
      <div className="bg-white rounded-xl p-12 text-center">
        <Gauge className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg mb-4">暂无指标数据</p>
        <Button onClick={onRetry} size="sm" className="bg-slate-600 hover:bg-slate-700">重新加载</Button>
      </div>
    </div>
  );
}

// ========== 页面主组件 ==========
export default function SummaryIndicators() {
  // Store 数据
  const { indicators, isLoading, error, fetchIndicators } = useSummaryDataStore();

  // 周期切换
  const [periodMode, setPeriodMode] = useState<PeriodMode>('year');

  // 挂载时获取数据，周期切换时重新获取
  useEffect(() => {
    fetchIndicators({ period: periodMode });
  }, [periodMode]);

  // 当前指标数据（取数组第一个元素）
  const indicator = indicators[0] || null;

  // ========== 派生数据 ==========

  /** 综合评分百分比（0-100） */
  const overallScore = indicator?.overallScore ?? 0;

  /** 产量达成率（假设目标值为一个合理的基准，这里用 100 作为满分，取 avgYieldPerHarvest 的相对值） */
  const yieldRate = useMemo(() => {
    if (!indicator) return 0;
    // 产量达成率：以 avgYieldPerHarvest 为基准，假设目标为该值 * 1.2 为满分
    const target = indicator.yield.avgYieldPerHarvest > 0 ? indicator.yield.avgYieldPerHarvest * 1.2 : 100;
    return Math.round((indicator.yield.avgYieldPerHarvest / target) * 100);
  }, [indicator]);

  /** 任务完成率 */
  const taskCompletionRate = indicator?.task.completionRate ?? 0;

  /** 问题解决率 */
  const problemResolutionRate = indicator?.problem.resolutionRate ?? 0;

  /** 人工效率（假设目标为100） */
  const laborEfficiency = indicator?.labor.efficiency ?? 0;

  /** 成本控制率（基于人工成本，假设预算为目标成本的1.1倍作为正常阈值） */
  const costControlRate = useMemo(() => {
    if (!indicator) return 100;
    const budget = indicator.labor.totalCost > 0 ? indicator.labor.totalCost * 1.1 : 100;
    return Math.round((1 - (indicator.labor.totalCost / budget)) * 100 + 100);
  }, [indicator]);

  /** 成本信号灯状态 */
  const costTrafficStatus: 'good' | 'warning' | 'bad' = useMemo(() => {
    if (costControlRate >= 90) return 'good';
    if (costControlRate >= 70) return 'warning';
    return 'bad';
  }, [costControlRate]);

  /** 环形进度图数据（任务完成率） */
  const progressRingData = useMemo(() => {
    const rate = taskCompletionRate;
    return [
      { name: '已完成', value: rate, color: COLORS.emerald },
      { name: '未完成', value: 100 - rate, color: '#e5e7eb' },
    ];
  }, [taskCompletionRate]);

  /** 雷达图数据 */
  const radarData = useMemo(() => {
    if (!indicator) return [];
    return [
      {
        subject: '产量',
        指标得分: yieldRate,
        fullMark: 100,
      },
      {
        subject: '任务',
        指标得分: taskCompletionRate,
        fullMark: 100,
      },
      {
        subject: '问题',
        指标得分: problemResolutionRate,
        fullMark: 100,
      },
      {
        subject: '人工',
        指标得分: laborEfficiency,
        fullMark: 100,
      },
    ];
  }, [indicator, yieldRate, taskCompletionRate, problemResolutionRate, laborEfficiency]);

  /** 指标明细表数据 */
  const detailTableData = useMemo(() => {
    if (!indicator) return [];
    return [
      {
        name: '产量指标',
        target: `${indicator.yield.harvestCount}次采收`,
        actual: `${(indicator.yield.totalYield ?? 0).toLocaleString()} kg`,
        rate: `${yieldRate}%`,
        score: yieldRate,
      },
      {
        name: '任务指标',
        target: `${indicator.task.total}项`,
        actual: `完成${indicator.task.completed}项`,
        rate: `${taskCompletionRate}%`,
        score: taskCompletionRate,
      },
      {
        name: '问题指标',
        target: `${indicator.problem.total}项`,
        actual: `解决${indicator.problem.resolved}项`,
        rate: `${problemResolutionRate}%`,
        score: problemResolutionRate,
      },
      {
        name: '人工指标',
        target: `${indicator.labor.workerCount}名工人`,
        actual: `${indicator.labor.totalHours.toLocaleString()}工时`,
        rate: `${laborEfficiency}%`,
        score: laborEfficiency,
      },
    ];
  }, [indicator, yieldRate, taskCompletionRate, problemResolutionRate, laborEfficiency]);

  /** 评分颜色 */
  function scoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  }

  /** 评分背景色 */
  function scoreBgColor(score: number): string {
    if (score >= 80) return 'bg-emerald-100';
    if (score >= 60) return 'bg-amber-100';
    return 'bg-red-100';
  }

  /** 仪表盘颜色 */
  function gaugeColor(score: number): 'emerald' | 'amber' | 'red' {
    if (score >= 80) return 'emerald';
    if (score >= 60) return 'amber';
    return 'red';
  }

  // ========== 加载/空状态 ==========
  if (isLoading && !indicator) {
    return <LoadingView />;
  }

  if (!isLoading && !indicator) {
    return <EmptyView onRetry={() => fetchIndicators()} />;
  }

  return (
    <div className="space-y-6 bg-[#F2F6FA]">
      {/* 页面标题 */}
      <PageHeader
        icon={<Gauge className="w-6 h-6 text-white" />}
        title="指标看板"
        description="种植关键指标仪表盘、阈值告警与实时监控"
      />

      {/* 周期切换 */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              onClick={() => setPeriodMode(opt.value)}
              size="sm"
              variant={periodMode === opt.value ? "secondary" : "ghost"}
              className={periodMode === opt.value ? "bg-slate-600 text-white hover:bg-slate-700 shadow-sm" : "text-gray-600"}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        {indicator?.period && (
          <div className="text-sm text-gray-500">
            统计周期：
            <span className="font-medium text-gray-700 ml-1">
              {indicator.period.start} ~ {indicator.period.end}
            </span>
          </div>
        )}
      </div>

      {/* 综合评分大卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          <span className="text-sm text-gray-500 uppercase tracking-wide">综合评分</span>
        </div>
        <div className={`text-6xl font-bold ${scoreColor(overallScore)}`}>
          {Math.round(overallScore)}
        </div>
        <div className="text-sm text-gray-400 mt-1">/ 100 分</div>
        {/* 环形进度条 */}
        <div className="relative w-40 h-40 mx-auto mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: '得分', value: overallScore, color: gaugeColor(overallScore) === 'emerald' ? COLORS.emerald : gaugeColor(overallScore) === 'amber' ? COLORS.amber : COLORS.red },
                  { name: '剩余', value: Math.max(100 - overallScore, 0), color: '#e5e7eb' },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={overallScore >= 80 ? COLORS.emerald : overallScore >= 60 ? COLORS.amber : COLORS.red} />
                <Cell fill="#e5e7eb" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* 中心文字 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-lg font-bold ${scoreColor(overallScore)}`}>
              {overallScore >= 80 ? '优秀' : overallScore >= 60 ? '良好' : '待改善'}
            </span>
          </div>
        </div>
      </div>

      {/* 仪表盘行：产量达成 + 任务完成 + 成本控制 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 产量达成率 - SVG 仪表盘 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            产量达成率
          </h3>
          <GaugeChart
            percentage={yieldRate}
            label="产量指标达成"
            colorScheme={gaugeColor(yieldRate)}
          />
        </div>

        {/* 任务完成率 - 环形进度图 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            任务完成率
          </h3>
          <div className="relative w-40 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={progressRingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                >
                  {progressRingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* 中心数字 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor(taskCompletionRate)}`}>
                {Math.round(taskCompletionRate)}%
              </span>
              <span className="text-xs text-gray-400 mt-1">完成率</span>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              已完成 <span className="font-medium text-gray-700">{indicator?.task.completed ?? 0}</span>
              {' / '}
              总计 <span className="font-medium text-gray-700">{indicator?.task.total ?? 0}</span> 项
            </p>
          </div>
        </div>

        {/* 成本控制率 - 红绿灯 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-500" />
            成本控制率
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <TrafficLight status={costTrafficStatus} label="成本控制" />
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              人工成本：<span className="font-medium text-gray-700">
                {(indicator?.labor.totalCost ?? 0).toLocaleString()} 元
              </span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              工人：{indicator?.labor.workerCount ?? 0}名 | 工时：{indicator?.labor.totalHours ?? 0}h
            </p>
          </div>
        </div>
      </div>

      {/* 雷达图 + 明细表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 综合指标雷达图 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-500" />
            综合指标雷达图
          </h3>
          {radarData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 13, fill: '#374151' }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${Math.round(value)}%`, '指标得分']}
                  />
                  <Radar
                    name="指标得分"
                    dataKey="指标得分"
                    stroke={COLORS.emerald}
                    fill={COLORS.emerald}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">暂无雷达图数据</div>
          )}
        </div>

        {/* 指标明细表 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-slate-500" />
            指标明细表
          </h3>
          {detailTableData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">指标名称</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">目标值</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">实际值</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold whitespace-nowrap">达成率</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold whitespace-nowrap">评分</th>
                  </tr>
                </thead>
                <tbody>
                  {detailTableData.map((row, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2 font-medium text-gray-800">{row.name}</td>
                      <td className="py-3 px-2 text-gray-600">{row.target}</td>
                      <td className="py-3 px-2 text-gray-600">{row.actual}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`font-medium ${scoreColor(Number(row.rate.replace('%', '')))}`}>
                          {row.rate}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex items-center justify-center w-10 h-8 rounded-md text-xs font-bold ${scoreBgColor(row.score)} ${scoreColor(row.score)}`}>
                          {row.score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">暂无明细数据</div>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          数据加载异常：{error}
        </div>
      )}
    </div>
  );
}
