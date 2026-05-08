/**
 * Timeline 时间线组件
 * 展示时间序列流程，如项目进度、审批历史
 * 支持三种状态：已完成(completed)、进行中(processing)、待处理(pending)
 */
import * as React from "react"
import { CheckCircle, Circle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

// 时间线项类型
export interface TimelineItem {
  title: string
  description?: React.ReactNode
  status: 'completed' | 'processing' | 'pending'
  time?: string
}

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TimelineItem[]
}

const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ items, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("w-full", className)}
        {...props}
      >
        <div className="relative">
          {items.map((item, index) => {
            // 根据状态选择图标和样式
            const isLast = index === items.length - 1

            return (
              <div key={index} className="relative flex gap-4 pb-6">
                {/* 左侧时间线节点区域 */}
                <div className="flex flex-col items-center">
                  {/* 节点图标 */}
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full border-2 bg-white z-10",
                      item.status === 'completed' && "border-emerald-500 text-emerald-500",
                      item.status === 'processing' && "border-blue-500 text-blue-500 animate-pulse",
                      item.status === 'pending' && "border-gray-300 text-gray-300"
                    )}
                  >
                    {item.status === 'completed' && <CheckCircle className="w-5 h-5" />}
                    {item.status === 'processing' && <Clock className="w-5 h-5" />}
                    {item.status === 'pending' && <Circle className="w-5 h-5" />}
                  </div>

                  {/* 连接线（非最后一个项显示） */}
                  {!isLast && (
                    <div
                      className={cn(
                        "w-0.5 h-full absolute top-8 left-4",
                        item.status === 'completed' ? "bg-emerald-500" : "bg-gray-200"
                      )}
                    />
                  )}
                </div>

                {/* 右侧内容区域 */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between">
                    <h4
                      className={cn(
                        "text-sm font-medium",
                        item.status === 'completed' && "text-gray-900",
                        item.status === 'processing' && "text-gray-900",
                        item.status === 'pending' && "text-gray-400"
                      )}
                    >
                      {item.title}
                    </h4>
                    {item.time && (
                      <span className="text-xs text-gray-500">{item.time}</span>
                    )}
                  </div>
                  {item.description && (
                    <p
                      className={cn(
                        "text-sm mt-1",
                        item.status === 'pending' ? "text-gray-400" : "text-gray-500"
                      )}
                    >
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
Timeline.displayName = "Timeline"

export { Timeline }
