/**
 * Tooltip 文字提示
 * 鼠标悬停显示提示信息
 */
import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
  /** 多行模式：内容超宽自动换行（默认 false 单行） */
  multiline?: boolean
  /** 多行模式下的最大宽度（px），默认 320 */
  maxWidth?: number
  /**
   * 2026-10-17：portal 模式 —— 提示框挂到 body + fixed 定位。
   * 用于表头等位于 overflow 滚动容器内的元素：普通绝对定位会被容器裁剪（边缘列提示只显示一半）。
   * 默认 false，其他调用点行为不变。
   */
  portal?: boolean
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
  className,
  multiline = false,
  maxWidth = 320,
  portal = false,
}) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout>()
  const anchorRef = React.useRef<HTMLDivElement>(null)
  // portal 模式下的固定定位坐标（基于触发元素的视口矩形计算）
  const [portalPos, setPortalPos] = React.useState<{ top: number; left: number } | null>(null)

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (portal && anchorRef.current) {
        const r = anchorRef.current.getBoundingClientRect()
        const half = Math.min(maxWidth, 320) / 2
        // 垂直：bottom 模式贴在触发元素下方；其余（本组件目前只用 top/bottom）按 bottom 处理
        const top = position === 'top' ? r.top - 8 : r.bottom + 8
        // 水平：以触发元素中心对齐，并向左右夹取，保证不超出视口
        const rawLeft = r.left + r.width / 2
        const left = Math.min(Math.max(rawLeft, half + 8), window.innerWidth - half - 8)
        setPortalPos({ top, left })
      }
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  }

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-x-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-y-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-y-transparent border-l-transparent"
  }

  return (
    <div
      ref={anchorRef}
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}

      {/* portal 模式：挂到 body + fixed 定位，避免被 overflow 滚动容器裁剪 */}
      {portal && isVisible && portalPos && createPortal(
        <div
          className={cn(
            "fixed z-[9999] px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none",
            multiline ? "" : "whitespace-nowrap",
            "animate-in fade-in zoom-in-95 duration-150",
            className
          )}
          style={{
            top: portalPos.top,
            left: portalPos.left,
            transform: position === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            ...(multiline ? { maxWidth, width: 'max-content' } : {}),
          }}
          role="tooltip"
        >
          {content}
        </div>,
        document.body
      )}

      {!portal && isVisible && (
        <div
          className={cn(
            "absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg",
            multiline ? "" : "whitespace-nowrap",
            "animate-in fade-in zoom-in-95 duration-150",
            positionClasses[position],
            className
          )}
          style={multiline ? { maxWidth, width: 'max-content' } : undefined}
          role="tooltip"
        >
          {content}
          {/* 箭头（多行模式不显示，避免与换行错位） */}
          {!multiline && (
            <div
              className={cn(
                "absolute w-0 h-0 border-4",
                arrowClasses[position]
              )}
            />
          )}
        </div>
      )}
    </div>
  )
}

Tooltip.displayName = "Tooltip"

export { Tooltip }
