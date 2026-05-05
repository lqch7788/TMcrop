/**
 * 实时监控看板组件
 * 显示今日任务、进行中、已完成、待验收、异常数量
 */

import React from 'react';
import { CalendarIcon, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface StatsData {
  total: number;
  inProgress: number;
  completed: number;
  waitingAcceptance: number;
  warning: number;
}

interface StatsCardsProps {
  stats: StatsData;
}

export const StatsCards = React.memo<StatsCardsProps>(({ stats }: StatsCardsProps) => {
  const cards = [
    {
      key: 'total',
      label: '今日任务',
      value: stats.total,
      icon: CalendarIcon,
      iconColor: 'text-blue-500',
    },
    {
      key: 'inProgress',
      label: '进行中',
      value: stats.inProgress,
      icon: Clock,
      iconColor: 'text-blue-500',
      valueColor: 'text-blue-600',
    },
    {
      key: 'completed',
      label: '已完成',
      value: stats.completed,
      icon: CheckCircle,
      iconColor: 'text-green-500',
      valueColor: 'text-green-600',
    },
    {
      key: 'waitingAcceptance',
      label: '待验收',
      value: stats.waitingAcceptance,
      icon: AlertTriangle,
      iconColor: 'text-orange-500',
      valueColor: 'text-orange-600',
    },
    {
      key: 'warning',
      label: '异常',
      value: stats.warning,
      icon: XCircle,
      iconColor: 'text-red-500',
      valueColor: 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {cards.map(card => (
        <div key={card.key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className={`text-2xl font-bold ${card.valueColor || 'text-gray-900'}`}>
                {card.value}
              </p>
            </div>
            <card.icon className={`w-8 h-8 ${card.iconColor}`} />
          </div>
        </div>
      ))}
    </div>
  );
});
