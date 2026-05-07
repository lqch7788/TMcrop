/**
 * Calendar 日历视图
 * 日历展示，支持日期选择和事件标记
 */
import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CalendarEvent {
  date: Date
  title: string
  color?: string
}

export type CalendarMode = 'single' | 'range' | 'multiple'

export interface CalendarProps {
  selected?: Date
  onChange?: (date: Date) => void
  mode?: CalendarMode
  events?: CalendarEvent[]
  onDateClick?: (date: Date) => void
  disabled?: (date: Date) => boolean
  minDate?: Date
  maxDate?: Date
  className?: string
}

const Calendar: React.FC<CalendarProps> = ({
  selected,
  onChange,
  mode = 'single',
  events = [],
  onDateClick,
  disabled,
  minDate,
  maxDate,
  className
}) => {
  const [viewDate, setViewDate] = React.useState(selected || new Date())

  const weekdays = ['日', '一', '二', '三', '四', '五', '六']

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()

    const days: (Date | null)[] = []

    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const isDisabled = (date: Date) => {
    if (disabled?.(date)) return true
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  const isSelected = (date: Date) => {
    return selected?.toDateString() === date.toDateString()
  }

  const hasEvent = (date: Date) => {
    return events.filter(e => e.date.toDateString() === date.toDateString())
  }

  const handleDateClick = (date: Date) => {
    if (isDisabled(date)) return
    onChange?.(date)
    onDateClick?.(date)
  }

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))

  const today = new Date()

  return (
    <div className={cn("w-full", className)}>
      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="text-base font-semibold text-gray-900">
          {viewDate.getFullYear()}年{viewDate.getMonth() + 1}月
        </span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map((day, index) => (
          <div key={index} className="text-center text-xs text-gray-500 py-2 font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {getDaysInMonth(viewDate).map((date, index) => (
          <div key={index} className="aspect-square p-0.5">
            {date && (
              <button
                onClick={() => handleDateClick(date)}
                disabled={isDisabled(date)}
                className={cn(
                  "w-full h-full flex flex-col items-center justify-center rounded-lg text-sm transition-colors relative",
                  isSelected(date) && "bg-emerald-600 text-white",
                  !isSelected(date) && isDisabled(date) && "text-gray-300 cursor-not-allowed",
                  !isSelected(date) && !isDisabled(date) && "hover:bg-gray-100",
                  !isSelected(date) && date.toDateString() === today.toDateString() && "border border-emerald-400"
                )}
              >
                <span>{date.getDate()}</span>
                {/* 事件标记 */}
                {!isSelected(date) && hasEvent(date).length > 0 && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {hasEvent(date).slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        className={cn("w-1 h-1 rounded-full", event.color || "bg-emerald-500")}
                      />
                    ))}
                  </div>
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 事件列表 */}
      {events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase">本月事件</h4>
          {events
            .filter(e => e.date.getMonth() === viewDate.getMonth() && e.date.getFullYear() === viewDate.getFullYear())
            .slice(0, 5)
            .map((event, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className={cn("w-2 h-2 rounded-full", event.color || "bg-emerald-500")} />
                <span className="text-gray-600">
                  {event.date.getDate()}日 {event.title}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
