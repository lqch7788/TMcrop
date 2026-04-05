/**
 * 人效分析仪表盘 - 核心指标卡片
 */

import React from 'react';
import { TrendingUp, TrendingDown, Users, Zap, CheckCircle, Calendar, DollarSign, Award } from 'lucide-react';

interface EfficiencyDashboardProps {
  metrics: {
    avgOutputPerWorker: number;
    avgEfficiency: number;
    avgTaskCompletionRate: number;
    avgAttendanceRate: number;
    avgLaborCostRate: number;
    avgSkillCoverage: number;
  };
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  bgColor: string;
  iconBg: string;
}

function MetricCard({ icon, label, value, unit, trend, trendValue, bgColor, iconBg }: MetricCardProps) {
  return (
    <div className={`${bgColor} rounded-xl p-4 shadow-sm`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 truncate">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">{value}</span>
            <span className="text-sm text-gray-400">{unit}</span>
          </div>
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${
            trend === 'up' ? 'text-emerald-600' : 'text-red-500'
          }`}>
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  );
}

export const EfficiencyDashboard: React.FC<EfficiencyDashboardProps> = ({ metrics }) => {
  const cards = [
    {
      icon: <Users className="w-5 h-5 text-blue-600" />,
      label: '人均产出',
      value: metrics.avgOutputPerWorker.toFixed(1),
      unit: '单位/人',
      trend: 'up' as const,
      trendValue: '+5.2%',
      bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
      iconBg: 'bg-blue-500',
    },
    {
      icon: <Zap className="w-5 h-5 text-amber-600" />,
      label: '工时效率',
      value: (metrics.avgEfficiency * 100).toFixed(1),
      unit: '%',
      trend: 'up' as const,
      trendValue: '+2.1%',
      bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
      iconBg: 'bg-amber-500',
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
      label: '任务达成率',
      value: (metrics.avgTaskCompletionRate * 100).toFixed(1),
      unit: '%',
      trend: 'up' as const,
      trendValue: '+3.5%',
      bgColor: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
      iconBg: 'bg-emerald-500',
    },
    {
      icon: <Calendar className="w-5 h-5 text-purple-600" />,
      label: '出勤率',
      value: (metrics.avgAttendanceRate * 100).toFixed(1),
      unit: '%',
      trend: 'up' as const,
      trendValue: '+1.8%',
      bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
      iconBg: 'bg-purple-500',
    },
    {
      icon: <DollarSign className="w-5 h-5 text-rose-600" />,
      label: '人工成本率',
      value: (metrics.avgLaborCostRate * 100).toFixed(1),
      unit: '%',
      trend: 'down' as const,
      trendValue: '-2.3%',
      bgColor: 'bg-gradient-to-br from-rose-50 to-rose-100/50',
      iconBg: 'bg-rose-500',
    },
    {
      icon: <Award className="w-5 h-5 text-cyan-600" />,
      label: '技能覆盖率',
      value: (metrics.avgSkillCoverage * 100).toFixed(1),
      unit: '%',
      trend: 'up' as const,
      trendValue: '+4.0%',
      bgColor: 'bg-gradient-to-br from-cyan-50 to-cyan-100/50',
      iconBg: 'bg-cyan-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((card, index) => (
        <MetricCard key={index} {...card} />
      ))}
    </div>
  );
};

export default EfficiencyDashboard;
