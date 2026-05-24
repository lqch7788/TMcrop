/**
 * FilterBar 筛选工具栏
 * 通用筛选条件工具栏
 */
import * as React from "react"
import { Search, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from './button'

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  onSearch?: () => void
  onReset?: () => void
  children?: React.ReactNode
}

const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  ({ onSearch, onReset, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-wrap items-end gap-3 p-4 bg-white rounded-xl border border-gray-200",
          className
        )}
        {...props}
      >
        {/* 筛选项容器 */}
        <div className="flex-1 flex flex-wrap items-end justify-between gap-3">
          {children}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {onReset && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </Button>
          )}
          {onSearch && (
            <Button
              size="sm"
              onClick={onSearch}
              className="flex items-center gap-1"
            >
              <Search className="w-4 h-4" />
              搜索
            </Button>
          )}
        </div>
      </div>
    )
  }
)
FilterBar.displayName = "FilterBar"

export interface FilterItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  children?: React.ReactNode
}

const FilterItem = React.forwardRef<HTMLDivElement, FilterItemProps>(
  ({ label, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-1.5", className)}
        {...props}
      >
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        {children}
      </div>
    )
  }
)
FilterItem.displayName = "FilterItem"

export { FilterBar, FilterItem }
