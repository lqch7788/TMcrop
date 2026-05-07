/**
 * Space 间距组件
 * 设置元素之间的间距
 */
import * as React from "react"
import { cn } from "@/lib/utils"

export type SpaceSize = 'small' | 'middle' | 'large' | number
export type SpaceAlign = 'start' | 'end' | 'center' | 'baseline'

export interface SpaceProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'horizontal' | 'vertical'
  size?: SpaceSize
  align?: SpaceAlign
  wrap?: boolean
}

const sizeMap: Record<SpaceSize, string> = {
  small: 'gap-1',
  middle: 'gap-2',
  large: 'gap-4'
}

const Space: React.FC<SpaceProps> = ({
  direction = 'horizontal',
  size = 'middle',
  align = 'center',
  wrap = false,
  className,
  children,
  ...props
}) => {
  const sizeClass = typeof size === 'number'
    ? `gap-${size}`
    : sizeMap[size]

  const alignClass = {
    start: 'items-start',
    end: 'items-end',
    center: 'items-center',
    baseline: 'items-baseline'
  }

  return (
    <div
      ref={React.useRef(null)}
      className={cn(
        "flex",
        direction === 'horizontal' ? "flex-row" : "flex-col",
        sizeClass,
        alignClass[align],
        wrap && "flex-wrap",
        className
      )}
      {...props}
    >
      {React.Children.map(children, child => {
        if (!child) return null
        return (
          <div className="shrink-0">
            {child}
          </div>
        )
      })}
    </div>
  )
}

Space.displayName = "Space"

export { Space }
