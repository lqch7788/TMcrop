/**
 * 问题分派统计卡片组件
 */

import React from 'react';
import { AlertTriangle, Clock, Send, CheckCircle } from 'lucide-react';

interface ProblemStatsCardsProps {
  totalCount: number;
  pendingCount: number;
  dispatchedCount: number;
  handledCount: number;
}

export function ProblemStatsCards({
  totalCount,
  pendingCount,
  dispatchedCount,
  handledCount,
}: ProblemStatsCardsProps) {
  const cards = [
    {
      key: 'total',
      label: '问题总数',
      value: totalCount,
      icon: AlertTriangle,
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    {
      key: 'pending',
      label: '待分派',
      value: pendingCount,
      icon: Clock,
      bgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      key: 'dispatched',
      label: '已分派',
      value: dispatchedCount,
      icon: Send,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      key: 'handled',
      label: '已处理',
      value: handledCount,
      icon: CheckCircle,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.key} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${card.bgColor} rounded-lg flex items-center justify-center`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-sm text-gray-500">{card.label}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
