/**
 * Skeleton 骨架屏
 * 加载占位，提升感知加载速度
 */
import * as React from "react"
import { cn } from "@/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'rectangular', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse bg-gray-200",
          variant === 'text' && "h-4 rounded",
          variant === 'circular' && "rounded-full",
          variant === 'rectangular' && "rounded-lg",
          className
        )}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

export interface TableSkeletonProps {
  rows?: number
  columns?: number
  className?: string
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className
}) => {
  return (
    <div className={cn("space-y-3", className)}>
      {/* 表头 */}
      <div className="flex gap-4 pb-3 border-b border-gray-200">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 flex-1" variant="text" />
        ))}
      </div>

      {/* 表体 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" variant="text" />
          ))}
        </div>
      ))}
    </div>
  )
}
TableSkeleton.displayName = "TableSkeleton"

export interface CardSkeletonProps {
  className?: string
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({ className }) => {
  return (
    <div className={cn("p-4 rounded-xl border border-gray-200 bg-white space-y-3", className)}>
      <Skeleton className="h-6 w-1/3" variant="text" />
      <Skeleton className="h-4 w-full" variant="text" />
      <Skeleton className="h-4 w-4/5" variant="text" />
    </div>
  )
}
CardSkeleton.displayName = "CardSkeleton"

export interface ListSkeletonProps {
  count?: number
  className?: string
}

const ListSkeleton: React.FC<ListSkeletonProps> = ({
  count = 3,
  className
}) => {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
          <Skeleton className="w-10 h-10 rounded-full" variant="circular" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" variant="text" />
            <Skeleton className="h-3 w-1/2" variant="text" />
          </div>
        </div>
      ))}
    </div>
  )
}
ListSkeleton.displayName = "ListSkeleton"

export { Skeleton, TableSkeleton, CardSkeleton, ListSkeleton }
