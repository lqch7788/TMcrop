/**
 * Notification 通知提醒
 * 页面右上角弹出通知
 */
import * as React from "react"
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export type NotificationVariant = 'success' | 'warning' | 'error' | 'info'

export interface Notification {
  id: string
  title: string
  description?: string
  variant?: NotificationVariant
  duration?: number
}

export interface NotificationContextValue {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = React.createContext<NotificationContextValue | undefined>(undefined)

export interface NotificationProviderProps {
  children: React.ReactNode
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  maxNotifications?: number
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  position = 'top-right',
  maxNotifications = 5
}) => {
  const [notifications, setNotifications] = React.useState<Notification[]>([])

  const addNotification = React.useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newNotification: Notification = { ...notification, id }

    setNotifications(prev => {
      const updated = [newNotification, ...prev]
      return updated.slice(0, maxNotifications)
    })

    // 自动消失
    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id)
      }, notification.duration || 3000)
    }
  }, [maxNotifications])

  const removeNotification = React.useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAll = React.useCallback(() => {
    setNotifications([])
  }, [])

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}

      {/* 通知容器 */}
      <div className={cn("fixed z-[100] flex flex-col gap-2 w-full max-w-sm", positionClasses[position])}>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export const useNotification = () => {
  const context = React.useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}

interface NotificationItemProps {
  notification: Notification
  onClose: () => void
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose }) => {
  const { variant = 'info', title, description } = notification

  const config = {
    success: { bg: 'bg-white', border: 'border-green-200', icon: CheckCircle, iconColor: 'text-green-600' },
    warning: { bg: 'bg-white', border: 'border-orange-200', icon: AlertTriangle, iconColor: 'text-orange-600' },
    error: { bg: 'bg-white', border: 'border-red-200', icon: AlertCircle, iconColor: 'text-red-600' },
    info: { bg: 'bg-white', border: 'border-blue-200', icon: Info, iconColor: 'text-blue-600' }
  }

  const { bg, border, icon: Icon, iconColor } = config[variant]

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border shadow-lg",
        "animate-in slide-in-from-right fade-in duration-300",
        bg,
        border
      )}
      role="alert"
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0", iconColor)} />

      <div className="flex-1 min-w-0">
        {title && (
          <p className="text-sm font-medium text-gray-900">{title}</p>
        )}
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>

      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  )
}

export { NotificationContext }
