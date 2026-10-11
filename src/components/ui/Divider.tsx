/**
 * Divider 分割线
 * 内容分隔
 */
import * as React from "react"
import { cn } from "@/lib/utils"

export type DividerDirection = 'horizontal' | 'vertical'
export type DividerType = 'solid' | 'dashed' | 'dotted'
export type DividerOrientation = 'left' | 'center' | 'right'

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: DividerDirection
  type?: DividerType
  orientation?: DividerOrientation
  children?: React.ReactNode
}

const Divider = React.forwardRef<HTMLElement, DividerProps>(
  ({
    direction = 'horizontal',
    type = 'solid',
    orientation = 'center',
    children,
    className,
    ...props
  }, ref) => {
    const isHorizontal = direction === 'horizontal'

    // 组件按场景渲染 <hr> 或 <div>，ref 统一按 HTMLElement 收敛后转发
    const assignRef = React.useCallback((node: HTMLElement | null) => {
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    }, [ref])

    const lineClass = cn(
      "flex-1",
      type === 'solid' && "border-gray-200",
      type === 'dashed' && "border-dashed border-gray-400",
      type === 'dotted' && "border-dotted border-gray-400"
    )

    const orientationClass = {
      left: isHorizontal ? '' : '',
      center: '',
      right: ''
    }

    if (!children) {
      // 无文字的分割线
      if (isHorizontal) {
        return (
          <hr
            ref={assignRef}
            className={cn(
              "w-full border-t my-4",
              type === 'solid' && "border-gray-200",
              type === 'dashed' && "border-dashed border-gray-400",
              type === 'dotted' && "border-dotted border-gray-400",
              className
            )}
            {...props}
          />
        )
      }

      return (
        <div
          ref={assignRef}
          className={cn(
            "h-full border-l mx-4",
            type === 'solid' && "border-gray-200",
            type === 'dashed' && "border-dashed border-gray-400",
            type === 'dotted' && "border-dotted border-gray-400",
            className
          )}
          {...props}
        />
      )
    }

    // 带文字的分割线
    if (isHorizontal) {
      return (
        <div
          ref={assignRef}
          className={cn("flex items-center my-4", className)}
          {...props}
        >
          <div className={cn(lineClass, "border-t", type === 'solid' && "border-gray-200", type === 'dashed' && "border-dashed border-gray-400", type === 'dotted' && "border-dotted border-gray-400")} />
          <span className={cn(
            "px-3 text-sm text-gray-500 whitespace-nowrap",
            orientation === 'left' && "order-first pl-0",
            orientation === 'center' && "",
            orientation === 'right' && "order-last pr-0"
          )}>
            {children}
          </span>
          <div className={cn(lineClass, "border-t", type === 'solid' && "border-gray-200", type === 'dashed' && "border-dashed border-gray-400", type === 'dotted' && "border-dotted border-gray-400")} />
        </div>
      )
    }

    // 垂直带文字分割线
    return (
      <div
        ref={assignRef}
        className={cn("inline-flex items-center", className)}
        {...props}
      >
        <div className={cn("w-full border-l", type === 'solid' && "border-gray-200", type === 'dashed' && "border-dashed border-gray-400", type === 'dotted' && "border-dotted border-gray-400")} />
        <span className="px-2 text-sm text-gray-500 whitespace-nowrap">
          {children}
        </span>
        <div className={cn("w-full border-l", type === 'solid' && "border-gray-200", type === 'dashed' && "border-dashed border-gray-400", type === 'dotted' && "border-dotted border-gray-400")} />
      </div>
    )
  }
)
Divider.displayName = "Divider"

export { Divider }
