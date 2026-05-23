import React from 'react'
import { cn } from '@/lib/utils'

// 预设状态类型
export type LaborStatusType =
  | 'pending'       // 待执行
  | 'in_progress'  // 进行中
  | 'completed'    // 已完成
  | 'cancelled'    // 已取消
  | 'paused'       // 已暂停
  | 'overdue'      // 已逾期
  | 'draft'        // 草稿
  | 'approved'     // 已批准
  | 'rejected'     // 已拒绝

// 状态配置
export interface StatusConfig {
  label: string
  color: string        // 背景色
  textColor: string    // 文字色
  dotColor?: string    // 点状色
}

// 状态映射表
export const STATUS_CONFIG: Record<LaborStatusType, StatusConfig> = {
  pending: {
    label: '待执行',
    color: 'bg-gray-100',
    textColor: 'text-gray-700',
    dotColor: 'bg-gray-500',
  },
  in_progress: {
    label: '进行中',
    color: 'bg-blue-100',
    textColor: 'text-blue-700',
    dotColor: 'bg-blue-500',
  },
  completed: {
    label: '已完成',
    color: 'bg-green-100',
    textColor: 'text-green-700',
    dotColor: 'bg-green-500',
  },
  cancelled: {
    label: '已取消',
    color: 'bg-red-100',
    textColor: 'text-red-700',
    dotColor: 'bg-red-500',
  },
  paused: {
    label: '已暂停',
    color: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    dotColor: 'bg-yellow-500',
  },
  overdue: {
    label: '已逾期',
    color: 'bg-orange-100',
    textColor: 'text-orange-700',
    dotColor: 'bg-orange-500',
  },
  draft: {
    label: '草稿',
    color: 'bg-gray-100',
    textColor: 'text-gray-500',
    dotColor: 'bg-gray-400',
  },
  approved: {
    label: '已批准',
    color: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
  },
  rejected: {
    label: '已拒绝',
    color: 'bg-red-100',
    textColor: 'text-red-700',
    dotColor: 'bg-red-500',
  },
}

export interface LaborStatusBadgeProps {
  status: LaborStatusType | string
  label?: string
  showDot?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LaborStatusBadge = React.memo<LaborStatusBadgeProps>(({
  status,
  label,
  showDot = true,
  size = 'md',
  className,
}: LaborStatusBadgeProps) => {
  // 获取配置
  const config = STATUS_CONFIG[status as LaborStatusType]
  const displayLabel = label || config?.label || status
  const isValidStatus = !!config

  // 大小配置
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1 text-sm',
  }

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }

  // 如果没有对应配置，使用默认样式
  if (!isValidStatus) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          'bg-gray-100 text-gray-700',
          sizeClasses[size],
          className
        )}
      >
        {showDot && (
          <span className={cn('mr-1.5 rounded-full bg-gray-500', dotSizeClasses[size])} />
        )}
        {displayLabel}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        config!.color,
        config!.textColor,
        sizeClasses[size],
        className
      )}
    >
      {showDot && (
        <span
          className={cn('mr-1.5 rounded-full', dotSizeClasses[size], config!.dotColor)}
        />
      )}
      {displayLabel}
    </span>
  );
});

// 带边框的状态徽章
export interface LaborStatusOutlineBadgeProps {
  status: LaborStatusType | string
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LaborStatusOutlineBadge = React.memo<LaborStatusOutlineBadgeProps>(({
  status,
  label,
  size = 'md',
  className,
}: LaborStatusOutlineBadgeProps) => {
  const config = STATUS_CONFIG[status as LaborStatusType]
  const displayLabel = label || config?.label || status

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1 text-sm',
  }

  const colorMap: Record<LaborStatusType, string> = {
    pending: 'border-gray-400 text-gray-600',
    in_progress: 'border-blue-300 text-blue-600',
    completed: 'border-green-300 text-green-600',
    cancelled: 'border-red-300 text-red-600',
    paused: 'border-yellow-300 text-yellow-600',
    overdue: 'border-orange-300 text-orange-600',
    draft: 'border-gray-400 text-gray-500',
    approved: 'border-emerald-300 text-emerald-600',
    rejected: 'border-red-300 text-red-600',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        sizeClasses[size],
        config ? colorMap[status as LaborStatusType] : 'border-gray-400 text-gray-600',
        className
      )}
    >
      {displayLabel}
    </span>
  );
});
