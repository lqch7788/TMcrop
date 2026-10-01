/**
 * 模块体检网格 - 六大模块运行状态一览（2026-10-01 第三轮升级）
 *
 * 每张卡片展示一个模块的若干关键存量数字（点进去之前就能看出哪里不对劲），
 * 整卡可点击跳转到对应模块首页。数据来自 GET /api/summary/module-health。
 *
 * 升级要点（v3）：
 * - 健康灯外层包 Tooltip（替代浏览器原生 title），P1-8
 * - 新增可选 healthTooltip 字段（自定义规则文案）
 */

import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Tooltip } from '@/components/ui';

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
  /** 健康灯状态 */
  healthStatus?: 'green' | 'yellow' | 'red' | 'gray';
  /** 自定义健康灯 tooltip 文案（不传则用默认） */
  healthTooltip?: string;
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

/** 健康灯默认 tooltip 文案 */
const HEALTH_DEFAULT_LABEL: Record<NonNullable<ModuleCard['healthStatus']>, string> = {
  green: '运行正常',
  yellow: '需要关注',
  red: '存在异常',
  gray: '无数据',
};

export function ModuleHealthGrid({ cards, onNavigate }: ModuleHealthGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {cards.map((card) => {
        const status = card.healthStatus || 'gray';
        const tipText = card.healthTooltip ?? HEALTH_DEFAULT_LABEL[status];
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onNavigate(card.path)}
            className="bg-white rounded-xl border border-slate-200/70 hover:border-emerald-300 hover:shadow-md transition-all p-4 text-left flex flex-col"
            style={{ minHeight: 180 }}
          >
            {/* 卡片头：健康灯（带 Tooltip）+ 图标 + 模块名 + 箭头 */}
            <div className="flex items-center gap-2 mb-3">
              <Tooltip content={tipText} position="top" delay={150}>
                <span
                  className={HEALTH_DOT[status]}
                  role="status"
                  aria-label={tipText}
                />
              </Tooltip>
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
        );
      })}
    </div>
  );
}

export default ModuleHealthGrid;