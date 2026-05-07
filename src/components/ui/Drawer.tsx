/**
 * Drawer 抽屉面板
 * 从右侧滑出的面板，用于详情展示、编辑等
 */
import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DrawerProps {
  open?: boolean
  onClose?: () => void
  children?: React.ReactNode
  className?: string
}

const Drawer = React.forwardRef<HTMLDivElement, DrawerProps>(
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

        {/* 抽屉内容 */}
        <div
          ref={ref}
          className={cn(
            "fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl transition-transform duration-300 ease-out",
            "translate-x-0",
            className
          )}
        >
          {children}
        </div>
      </div>
    )
  }
)
Drawer.displayName = "Drawer"

export interface DrawerHeaderProps {
  className?: string
  children?: React.ReactNode
}

const DrawerHeader = React.forwardRef<HTMLDivElement, DrawerHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-2 p-6 pb-0", className)}
      {...props}
    >
      {children}
    </div>
  )
)
DrawerHeader.displayName = "DrawerHeader"

export interface DrawerTitleProps {
  className?: string
  children?: React.ReactNode
}

const DrawerTitle = React.forwardRef<HTMLHeadingElement, DrawerTitleProps>(
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
DrawerTitle.displayName = "DrawerTitle"

export interface DrawerDescriptionProps {
  className?: string
  children?: React.ReactNode
}

const DrawerDescription = React.forwardRef<HTMLParagraphElement, DrawerDescriptionProps>(
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
DrawerDescription.displayName = "DrawerDescription"

export interface DrawerContentProps {
  className?: string
  children?: React.ReactNode
}

const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex-1 overflow-y-auto p-6", className)}
      {...props}
    >
      {children}
    </div>
  )
)
DrawerContent.displayName = "DrawerContent"

export interface DrawerFooterProps {
  className?: string
  children?: React.ReactNode
}

const DrawerFooter = React.forwardRef<HTMLDivElement, DrawerFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-end gap-3 p-6 pt-4 border-t border-gray-100", className)}
      {...props}
    >
      {children}
    </div>
  )
)
DrawerFooter.displayName = "DrawerFooter"

export interface DrawerCloseProps {
  onClose?: () => void
  className?: string
  children?: React.ReactNode
}

const DrawerClose: React.FC<DrawerCloseProps> = ({ onClose, className, children }) => (
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
DrawerClose.displayName = "DrawerClose"

export { Drawer, DrawerHeader, DrawerTitle, DrawerDescription, DrawerContent, DrawerFooter, DrawerClose }
