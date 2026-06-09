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
  /**
   * 筛选字段等宽列数（默认 4）
   * - 默认 4: 1 列移动 / 2 列平板 / 4 列桌面（按 sm/md/lg 断点）
   * - 传 0/undefined → 不强制 grid，fallback 到 flex-wrap
   */
  columns?: number
}

const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  ({ onSearch, onReset, children, columns = 4, className, ...props }, ref) => {
    // 2026-06-05: 支持 columns 等宽分布（默认 4 列），按钮容器保持在右侧不变
    // 注意：Tailwind JIT 需要完整 class 字符串，不能用模板字符串拼接，所以这里穷举
    const gridClass =
      columns === 1
        ? 'grid grid-cols-1 gap-3 flex-1'
        : columns === 2
        ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1'
        : columns === 3
        ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 flex-1'
        : columns === 4
        ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1'
        : 'flex-1 flex flex-wrap items-end justify-between gap-3'

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-wrap items-end gap-3 p-4 bg-white rounded-xl border border-gray-200",
          className
        )}
        {...props}
      >
        {/* 筛选项容器（等宽 grid，按列数分配） */}
        <div className={gridClass}>
          {children}
        </div>

        {/* 操作按钮（始终保持在筛选栏后，位置不变） */}
        <div className="flex items-center gap-2">
          {onReset && (
            <Button
              variant="warning"
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
              variant="default"
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
