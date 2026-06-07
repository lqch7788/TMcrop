import React from 'react'
import { FileX, Search, Inbox, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

export type EmptyStateType = 'no_data' | 'no_result' | 'error' | 'custom'

export interface EmptyStateConfig {
  type?: EmptyStateType
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

// 预设图标
const EmptyStateIcons: Record<EmptyStateType, React.ReactNode> = {
  no_data: <FileX className="h-16 w-16 text-gray-300" />,
  no_result: <Search className="h-16 w-16 text-gray-300" />,
  error: <AlertCircle className="h-16 w-16 text-gray-300" />,
  custom: <Inbox className="h-16 w-16 text-gray-300" />,
}

// 预设文案
const EmptyStateDefaults: Record<EmptyStateType, { title: string; description: string }> = {
  no_data: {
    title: '暂无数据',
    description: '当前还没有任何记录，请稍后再试',
  },
  no_result: {
    title: '未找到结果',
    description: '没有找到匹配的内容，请尝试其他筛选条件',
  },
  error: {
    title: '加载失败',
    description: '数据加载出现问题，请检查网络后重试',
  },
  custom: {
    title: '暂无数据',
    description: '',
  },
}

export function LaborEmptyState({
  type = 'no_data',
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateConfig) {
  const defaults = EmptyStateDefaults[type]
  const displayIcon = icon || EmptyStateIcons[type]
  const displayTitle = title || defaults.title
  const displayDescription = description || defaults.description

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4',
        className
      )}
    >
      {/* 图标 */}
      <div className="mb-4">{displayIcon}</div>

      {/* 标题 */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {displayTitle}
      </h3>

      {/* 描述 */}
      {displayDescription && (
        <p className="text-sm text-gray-500 text-center max-w-sm mb-6">
          {displayDescription}
        </p>
      )}

      {/* 操作按钮 */}
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  )
}

// 表格专用空状态
export interface LaborTableEmptyProps {
  columns?: number
  message?: string
  onAction?: () => void
  actionLabel?: string
}

export function LaborTableEmpty({
  columns = 1,
  message = '暂无数据',
  onAction,
  actionLabel,
}: LaborTableEmptyProps) {
  return (
    <tr>
      <td colSpan={columns} className="h-32">
        <div className="flex flex-col items-center justify-center">
          <FileX className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 mb-3">{message}</p>
          {onAction && actionLabel && (
            <Button onClick={onAction} variant="outline" size="sm">
              {actionLabel}
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

// 简洁版空状态
export function LaborSimpleEmpty({
  message = '暂无数据',
  className,
}: {
  message?: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-center py-8 text-gray-400 text-sm', className)}>
      {message}
    </div>
  )
}
