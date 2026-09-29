/**
 * 模块体检网格 - 六大模块运行状态一览
 *
 * 每张卡片展示一个模块的若干关键存量数字（点进去之前就能看出哪里不对劲），
 * 整卡可点击跳转到对应模块首页。数据来自 GET /api/summary/module-health。
 */

import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/** 模块卡片里的单个指标 */
export interface ModuleMetric {
  label: string;
  value: string | number;
  /** 是否需要强调（例如待处理量 > 0） */
  highlight?: boolean;
}

/** 单个模块卡片配置 */
export interface ModuleCard {
  key: string;
  title: string;
  icon: ReactNode;
  /** 图标底色（Tailwind 渐变类） */
  iconBg: string;
  /** 磁盘所在模块的跳转路由 */
  path: string;
  metrics: ModuleMetric[];
}

export interface ModuleHealthGridProps {
  cards: ModuleCard[];
  onNavigate: (path: string) => void;
}

export function ModuleHealthGrid({ cards, onNavigate }: ModuleHealthGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          onClick={() => onNavigate(card.path)}
          className="bg-white rounded-xl border border-gray-100 p-5 text-left hover:shadow-md transition-shadow"
        >
          {/* 卡片头：图标 + 模块名 + 箭头 */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${card.iconBg}`}>
              {card.icon}
            </div>
            <h3 className="text-sm font-semibold text-gray-800 flex-1">{card.title}</h3>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>

          {/* 指标两列网格 */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {card.metrics.map((m) => (
              <div key={m.label} className="min-w-0">
                <div
                  className={`text-lg font-bold leading-tight truncate ${
                    m.highlight ? 'text-amber-600' : 'text-gray-900'
                  }`}
                  title={String(m.value)}
                >
                  {m.value}
                </div>
                <div className="text-xs text-gray-500 truncate">{m.label}</div>
              </div>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}

export default ModuleHealthGrid;
