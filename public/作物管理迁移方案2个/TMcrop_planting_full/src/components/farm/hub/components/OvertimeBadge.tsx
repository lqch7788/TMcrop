/**
 * 超时预警徽章组件
 * 功能：显示任务超时状态标记
 */

import { AlertTriangle, Clock } from 'lucide-react';
import { TaskTimeout } from '../../../../types/task';

interface OvertimeBadgeProps {
  timeout: TaskTimeout | undefined;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function OvertimeBadge({ timeout, size = 'sm', showLabel = true }: OvertimeBadgeProps) {
  if (!timeout) return null;

  const isWarning = timeout.severity === 'warning';
  const isCritical = timeout.severity === 'critical';

  const getTypeLabel = () => {
    switch (timeout.type) {
      case 'accept':
        return '接受超时';
      case 'execution':
        return '执行超时';
      case 'acceptance':
        return '验收超时';
      default:
        return '超时';
    }
  };

  const getStyle = () => {
    if (isCritical) {
      return {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-200',
        iconBg: 'bg-red-500',
      };
    }
    if (isWarning) {
      return {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-200',
        iconBg: 'bg-amber-500',
      };
    }
    return {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-200',
      iconBg: 'bg-gray-500',
    };
  };

  const style = getStyle();
  const Icon = isCritical ? AlertTriangle : Clock;
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${style.bg} ${style.text} ${style.border} ${sizeClass}`}
      title={`${getTypeLabel()} - ${isCritical ? '危急' : '预警'}`}
    >
      <Icon className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
      {showLabel && <span>{getTypeLabel()}</span>}
    </span>
  );
}

/**
 * 超时时长显示组件
 */
interface OvertimeDurationProps {
  startedAt: string;
  size?: 'sm' | 'md';
}

export function OvertimeDuration({ startedAt, size = 'sm' }: OvertimeDurationProps) {
  const started = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - started.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  const getDurationText = () => {
    if (diffDays > 0) {
      return `已超时${diffDays}天${diffHours % 24 > 0 ? `${diffHours % 24}小时` : ''}`;
    }
    return `已超时${diffHours}小时`;
  };

  const sizeClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`text-red-600 font-medium ${sizeClass}`}>
      {getDurationText()}
    </span>
  );
}
