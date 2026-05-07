/**
 * Sheet 底部抽屉
 * 从底部滑出的面板，适合移动端
 */
import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SheetProps {
  open?: boolean
  onClose?: () => void
  children?: React.ReactNode
  className?: string
}

const Sheet = React.forwardRef<HTMLDivElement, SheetProps>(
  ({ open, onClose, children, className }, ref) => {
    React.useEffect(() => {
      if (open) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
      return () => {
        document.body.style.overflow = ''
      }
    }, [open])

    if (!open) return null

    return (
      <div className="fixed inset-0 z-50">
        {/* 遮罩层 */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Sheet 内容 */}
        <div
          ref={ref}
          className={cn(
            "fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ease-out max-h-[90vh]",
            "translate-y-0",
            className
          )}
        >
          {children}
        </div>
      </div>
    )
  }
)
Sheet.displayName = "Sheet"

export interface SheetHeaderProps {
  className?: string
  children?: React.ReactNode
}

const SheetHeader = React.forwardRef<HTMLDivElement, SheetHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-2 p-4 pb-0", className)}
      {...props}
    >
      {/* 拖动指示条 */}
      <div className="flex justify-center pb-2">
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>
      {children}
    </div>
  )
)
SheetHeader.displayName = "SheetHeader"

export interface SheetTitleProps {
  className?: string
  children?: React.ReactNode
}

const SheetTitle = React.forwardRef<HTMLHeadingElement, SheetTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-lg font-semibold text-gray-900", className)}
      {...props}
    >
      {children}
    </h2>
  )
)
SheetTitle.displayName = "SheetTitle"

export interface SheetDescriptionProps {
  className?: string
  children?: React.ReactNode
}

const SheetDescription = React.forwardRef<HTMLParagraphElement, SheetDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-gray-500", className)}
      {...props}
    >
      {children}
    </p>
  )
)
SheetDescription.displayName = "SheetDescription"

export interface SheetContentProps {
  className?: string
  children?: React.ReactNode
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex-1 overflow-y-auto p-4", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SheetContent.displayName = "SheetContent"

export interface SheetFooterProps {
  className?: string
  children?: React.ReactNode
}

const SheetFooter = React.forwardRef<HTMLDivElement, SheetFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-end gap-3 p-4 border-t border-gray-100", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SheetFooter.displayName = "SheetFooter"

export interface SheetCloseProps {
  onClose?: () => void
  className?: string
  children?: React.ReactNode
}

const SheetClose: React.FC<SheetCloseProps> = ({ onClose, className, children }) => (
  <button
    onClick={onClose}
    className={cn(
      "absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors",
      className
    )}
  >
    {children || <X className="w-5 h-5 text-gray-500" />}
  </button>
)
SheetClose.displayName = "SheetClose"

export { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetContent, SheetFooter, SheetClose }
