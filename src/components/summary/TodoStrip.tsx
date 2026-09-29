/**
 * 待办与风险条 - 汇总看板首屏
 *
 * 展示需要管理者处理的积压项（待审批 / 逾期任务 / 待验收 / 未解决问题），
 * 点击直达对应模块。数值为 0 时灰显，避免"满屏红色"的狼来了效应。
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

/** 色调 → Tailwind 类名映射 */
const TONE_STYLE: Record<TodoItem['tone'], { iconBg: string; value: string }> = {
  red: { iconBg: 'bg-gradient-to-br from-red-500 to-red-600', value: 'text-red-600' },
  amber: { iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600', value: 'text-amber-600' },
  blue: { iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600', value: 'text-blue-600' },
  purple: { iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600', value: 'text-purple-600' },
};

export function TodoStrip({ items, onNavigate }: TodoStripProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => {
        const tone = TONE_STYLE[item.tone];
        const hasWork = item.value > 0;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item)}
            className="bg-white rounded-xl border border-gray-100 p-4 text-left hover:shadow-md transition-shadow flex items-center gap-3"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                hasWork ? tone.iconBg : 'bg-gray-200'
              }`}
            >
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-2xl font-bold leading-tight ${hasWork ? tone.value : 'text-gray-300'}`}>
                {item.value}
              </div>
              <div className="text-xs text-gray-500 truncate">{item.label}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

export default TodoStrip;
