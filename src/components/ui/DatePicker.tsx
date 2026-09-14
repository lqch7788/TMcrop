/**
 * DatePicker 日期选择器（2026-09-14 重构：换 react-day-picker 实现）
 *
 * 原版用原生 `<input type="date">`，在 Chromium 内嵌（Electron/PWA）不弹原生日历。
 * 改用 react-day-picker 自定义弹窗日历，跨浏览器一致。
 */
import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { zhCN } from "date-fns/locale"
import "react-day-picker/dist/style.css"
import { cn } from "@/lib/utils"

export interface DatePickerProps {
  selected?: Date
  onChange?: (date: Date) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function DatePicker({
  selected,
  onChange,
  placeholder = "选择日期",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  // 点击外部关闭弹窗
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* 显示框：模仿 input 样式 */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={cn(
          "flex h-9 w-full items-center rounded-lg border border-gray-400 bg-white pl-10 pr-3 text-sm text-left shadow-inner",
          "focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-gray-400",
        )}
        style={{ height: "36px", lineHeight: "36px", boxSizing: "border-box" }}
      >
        <CalendarIcon className="absolute left-3 w-4 h-4 text-gray-500 pointer-events-none" />
        <span>{selected ? formatDate(selected) : placeholder}</span>
      </button>

      {/* 弹窗日历 */}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <DayPicker
            mode="single"
            locale={zhCN}
            selected={selected}
            onSelect={(date) => {
              if (date) {
                onChange?.(date)
                setOpen(false)
              }
            }}
            showOutsideDays
            className="text-sm"
          />
        </div>
      )}
    </div>
  )
}
