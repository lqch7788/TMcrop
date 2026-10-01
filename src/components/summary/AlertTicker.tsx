/**
 * 预警 live ticker（2026-10-01 新增）
 *
 * 用途：汇总看板「关注清单」区的预警展示
 * 设计：横向紧凑列表 + critical 项红色 pulse + 左侧色条
 * 区别于 AlertCard：ticker 紧凑、单行、可点击跳转
 */

import { AlertTriangle, AlertOctagon, ChevronRight, Inbox } from 'lucide-react';

export interface AlertTickerItem {
  key: string;
  /** 严重级别 */
  severity: 'warning' | 'critical';
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 点击跳转的路由 */
  path?: string;
  onClick?: () => void;
}

export interface AlertTickerProps {
  items: AlertTickerItem[];
  /** 最大显示条数，默认 5 */
  maxItems?: number;
  /** 空态文案 */
  emptyText?: string;
  /** 点击回调 */
  onItemClick?: (item: AlertTickerItem) => void;
}

const SEVERITY_STYLE: Record<AlertTickerItem['severity'], {
  bar: string;
  icon: React.ReactNode;
  text: string;
  bg: string;
  pulse: boolean;
}> = {
  warning: {
    bar: 'bg-amber-400',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    pulse: false,
  },
  critical: {
    bar: 'bg-red-500',
    icon: <AlertOctagon className="w-3.5 h-3.5 text-red-600" />,
    text: 'text-red-700',
    bg: 'bg-red-50',
    pulse: true,
  },
};

export function AlertTicker({ items, maxItems = 5, emptyText = '暂无预警，各模块运行正常', onItemClick }: AlertTickerProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Inbox className="w-10 h-10 mb-2 opacity-30" />
        <span className="text-sm">{emptyText}</span>
      </div>
    );
  }

  const visible = items.slice(0, maxItems);

  return (
    <div className="space-y-2">
      {visible.map((item) => {
        const style = SEVERITY_STYLE[item.severity];
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              if (onItemClick) onItemClick(item);
              else if (item.onClick) item.onClick();
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-2 ${style.bg} rounded-lg border-l-4 ${style.bar.replace('bg-', 'border-l-')} hover:shadow-sm transition-shadow text-left ${style.pulse ? 'critical-pulse' : ''}`}
          >
            {style.icon}
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-semibold ${style.text} truncate`}>{item.title}</div>
              <div className="text-[11px] text-gray-500 truncate mt-0.5">{item.description}</div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          </button>
        );
      })}
      {items.length > maxItems && (
        <div className="text-[11px] text-gray-400 text-center pt-1">
          共 {items.length} 条预警，仅显示前 {maxItems} 条
        </div>
      )}
    </div>
  );
}

export default AlertTicker;