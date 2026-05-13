import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableStatCardProps {
  /** 卡片标题 */
  title: string;
  /** 图标组件 */
  icon: LucideIcon;
  /** 图标背景色类名 */
  iconBgColor: string;
  /** 统计项列表 */
  stats: { label: string; value: string | number }[];
  /** 是否展开 */
  isExpanded: boolean;
  /** 切换展开状态 */
  onToggle: () => void;
  /** 展开后的内容 */
  children?: React.ReactNode;
}

/**
 * 可展开的统计卡片组件
 * 用于展示生产链条各环节的统计数据
 */
export function ExpandableStatCard({
  title,
  icon: Icon,
  iconBgColor,
  stats,
  isExpanded,
  onToggle,
  children,
}: ExpandableStatCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm border border-gray-100 transition-all duration-200',
        isExpanded && 'ring-2 ring-blue-500'
      )}
    >
      {/* 卡片头部 - 可点击展开/收起 */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors rounded-xl"
      >
        {/* 图标区域 */}
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBgColor)}>
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* 标题 */}
        <div className="flex-1 text-left">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        {/* 统计数值区域 */}
        <div className="flex items-center gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="text-right">
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* 展开/收起指示器 */}
        <div className="flex items-center justify-center w-8 h-8">
          <svg
            className={cn(
              'w-5 h-5 text-gray-400 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* 展开后的内容区域 */}
      {isExpanded && children && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}
