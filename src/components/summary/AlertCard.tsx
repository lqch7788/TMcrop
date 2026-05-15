/**
 * 预警/报警卡片组件
 * 用于汇总表各页面展示 KPI 异常预警
 */

import { AlertTriangle, AlertOctagon } from 'lucide-react';

export interface AlertCardProps {
  /** 预警标题 */
  title: string;
  /** 预警描述 */
  description: string;
  /** 严重程度 */
  severity: 'warning' | 'critical';
  /** 点击查看详情 */
  onClick?: () => void;
}

/** 严重程度对应的样式配置 */
const SEVERITY_STYLES = {
  warning: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-800',
    descColor: 'text-amber-600',
  },
  critical: {
    border: 'border-l-red-500',
    bg: 'bg-red-50',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    textColor: 'text-red-800',
    descColor: 'text-red-600',
  },
} as const;

export function AlertCard({ title, description, severity, onClick }: AlertCardProps) {
  const styles = SEVERITY_STYLES[severity];
  const isCritical = severity === 'critical';

  return (
    <div
      className={`border-l-4 ${styles.border} ${styles.bg} rounded-r-lg p-4 ${onClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className={`w-8 h-8 rounded-lg ${styles.iconBg} flex items-center justify-center flex-shrink-0 ${isCritical ? 'animate-pulse' : ''}`}>
          {isCritical ? (
            <AlertOctagon className={`w-5 h-5 ${styles.iconColor}`} />
          ) : (
            <AlertTriangle className={`w-5 h-5 ${styles.iconColor}`} />
          )}
        </div>
        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${styles.textColor}`}>{title}</p>
          <p className={`text-xs mt-0.5 ${styles.descColor}`}>{description}</p>
        </div>
      </div>
    </div>
  );
}
