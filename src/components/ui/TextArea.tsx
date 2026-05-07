/**
 * TextArea 多行文本输入
 * 多行文本输入，支持自动高度调整
 */
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoSize?: boolean
  minRows?: number
  maxRows?: number
  showCount?: boolean
  maxLength?: number
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({
    className,
    autoSize = false,
    minRows = 3,
    maxRows = 10,
    showCount = false,
    maxLength,
    value,
    onChange,
    ...props
  }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)

    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current
      if (!textarea || !autoSize) return

      textarea.style.height = 'auto'
      const lineHeight = 20 // 预估行高
      const paddingTop = 12
      const paddingBottom = 12
      const minHeight = minRows * lineHeight + paddingTop + paddingBottom
      const maxHeight = maxRows * lineHeight + paddingTop + paddingBottom

      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${newHeight}px`
    }, [autoSize, minRows, maxRows])

    React.useEffect(() => {
      adjustHeight()
    }, [value, adjustHeight])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e)
      if (autoSize) {
        adjustHeight()
      }
    }

    const currentLength = typeof value === 'string' ? value.length : 0

    return (
      <div className="relative">
        <textarea
          ref={(node) => {
            textareaRef.current = node
            if (typeof ref === 'function') {
              ref(node)
            } else if (ref) {
              ref.current = node
            }
          }}
          className={cn(
            "flex min-h-[80px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-none",
            autoSize && "overflow-hidden",
            className
          )}
          value={value}
          onChange={handleChange}
          maxLength={maxLength}
          rows={autoSize ? undefined : minRows}
          {...props}
        />

        {/* 字数统计 */}
        {showCount && maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {currentLength}/{maxLength}
          </div>
        )}
        {showCount && !maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {currentLength} 字
          </div>
        )}
      </div>
    )
  }
)
TextArea.displayName = "TextArea"

export { TextArea }
