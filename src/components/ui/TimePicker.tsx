/**
 * TimePicker 时间选择器
 * 选择时间（小时、分钟、秒）
 */
import * as React from "react"
import { Clock, ChevronUp, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TimePickerProps {
  value?: string
  onChange?: (value: string) => void
  format?: string
  placeholder?: string
  disabled?: boolean
  use12Hours?: boolean
  allowClear?: boolean
  className?: string
}

const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  format = 'HH:mm:ss',
  placeholder = '选择时间',
  disabled,
  use12Hours = false,
  allowClear = true,
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [hours, setHours] = React.useState('00')
  const [minutes, setMinutes] = React.useState('00')
  const [seconds, setSeconds] = React.useState('00')
  const [period, setPeriod] = React.useState<'AM' | 'PM'>('AM')
  const containerRef = React.useRef<HTMLDivElement>(null)

  // 解析初始值
  React.useEffect(() => {
    if (value) {
      const parts = value.split(':')
      if (parts.length >= 2) {
        setHours(parts[0] || '00')
        setMinutes(parts[1] || '00')
        if (parts[2]) setSeconds(parts[2])
      }
    }
  }, [value])

  const handleConfirm = () => {
    let hour = parseInt(hours)
    if (use12Hours) {
      if (period === 'PM' && hour !== 12) hour += 12
      if (period === 'AM' && hour === 12) hour = 0
    }
    const hourStr = hour.toString().padStart(2, '0')
    const timeValue = `${hourStr}:${minutes}:${seconds}`
    onChange?.(timeValue)
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setHours('00')
    setMinutes('00')
    setSeconds('00')
    onChange?.('')
  }

  const adjustNumber = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    current: string,
    min: number,
    max: number,
    delta: number
  ) => {
    let num = parseInt(current) + delta
    if (num < min) num = max
    if (num > max) num = min
    setter(num.toString().padStart(2, '0'))
  }

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const displayValue = value || ''

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
        <Clock className="w-4 h-4 text-gray-500" />
        <span className={displayValue ? "text-gray-900" : "text-gray-400"}>
          {displayValue || placeholder}
        </span>
        {allowClear && displayValue && (
          <span onClick={handleClear} className="p-1 hover:bg-gray-100 rounded ml-auto">
            <X className="w-3 h-3 text-gray-400" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 p-4 bg-white rounded-xl border border-gray-200 shadow-lg">
          <div className="flex items-center gap-2">
            {/* 小时 */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => adjustNumber(setHours, hours, use12Hours ? 1 : 0, use12Hours ? 12 : 23, 1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronUp className="w-4 h-4 text-gray-500" />
              </button>
              <input
                type="text"
                value={hours}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(-2)
                  setHours(v)
                }}
                className="w-12 h-10 text-center rounded border border-gray-200 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => adjustNumber(setHours, hours, use12Hours ? 1 : 0, use12Hours ? 12 : 23, -1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <span className="text-2xl text-gray-400">:</span>

            {/* 分钟 */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => adjustNumber(setMinutes, minutes, 0, 59, 1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronUp className="w-4 h-4 text-gray-500" />
              </button>
              <input
                type="text"
                value={minutes}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(-2)
                  setMinutes(v)
                }}
                className="w-12 h-10 text-center rounded border border-gray-200 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => adjustNumber(setMinutes, minutes, 0, 59, -1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <span className="text-2xl text-gray-400">:</span>

            {/* 秒 */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => adjustNumber(setSeconds, seconds, 0, 59, 1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronUp className="w-4 h-4 text-gray-500" />
              </button>
              <input
                type="text"
                value={seconds}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(-2)
                  setSeconds(v)
                }}
                className="w-12 h-10 text-center rounded border border-gray-200 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => adjustNumber(setSeconds, seconds, 0, 59, -1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* 12小时制切换 */}
            {use12Hours && (
              <div className="flex flex-col ml-2">
                <button
                  onClick={() => setPeriod('AM')}
                  className={cn(
                    "px-2 py-1 text-xs rounded-t border",
                    period === 'AM' ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-200 hover:bg-gray-50"
                  )}
                >
                  AM
                </button>
                <button
                  onClick={() => setPeriod('PM')}
                  className={cn(
                    "px-2 py-1 text-xs rounded-b border",
                    period === 'PM' ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-200 hover:bg-gray-50"
                  )}
                >
                  PM
                </button>
              </div>
            )}
          </div>

          {/* 快捷选项 */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => { setHours('09'); setMinutes('00'); setSeconds('00') }}
              className="px-3 py-1.5 text-xs rounded bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              上午
            </button>
            <button
              onClick={() => { setHours('12'); setMinutes('00'); setSeconds('00') }}
              className="px-3 py-1.5 text-xs rounded bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              中午
            </button>
            <button
              onClick={() => { setHours('18'); setMinutes('00'); setSeconds('00') }}
              className="px-3 py-1.5 text-xs rounded bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              下午
            </button>
            <button
              onClick={() => { setHours('00'); setMinutes('00'); setSeconds('00') }}
              className="px-3 py-1.5 text-xs rounded bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              午夜
            </button>
          </div>

          {/* 确认按钮 */}
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              确认
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

TimePicker.displayName = "TimePicker"

export { TimePicker }
