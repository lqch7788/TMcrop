import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui'
import { Button } from '@/components/ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LaborModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showClose?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] max-h-[95vh]',
}

export function LaborModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  showClose = true,
  className,
}: LaborModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'rounded-xl',
          sizeClasses[size],
          className
        )}
        showClose={showClose}
      >
        {showClose && (
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">关闭</span>
          </button>
        )}

        {(title || description) && (
          <DialogHeader className={cn(!showClose && 'pr-8')}>
            {title && <DialogTitle className="text-xl">{title}</DialogTitle>}
            {description && (
              <DialogDescription className="text-gray-500">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}

        <div className="py-4">{children}</div>

        {footer && (
          <DialogFooter className="border-t pt-4">{footer}</DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// 带确定/取消按钮的确认弹窗
export interface LaborConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  content: React.ReactNode
  onConfirm?: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'default' | 'destructive'
  loading?: boolean
}

export function LaborConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  content,
  onConfirm,
  onCancel,
  confirmText = '确定',
  cancelText = '取消',
  confirmVariant = 'default',
  loading = false,
}: LaborConfirmModalProps) {
  return (
    <LaborModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              onCancel?.()
              onOpenChange(false)
            }}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={() => {
              onConfirm?.()
            }}
            disabled={loading}
          >
            {loading ? '处理中...' : confirmText}
          </Button>
        </div>
      }
    >
      {content}
    </LaborModal>
  )
}
