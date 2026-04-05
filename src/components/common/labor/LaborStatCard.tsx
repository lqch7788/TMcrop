import React from 'react'
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface LaborStatCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  trend?: {
    value: number
    direction?: 'up' | 'down' | 'neutral'
  }
  suffix?: string
  prefix?: string
  description?: string
  className?: string
}

export function LaborStatCard({
  title,
  value,
  icon: Icon,
  trend,
  suffix,
  prefix,
  description,
  className,
}: LaborStatCardProps) {
  // 计算趋势方向
  const getTrendDirection = () => {
    if (!trend) return 'neutral'
    if (trend.direction) return trend.direction
    if (trend.value > 0) return 'up'
    if (trend.value < 0) return 'down'
    return 'neutral'
  }

  const trendDirection = getTrendDirection()

  // 趋势图标
  const TrendIcon = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  }[trendDirection]

  // 趋势颜色
  const trendColor = {
    up: 'text-red-500',
    down: 'text-green-500',
    neutral: 'text-gray-400',
  }[trendDirection]

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* 标题 */}
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>

            {/* 数值 */}
            <div className="flex items-baseline gap-1">
              {prefix && (
                <span className="text-lg font-semibold text-gray-900">{prefix}</span>
              )}
              <span className="text-3xl font-bold text-gray-900">{value}</span>
              {suffix && (
                <span className="text-lg font-semibold text-gray-500">{suffix}</span>
              )}
            </div>

            {/* 趋势 */}
            {trend && (
              <div className={cn('flex items-center gap-1 mt-2', trendColor)}>
                <TrendIcon className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {trend.value > 0 ? '+' : ''}
                  {trend.value}%
                </span>
                <span className="text-sm text-gray-400 ml-1">较上期</span>
              </div>
            )}

            {/* 描述 */}
            {description && (
              <p className="text-sm text-gray-500 mt-2">{description}</p>
            )}
          </div>

          {/* 图标 */}
          {Icon && (
            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Icon className="h-6 w-6 text-emerald-600" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// 简洁版统计卡片
export interface LaborStatSimpleCardProps {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  className?: string
}

export function LaborStatSimpleCard({
  label,
  value,
  change,
  changeLabel = '较上期',
  className,
}: LaborStatSimpleCardProps) {
  const isPositive = change && change > 0
  const isNegative = change && change < 0

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-4', className)}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {change !== undefined && (
        <div className={cn('flex items-center gap-1 mt-2 text-sm',
          isPositive && 'text-red-500',
          isNegative && 'text-green-500',
          !isPositive && !isNegative && 'text-gray-400'
        )}>
          {isPositive && <TrendingUp className="h-3 w-3" />}
          {isNegative && <TrendingDown className="h-3 w-3" />}
          {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
          <span>
            {change > 0 ? '+' : ''}{change}%
          </span>
          <span className="text-gray-400">{changeLabel}</span>
        </div>
      )}
    </div>
  )
}
