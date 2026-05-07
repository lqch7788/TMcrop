/**
 * Statistic 统计数值卡片
 * 展示统计数据，带数值动画
 */
import * as React from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StatisticProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  value: number | string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  precision?: number
  trend?: number
  trendDirection?: 'up' | 'down'
  formatter?: (value: number) => string
}

const Statistic = React.forwardRef<HTMLDivElement, StatisticProps>(
  ({
    title,
    value,
    prefix,
    suffix,
    precision = 2,
    trend,
    trendDirection,
    formatter,
    className,
    ...props
  }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(0)
    const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0

    // 数字动画
    React.useEffect(() => {
      if (typeof value !== 'number') {
        setDisplayValue(numericValue)
        return
      }

      const duration = 1000
      const steps = 30
      const increment = value / steps
      let current = 0
      let step = 0

      const timer = setInterval(() => {
        step++
        current += increment
        if (step >= steps) {
          setDisplayValue(value)
          clearInterval(timer)
        } else {
          setDisplayValue(current)
        }
      }, duration / steps)

      return () => clearInterval(timer)
    }, [value])

    const formatValue = (val: number) => {
      if (formatter) {
        return formatter(val)
      }

      // 默认格式化：保留小数位，千分位分隔
      return new Intl.NumberFormat('zh-CN', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      }).format(val)
    }

    const trendUp = trendDirection === 'up' || (trendDirection === undefined && trend && trend > 0)
    const trendDown = trendDirection === 'down' || (trendDirection === undefined && trend && trend < 0)

    return (
      <div
        ref={ref}
        className={cn("space-y-2", className)}
        {...props}
      >
        {title && (
          <p className="text-sm text-gray-500">{title}</p>
        )}

        <div className="flex items-baseline gap-2">
          {prefix && (
            <span className="text-lg text-gray-600">{prefix}</span>
          )}

          <span className="text-3xl font-bold text-gray-900">
            {typeof value === 'number' ? formatValue(displayValue) : value}
          </span>

          {suffix && (
            <span className="text-lg text-gray-600">{suffix}</span>
          )}
        </div>

        {/* 趋势指示 */}
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-sm",
            trendUp && "text-emerald-600",
            trendDown && "text-red-600",
            !trendUp && !trendDown && "text-gray-500"
          )}>
            {trendUp && <TrendingUp className="w-4 h-4" />}
            {trendDown && <TrendingDown className="w-4 h-4" />}
            <span>{trend > 0 ? '+' : ''}{trend}%</span>
            <span className="text-gray-400">较上月</span>
          </div>
        )}
      </div>
    )
  }
)
Statistic.displayName = "Statistic"

export { Statistic }
