/**
 * 智能派工监控仪表板组件
 * 显示关键指标的实时监控数据
 */

import React from 'react';
import {
  CalendarDays,
  Brain,
  AlertTriangle,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
} from 'lucide-react';

/** 趋势方向类型 */
type TrendDirection = 'up' | 'down' | 'stable';

/** 指标数据类型 */
interface MetricData {
  label: string;           // 指标名称
  value: number | string;  // 当前值
  unit?: string;           // 单位
  target?: number;         // 目标值
  trend: TrendDirection;   // 趋势方向
  trendValue?: string;     // 趋势变化值
  icon: React.ReactNode;   // 图标
  color: string;            // 主色调
  bgColor: string;          // 背景色
}

/** 指标卡片组件 */
interface MetricCardProps {
  metric: MetricData;
}

function MetricCard({ metric }: MetricCardProps) {
  // 趋势图标和颜色
  const getTrendIcon = () => {
    switch (metric.trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  // 获取趋势文字颜色
  const getTrendTextColor = () => {
    switch (metric.trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  // 计算完成进度百分比
  const getProgressPercent = () => {
    if (metric.target && typeof metric.value === 'number') {
      return Math.min((metric.value / metric.target) * 100, 100);
    }
    return null;
  };

  const progress = getProgressPercent();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* 头部：图标和趋势 */}
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${metric.bgColor} flex items-center justify-center`}>
          {metric.icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${getTrendTextColor()}`}>
          {getTrendIcon()}
          {metric.trendValue && <span>{metric.trendValue}</span>}
        </div>
      </div>

      {/* 指标名称 */}
      <div className="text-xs text-gray-500 mb-1">{metric.label}</div>

      {/* 当前值 */}
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-2xl font-bold ${metric.color}`}>
          {metric.value}
        </span>
        {metric.unit && (
          <span className="text-sm text-gray-400">{metric.unit}</span>
        )}
      </div>

      {/* 目标值进度条 */}
      {progress !== null && metric.target && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              目标: {metric.target}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${metric.color.replace('text-', 'bg-')}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** 仪表板组件 */
export function DispatchMetricsDashboard() {
  // 模拟监控数据
  const metrics: MetricData[] = [
    {
      label: '今日预测任务数',
      value: 12,
      unit: '个',
      target: 15,
      trend: 'up',
      trendValue: '+3',
      icon: <CalendarDays className="w-5 h-5 text-purple-500" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'AI推荐接受率',
      value: 75,
      unit: '%',
      target: 80,
      trend: 'up',
      trendValue: '+5%',
      icon: <Brain className="w-5 h-5 text-emerald-500" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: '超期任务数',
      value: 3,
      unit: '个',
      target: 0,
      trend: 'down',
      trendValue: '-2',
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: '人员负荷均衡度',
      value: 82,
      unit: '%',
      target: 85,
      trend: 'stable',
      trendValue: '0%',
      icon: <Users className="w-5 h-5 text-blue-500" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: '平均决策时间',
      value: 45,
      unit: '秒',
      target: 30,
      trend: 'down',
      trendValue: '-8秒',
      icon: <Clock className="w-5 h-5 text-amber-500" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  return (
    <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-4 border border-gray-200">
      {/* 标题区域 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">派工监控指标</h3>
          <p className="text-xs text-gray-500">实时数据 · 每5秒更新</p>
        </div>
      </div>

      {/* 指标卡片网格 */}
      <div className="grid grid-cols-5 gap-3">
        {metrics.map((metric, index) => (
          <MetricCard key={index} metric={metric} />
        ))}
      </div>

      {/* 底部说明 */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            上升
          </span>
          <span className="flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-red-500" />
            下降
          </span>
          <span className="flex items-center gap-1">
            <Minus className="w-3 h-3 text-gray-400" />
            稳定
          </span>
        </div>
        <span>数据更新于 2026-04-22 14:30</span>
      </div>
    </div>
  );
}

export default DispatchMetricsDashboard;
