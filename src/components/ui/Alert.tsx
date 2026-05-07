/**
 * Alert 警告提示
 * 展示重要提示信息
 */
import * as React from "react"
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export type AlertVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  title?: string
  description?: string
  action?: React.ReactNode
  onClose?: () => void
}

const alertVariants: Record<AlertVariant, { bg: string; border: string; icon: React.ElementType; iconColor: string }> = {
  default: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: Info,
    iconColor: 'text-gray-500'
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: CheckCircle,
    iconColor: 'text-green-600'
  },
  warning: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: AlertTriangle,
    iconColor: 'text-orange-600'
  },
  destructive: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: AlertCircle,
    iconColor: 'text-red-600'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Info,
    iconColor: 'text-blue-600'
  }
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'default', title, description, action, onClose, className, ...props }, ref) => {
    const config = alertVariants[variant]
    const Icon = config.icon

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex gap-3 p-4 rounded-lg border",
          config.bg,
          config.border,
          className
        )}
        role="alert"
        {...props}
      >
        <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.iconColor)} />

        <div className="flex-1 space-y-1">
          {title && (
            <h4 className="text-sm font-medium text-gray-900">
              {title}
            </h4>
          )}
          {description && (
            <p className="text-sm text-gray-600">
              {description}
            </p>
          )}
          {action && (
            <div className="pt-2">
              {action}
            </div>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded hover:bg-black/5 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    )
  }
)
Alert.displayName = "Alert"

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className, ...props }, ref) => (
    <h4
      ref={ref}
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  )
)
AlertTitle.displayName = "AlertTitle"

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-gray-600", className)}
      {...props}
    />
  )
)
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
