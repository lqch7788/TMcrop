/**
 * Progress 进度条/圈
 * 展示进度百分比
 */
import * as React from "react"
import { cn } from "@/lib/utils"

export type ProgressType = 'line' | 'circle' | 'dashboard'
export type ProgressSize = 'sm' | 'md' | 'lg'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  showLabel?: boolean
  showInfo?: boolean
  type?: ProgressType
  size?: ProgressSize
  strokeColor?: string
  trailColor?: string
  strokeWidth?: number
  percent?: number          // Antd 风格别名（兼容旧用法）
  format?: (percent: number) => React.ReactNode  // Antd 风格（兼容旧用法）
}

const sizeMap: Record<ProgressSize, { lineHeight: number; circleSize: number; strokeWidth: number }> = {
  sm: { lineHeight: 4, circleSize: 48, strokeWidth: 4 },
  md: { lineHeight: 8, circleSize: 80, strokeWidth: 6 },
  lg: { lineHeight: 12, circleSize: 120, strokeWidth: 8 }
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({
    value,
    max = 100,
    showLabel = false,
    type = 'line',
    size = 'md',
    strokeColor,
    trailColor = 'bg-gray-200',
    strokeWidth,
    className,
    ...props
  }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))
    const config = sizeMap[size]

    if (type === 'circle') {
      const radius = (config.circleSize - config.strokeWidth) / 2
      const circumference = radius * 2 * Math.PI
      const offset = circumference - (percentage / 100) * circumference

      return (
        <div
          ref={ref}
          className={cn("relative inline-flex items-center justify-center", className)}
          {...props}
        >
          <svg width={config.circleSize} height={config.circleSize} className="transform -rotate-90">
            {/* 背景圆 */}
            <circle
              cx={config.circleSize / 2}
              cy={config.circleSize / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth || config.strokeWidth}
              className={trailColor}
            />
            {/* 进度圆 */}
            <circle
              cx={config.circleSize / 2}
              cy={config.circleSize / 2}
              r={radius}
              fill="none"
              stroke={strokeColor || 'currentColor'}
              strokeWidth={strokeWidth || config.strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-300 text-emerald-600"
            />
          </svg>
          {showLabel && (
            <span className="absolute text-sm font-medium text-gray-700">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )
    }

    if (type === 'dashboard') {
      const radius = (config.circleSize - config.strokeWidth) / 2
      const circumference = radius * 2 * Math.PI
      const halfCircumference = circumference / 2
      const offset = halfCircumference - (percentage / 100) * halfCircumference

      return (
        <div
          ref={ref}
          className={cn("relative inline-flex items-center justify-center", className)}
          {...props}
        >
          <svg width={config.circleSize} height={config.circleSize} className="transform -rotate-90">
            <circle
              cx={config.circleSize / 2}
              cy={config.circleSize / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth || config.strokeWidth}
              strokeDasharray={`${halfCircumference} ${circumference}`}
              className={trailColor}
            />
            <circle
              cx={config.circleSize / 2}
              cy={config.circleSize / 2}
              r={radius}
              fill="none"
              stroke={strokeColor || 'currentColor'}
              strokeWidth={strokeWidth || config.strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${halfCircumference} ${circumference}`}
              strokeDashoffset={offset}
              className="transition-all duration-300 text-emerald-600"
            />
          </svg>
          {showLabel && (
            <span className="absolute text-sm font-medium text-gray-700">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )
    }

    // Line progress (default)
    return (
      <div
        ref={ref}
        className={cn("w-full", className)}
        {...props}
      >
        <div className={cn("w-full rounded-full overflow-hidden", trailColor)}>
          <div
            className={cn("h-full rounded-full transition-all duration-300", strokeColor || "bg-emerald-600")}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <span className="text-sm text-gray-600 mt-1 inline-block">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
