/**
 * 模块体检网格 - 六大模块运行状态一览（2026-10-01 升级）
 *
 * 每张卡片展示一个模块的若干关键存量数字（点进去之前就能看出哪里不对劲），
 * 整卡可点击跳转到对应模块首页。数据来自 GET /api/summary/module-health。
 *
 * 升级要点（v2）：
 * - 保留 API 不变（其他汇总页面仍在 import）
 * - 视觉升级：
 *   - 统一卡片高度 h-[180px]
 *   - 卡片左上角加健康灯（绿/黄/红/灰）—— 通过 healthStatus 字段传入
 *   - 数字字号统一 text-lg，不让某些超长文本"撑破"卡片
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
  /** 健康灯状态（2026-10-01 新增） */
  healthStatus?: 'green' | 'yellow' | 'red' | 'gray';
  metrics: ModuleMetric[];
}

export interface ModuleHealthGridProps {
  cards: ModuleCard[];
  onNavigate: (path: string) => void;
}

/** 健康灯 class */
const HEALTH_DOT: Record<NonNullable<ModuleCard['healthStatus']>, string> = {
  green: 'health-dot health-dot-green health-dot-green-pulse',
  yellow: 'health-dot health-dot-yellow',
  red: 'health-dot health-dot-red health-dot-red-pulse',
  gray: 'health-dot health-dot-gray',
};

export function ModuleHealthGrid({ cards, onNavigate }: ModuleHealthGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          onClick={() => onNavigate(card.path)}
          className="bg-white rounded-xl border border-slate-200/70 hover:border-emerald-300 hover:shadow-md transition-all p-4 text-left flex flex-col"
          style={{ minHeight: 180 }}
        >
          {/* 卡片头：健康灯 + 图标 + 模块名 + 箭头 */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className={HEALTH_DOT[card.healthStatus || 'gray']}
              title={
                card.healthStatus === 'green'
                  ? '运行正常'
                  : card.healthStatus === 'yellow'
                  ? '需要关注'
                  : card.healthStatus === 'red'
                  ? '存在异常'
                  : '无数据'
              }
            />
            <div className={`w-7 h-7 rounded-md ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
              {card.icon}
            </div>
            <h3 className="text-sm font-semibold text-slate-800 flex-1 truncate">{card.title}</h3>
            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
          </div>

          {/* 指标两列网格（统一高度） */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 flex-1">
            {card.metrics.map((m) => (
              <div key={m.label} className="min-w-0">
                <div
                  className={`text-base font-bold leading-tight truncate tabular-nums ${
                    m.highlight ? 'text-amber-600' : 'text-slate-900'
                  }`}
                  title={String(m.value)}
                >
                  {m.value}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}

export default ModuleHealthGrid;