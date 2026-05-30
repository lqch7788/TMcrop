/**
 * DatePicker 日期选择器
 * 使用原生 input type="date"，保持简洁统一
 */
import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DatePickerProps {
  selected?: Date
  onChange?: (date: Date) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ selected, onChange, placeholder = "选择日期", disabled, className }, ref) => {

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      if (value && onChange) {
        onChange(new Date(value))
      }
    }

    const formatDateForInput = (date: Date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    return (
      <div className={cn("relative", className)}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <CalendarIcon className="w-4 h-4 text-gray-500" />
        </div>
        <input
          ref={ref}
          type="date"
          value={selected ? formatDateForInput(selected) : ""}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "flex h-9 w-full rounded-lg border border-gray-400 bg-white pl-10 pr-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-inner",
            className
          )}
        />
      </div>
    )
  }
)
DatePicker.displayName = "DatePicker"

export { DatePicker }
