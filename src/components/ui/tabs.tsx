/**
 * Tabs 标签页
 * 切换不同内容面板
 */
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
}

/**
 * Tabs 上下文（2026-10-25 新增）
 *
 * 原实现靠「克隆直接子元素」把 selectedValue / onValueChange 传给 TabsList 和 TabsContent，
 * 一旦中间包一层布局容器（例如让 Tab 卡片与工具栏同行），克隆就断在容器上 →
 * Tab 高亮和内容切换全部失效。
 * 改用 Context 后，TabsList / TabsContent 无论被包几层都能拿到当前值。
 */
const TabsContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
} | null>(null)

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, defaultValue, value, onValueChange, children, ...props }, ref) => {
    const [selectedValue, setSelectedValue] = React.useState(defaultValue || '')

    const currentValue = value || selectedValue

    const handleValueChange = (newValue: string) => {
      setSelectedValue(newValue)
      onValueChange?.(newValue)
    }

    return (
      <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
        <div
          ref={ref}
          className={cn("w-full", className)}
          {...props}
        >
          {children}
        </div>
      </TabsContext.Provider>
    )
  }
)
Tabs.displayName = "Tabs"

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedValue?: string
  onValueChange?: (value: string) => void
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, selectedValue, onValueChange, children, ...props }, ref) => {
    // 显式传入优先，其次取 Context（兼容被布局容器包裹的用法）
    const ctx = React.useContext(TabsContext)
    const currentValue = selectedValue ?? ctx?.value ?? ''
    const handleChange = onValueChange ?? ctx?.onValueChange

    // 将 selectedValue 和 onValueChange 传递给每个 TabsTrigger 子元素
    const clonedChildren = React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child as React.ReactElement<any>, {
          selectedValue: currentValue,
          onValueChange: handleChange
        })
      }
      return child
    })

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl",
          className
        )}
        {...props}
      >
        {clonedChildren}
      </div>
    )
  }
)
TabsList.displayName = "TabsList"

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  disabled?: boolean
  selectedValue?: string
  onValueChange?: (value: string) => void
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, disabled, selectedValue, onValueChange, ...props }, ref) => {
    const isSelected = selectedValue === value

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        data-state={isSelected ? 'active' : 'inactive'}
        onClick={() => onValueChange?.(value)}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-base font-semibold transition-all duration-200",
          isSelected
            ? "bg-white text-emerald-600 shadow-sm"
            : "text-gray-500 hover:text-gray-700 hover:bg-white/50",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      />
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  selectedValue?: string
  /** Radix 兼容字段：本地实现始终按 selectedValue 控制显隐，此参数仅用于兼容调用方 */
  forceMount?: boolean
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps & { onValueChange?: (value: string) => void }>(
  ({ className, value, selectedValue, onValueChange, forceMount: _forceMount, children, ...props }, ref) => {
    // 显式传入优先，其次取 Context（兼容被布局容器包裹的用法）
    const ctx = React.useContext(TabsContext)
    const currentValue = selectedValue ?? ctx?.value ?? ''
    const isSelected = currentValue === value

    if (!isSelected) return null

    return (
      <div
        ref={ref}
        className={cn(
          "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
