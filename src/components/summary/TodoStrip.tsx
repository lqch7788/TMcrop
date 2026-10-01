/**
 * 待办与风险塔 - 汇总看板 Hero 区专用（2026-10-01 升级）
 *
 * 展示需要管理者处理的积压项（待审批 / 逾期任务 / 待验收 / 未解决问题），
 * 点击直达对应模块。数值为 0 时灰显，避免"满屏红色"的狼来了效应。
 *
 * 升级要点（v2）：
 * - 保留 API 不变（其他汇总页面仍在 import）
 * - 视觉从「横向紧凑卡」改为「霓虹风险塔」：
 *   - 顶部色条（emerald/red/amber/blue/purple）作为分类标识
 *   - critical 值 > 0 时启用 pulse（不再仅作静态灰显）
 *   - 数字大字号 + tabular-nums + hover 时显示 corner-glow
 *   - 圆角 8px，统一高度 h-20
 */

import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/** 单个待办项配置 */
export interface TodoItem {
  key: string;
  icon: ReactNode;
  label: string;
  value: number;
  /** 点击跳转的路由（无 drilldownType 时使用） */
  path: string;
  /** 风险色调：数值 > 0 时生效 */
  tone: 'red' | 'amber' | 'blue' | 'purple';
  /** 有值时点击改为弹出明细弹窗（可查看是哪几条并直接处理） */
  drilldownType?: string;
}

export interface TodoStripProps {
  items: TodoItem[];
  /** 点击回调：带 drilldownType 的项由调用方决定弹窗还是跳转 */
  onNavigate: (item: TodoItem) => void;
}

/** 色调 → 顶部色条 + 数字色 */
const TONE_STYLE: Record<TodoItem['tone'], { bar: string; value: string; bg: string }> = {
  red: { bar: 'bg-red-500', value: 'text-red-600', bg: 'bg-red-50' },
  amber: { bar: 'bg-amber-500', value: 'text-amber-600', bg: 'bg-amber-50' },
  blue: { bar: 'bg-blue-500', value: 'text-blue-600', bg: 'bg-blue-50' },
  purple: { bar: 'bg-purple-500', value: 'text-purple-600', bg: 'bg-purple-50' },
};

export function TodoStrip({ items, onNavigate }: TodoStripProps) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const tone = TONE_STYLE[item.tone];
        const hasWork = item.value > 0;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item)}
            className={`w-full relative bg-white rounded-lg border border-slate-200/70 hover:shadow-md transition-all overflow-hidden text-left ${
              hasWork ? 'critical-pulse' : ''
            }`}
            style={{ minHeight: 64 }}
          >
            {/* 顶部色条 */}
            <div className={`h-[3px] w-full ${hasWork ? tone.bar : 'bg-slate-200'}`} />

            <div className="flex items-center gap-2.5 px-3 py-2.5">
              {/* 图标 */}
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  hasWork ? tone.bg : 'bg-slate-100'
                }`}
              >
                <span className={hasWork ? '' : 'opacity-40'}>{item.icon}</span>
              </div>

              {/* 数字 + 标签 */}
              <div className="flex-1 min-w-0">
                <div
                  className={`text-2xl font-bold leading-none tabular-nums ${
                    hasWork ? tone.value : 'text-slate-300'
                  }`}
                >
                  {item.value}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">{item.label}</div>
              </div>

              <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default TodoStrip;