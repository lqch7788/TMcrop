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

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, defaultValue, value, onValueChange, children, ...props }, ref) => {
    const [selectedValue, setSelectedValue] = React.useState(defaultValue || '')

    const currentValue = value || selectedValue

    const handleValueChange = (newValue: string) => {
      setSelectedValue(newValue)
      onValueChange?.(newValue)
    }

    // 克隆 children 以传递 value
    const clonedChildren = React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child as React.ReactElement<any>, {
          selectedValue: currentValue,
          onValueChange: handleValueChange
        })
      }
      return child
    })

    return (
      <div
        ref={ref}
        className={cn("w-full", className)}
        {...props}
      >
        {clonedChildren}
      </div>
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
    // 将 selectedValue 和 onValueChange 传递给每个 TabsTrigger 子元素
    const clonedChildren = React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child as React.ReactElement<any>, {
          selectedValue,
          onValueChange
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
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, selectedValue, children, ...props }, ref) => {
    const isSelected = selectedValue === value

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
