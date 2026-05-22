/**
 * DatePicker 日期选择器
 * 支持单个日期选择、快捷选项、直接选择年份和月份
 */
import * as React from "react"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DatePickerProps {
  selected?: Date
  onChange?: (date: Date) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  shortcuts?: { label: string; value: Date }[]
  className?: string
}

const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  ({ selected, onChange, placeholder = "选择日期", disabled, minDate, maxDate, shortcuts, className }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [viewDate, setViewDate] = React.useState(selected || new Date())
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [showYearPicker, setShowYearPicker] = React.useState(false)
    const [showMonthPicker, setShowMonthPicker] = React.useState(false)
    const yearPickerRef = React.useRef<HTMLDivElement>(null)
    const monthPickerRef = React.useRef<HTMLDivElement>(null)

    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

    // 生成年份范围（当前年份前后10年）
    const currentYear = new Date().getFullYear()
    const years = React.useMemo(() => {
      const minYear = minDate ? minDate.getFullYear() : currentYear - 20
      const maxYear = maxDate ? maxDate.getFullYear() : currentYear + 10
      const result = []
      for (let y = maxYear; y >= minYear; y--) {
        result.push(y)
      }
      return result
    }, [minDate, maxDate])

    const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear()
      const month = date.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const daysInMonth = lastDay.getDate()
      const startingDay = firstDay.getDay()

      const days: (Date | null)[] = []

      // 填充上月的日期
      for (let i = 0; i < startingDay; i++) {
        days.push(null)
      }

      // 填充当月日期
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i))
      }

      return days
    }

    const isDisabled = (date: Date) => {
      if (minDate && date < minDate) return true
      if (maxDate && date > maxDate) return true
      return false
    }

    const isSelected = (date: Date) => {
      if (!selected) return false
      return date.toDateString() === selected.toDateString()
    }

    const handleDateClick = (date: Date) => {
      if (isDisabled(date)) return
      onChange?.(date)
      setIsOpen(false)
    }

    const handleShortcutClick = (date: Date) => {
      if (isDisabled(date)) return
      onChange?.(date)
      setIsOpen(false)
    }

    const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))
    const nextMonth = () => setDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))

    const setDate = (date: Date) => {
      setViewDate(date)
      setShowYearPicker(false)
      setShowMonthPicker(false)
    }

    const handleYearSelect = (year: number) => {
      setViewDate(new Date(year, viewDate.getMonth()))
      setShowYearPicker(false)
    }

    const handleMonthSelect = (month: number) => {
      setViewDate(new Date(viewDate.getFullYear(), month))
      setShowMonthPicker(false)
    }

    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false)
        }
        if (yearPickerRef.current && !yearPickerRef.current.contains(e.target as Node)) {
          setShowYearPicker(false)
        }
        if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
          setShowMonthPicker(false)
        }
      }
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    const formatDate = (date: Date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    return (
      <div ref={containerRef} className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "inline-flex items-center gap-2 h-10 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm transition-colors",
            disabled && "opacity-50 cursor-not-allowed",
            !disabled && "hover:bg-gray-50",
            isOpen && "ring-2 ring-emerald-500 ring-offset-2"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="w-4 h-4 text-gray-500" />
          <span className={selected ? "text-gray-900" : "text-gray-400"}>
            {selected ? formatDate(selected) : placeholder}
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 p-4 bg-white rounded-xl border border-gray-200 shadow-lg w-[300px]">
            {/* 快捷选项 */}
            {shortcuts && shortcuts.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-gray-100">
                {shortcuts.map((shortcut, index) => (
                  <button
                    key={index}
                    onClick={() => handleShortcutClick(shortcut.value)}
                    className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    {shortcut.label}
                  </button>
                ))}
              </div>
            )}

            {/* 年份和月份导航 */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                {/* 年份选择 */}
                <div className="relative" ref={yearPickerRef}>
                  <button
                    onClick={() => {
                      setShowYearPicker(!showYearPicker)
                      setShowMonthPicker(false)
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-sm font-medium rounded hover:bg-gray-100 transition-colors"
                  >
                    {viewDate.getFullYear()}年
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showYearPicker && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 p-2 bg-white rounded-lg border border-gray-200 shadow-lg w-[120px] max-h-[200px] overflow-y-auto z-50">
                      <div className="grid grid-cols-2 gap-1">
                        {years.map((year) => (
                          <button
                            key={year}
                            onClick={() => handleYearSelect(year)}
                            className={cn(
                              "px-2 py-1 text-xs rounded transition-colors",
                              viewDate.getFullYear() === year
                                ? "bg-emerald-600 text-white"
                                : "hover:bg-gray-100"
                            )}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 月份选择 */}
                <div className="relative" ref={monthPickerRef}>
                  <button
                    onClick={() => {
                      setShowMonthPicker(!showMonthPicker)
                      setShowYearPicker(false)
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-sm font-medium rounded hover:bg-gray-100 transition-colors"
                  >
                    {viewDate.getMonth() + 1}月
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showMonthPicker && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 p-2 bg-white rounded-lg border border-gray-200 shadow-lg w-[120px] z-50">
                      <div className="grid grid-cols-3 gap-1">
                        {months.map((month, index) => (
                          <button
                            key={index}
                            onClick={() => handleMonthSelect(index)}
                            className={cn(
                              "px-1 py-1 text-xs rounded transition-colors",
                              viewDate.getMonth() === index
                                ? "bg-emerald-600 text-white"
                                : "hover:bg-gray-100"
                            )}
                          >
                            {month}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={nextMonth}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekdays.map((day, index) => (
                <div key={index} className="text-center text-xs text-gray-400 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* 日期网格 */}
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(viewDate).map((date, index) => (
                <div key={index} className="aspect-square">
                  {date && (
                    <button
                      onClick={() => handleDateClick(date)}
                      disabled={isDisabled(date)}
                      className={cn(
                        "w-full h-full flex items-center justify-center text-sm rounded-lg transition-colors",
                        isSelected(date) && "bg-emerald-600 text-white",
                        !isSelected(date) && isDisabled(date) && "text-gray-300 cursor-not-allowed",
                        !isSelected(date) && !isDisabled(date) && "hover:bg-gray-100"
                      )}
                    >
                      {date.getDate()}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
)
DatePicker.displayName = "DatePicker"

export { DatePicker }
