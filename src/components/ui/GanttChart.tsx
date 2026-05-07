/**
 * GanttChart 甘特图
 * 展示项目进度、时间安排
 */
import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface GanttTask {
  id: string
  title: string
  startDate: string
  endDate: string
  progress?: number
  color?: string
}

export type GanttViewMode = 'day' | 'week' | 'month'

export interface GanttChartProps {
  tasks: GanttTask[]
  viewMode?: GanttViewMode
  onTaskClick?: (task: GanttTask) => void
  className?: string
}

const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  viewMode = 'month',
  onTaskClick,
  className
}) => {
  const [viewDate, setViewDate] = React.useState(new Date())

  // 计算日期范围
  const getDateRange = () => {
    const dates: Date[] = []
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    const days = viewMode === 'month' ? 30 : viewMode === 'week' ? 7 : 14

    for (let i = 0; i < days; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date)
    }

    return dates
  }

  const dates = getDateRange()

  // 计算任务位置
  const getTaskPosition = (task: GanttTask) => {
    const taskStart = new Date(task.startDate)
    const taskEnd = new Date(task.endDate)
    const rangeStart = dates[0]
    const rangeEnd = dates[dates.length - 1]

    const totalDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const dayWidth = 100 / totalDays

    const startOffset = Math.max(0, Math.floor((taskStart.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))) * dayWidth
    const endOffset = Math.min(totalDays, Math.ceil((rangeEnd.getTime() - taskEnd.getTime()) / (1000 * 60 * 60 * 24))) * dayWidth

    const left = startOffset
    const width = Math.max(100 / totalDays, 100 - startOffset - endOffset)

    return { left: `${left}%`, width: `${width}%` }
  }

  // 格式化日期显示
  const formatDateHeader = (date: Date) => {
    if (viewMode === 'month') {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // 获取星期几
  const getWeekday = (date: Date) => {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    return weekdays[date.getDay()]
  }

  const prevPeriod = () => {
    const newDate = new Date(viewDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setDate(newDate.getDate() - (viewMode === 'week' ? 7 : 14))
    }
    setViewDate(newDate)
  }

  const nextPeriod = () => {
    const newDate = new Date(viewDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else {
      newDate.setDate(newDate.getDate() + (viewMode === 'week' ? 7 : 14))
    }
    setViewDate(newDate)
  }

  const today = new Date()

  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 overflow-hidden", className)}>
      {/* 头部导航 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={prevPeriod}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="font-medium text-gray-900">
          {viewDate.getFullYear()}年{viewDate.getMonth() + 1}月
        </span>
        <button
          onClick={nextPeriod}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 甘特图内容 */}
      <div className="flex">
        {/* 任务列表 */}
        <div className="w-48 flex-shrink-0 border-r border-gray-200">
          <div className="h-12 flex items-center px-4 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">任务名称</span>
          </div>
          {tasks.map(task => (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className="h-14 flex items-center px-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
            >
              <span className="text-sm text-gray-900 truncate">{task.title}</span>
            </div>
          ))}
        </div>

        {/* 时间轴 */}
        <div className="flex-1 overflow-x-auto">
          {/* 日期头部 */}
          <div className="h-12 flex bg-gray-50 border-b border-gray-200">
            {dates.map((date, index) => {
              const isToday = date.toDateString() === today.toDateString()
              return (
                <div
                  key={index}
                  className={cn(
                    "flex-1 min-w-[40px] flex flex-col items-center justify-center text-xs border-r border-gray-100",
                    isToday && "bg-emerald-50"
                  )}
                >
                  <span className={cn(
                    isToday ? "text-emerald-600 font-medium" : "text-gray-500"
                  )}>
                    {getWeekday(date)}
                  </span>
                  <span className={cn(
                    isToday ? "text-emerald-600 font-bold" : "text-gray-700"
                  )}>
                    {date.getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* 甘特条 */}
          <div className="relative">
            {/* 网格线 */}
            <div className="absolute inset-0 flex">
              {dates.map((_, index) => (
                <div
                  key={index}
                  className="flex-1 border-r border-gray-50"
                />
              ))}
            </div>

            {/* 任务条 */}
            {tasks.map(task => {
              const position = getTaskPosition(task)
              const progress = task.progress || 0

              return (
                <div
                  key={task.id}
                  className="h-14 relative flex items-center border-b border-gray-100 hover:bg-gray-50/50"
                >
                  <div
                    onClick={() => onTaskClick?.(task)}
                    className="absolute h-8 rounded-lg cursor-pointer overflow-hidden"
                    style={{
                      left: position.left,
                      width: position.width,
                      backgroundColor: task.color || '#10b981'
                    }}
                  >
                    {/* 进度条 */}
                    <div
                      className="h-full bg-white/30 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                    {/* 任务标题 */}
                    <span className="absolute inset-0 flex items-center px-2 text-xs text-white font-medium truncate">
                      {task.title}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

GanttChart.displayName = "GanttChart"

export { GanttChart }
