/**
 * DatePicker 日期选择器
 *
 * 2026-09-14 重构：换 react-day-picker 实现（原版原生 input[type=date] 在 Chromium 内嵌不弹日历）。
 * 2026-09-27 修复"无法选择日期"：日历面板此前用 absolute 定位，在带 overflow 的容器内
 * （如入库弹窗的可滚动明细表格）会被完全裁剪、用户点击后看不到日历。
 * 改用 Radix Popover（Portal 渲染到 body + 碰撞避让），任何容器内均可正常弹出。
 */
import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { zhCN } from "date-fns/locale"
import "react-day-picker/dist/style.css"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* 显示框：模仿 input 样式 */}
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "relative flex h-9 w-full items-center rounded-lg border border-gray-400 bg-white pl-10 pr-3 text-sm text-left shadow-inner",
            "focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-gray-400",
            className,
          )}
          style={{ height: "36px", lineHeight: "36px", boxSizing: "border-box" }}
        >
          <CalendarIcon className="absolute left-3 w-4 h-4 text-gray-500 pointer-events-none" />
          <span>{selected ? formatDate(selected) : placeholder}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        // p-0：日历自带内边距；z-[100] 确保浮在 Modal（z-50）之上
        className="w-auto p-0 z-[100]"
        // 保持焦点不跳进日历（与既有交互一致）
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
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
      </PopoverContent>
    </Popover>
  )
}
