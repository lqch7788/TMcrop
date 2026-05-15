/**
 * 统计卡片组件 - 用于展示汇总数据指标
 * 已重构：移除 emoji 图标，改用 lucide-react + Dashboard StatCard 设计风格
 */

import { StatCardConfig } from './types';
import { useNavigate } from 'react-router-dom';

interface StatCardsProps {
  cards: StatCardConfig[];
}

export function StatCards({ cards }: StatCardsProps) {
  const navigate = useNavigate();

  // 根据卡片数量自动调整列数
  const colClasses = cards.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5';

  return (
    <div className={`grid ${colClasses} gap-4`}>
      {cards.map((card, index) => (
        <div
          key={index}
          className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow ${card.onClick || card.navigateTo ? 'cursor-pointer' : ''}`}
          onClick={() => {
            if (card.onClick) card.onClick();
            if (card.navigateTo) navigate(card.navigateTo);
          }}
        >
          <div className="flex items-center justify-between">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.iconBgColor || 'from-emerald-500 to-emerald-600'} flex items-center justify-center shadow-sm`}>
              {card.icon}
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
