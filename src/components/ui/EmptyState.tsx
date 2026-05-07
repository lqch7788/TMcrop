/**
 * EmptyState 空状态
 * 无数据时展示的空状态占位
 */
import * as React from "react"
import { Inbox, FileText, Search, Package, Users } from "lucide-react"
import { cn } from "@/lib/utils"

export type EmptyStateType = 'default' | 'search' | 'data' | 'file' | 'product' | 'user'

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  image?: string
  type?: EmptyStateType
}

const defaultIcons: Record<EmptyStateType, React.ReactElement> = {
  default: <Inbox className="w-12 h-12" />,
  search: <Search className="w-12 h-12" />,
  data: <Package className="w-12 h-12" />,
  file: <FileText className="w-12 h-12" />,
  product: <Package className="w-12 h-12" />,
  user: <Users className="w-12 h-12" />
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  image,
  type = 'default',
  className,
  ...props
}) => {
  const defaultIcon = defaultIcons[type]

  return (
    <div
      ref={React.useRef(null)}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
      {...props}
    >
      {/* 图标/图片 */}
      <div className="mb-4">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-24 h-24 object-contain opacity-50"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            {icon || defaultIcon}
          </div>
        )}
      </div>

      {/* 标题 */}
      <h3 className="text-lg font-medium text-gray-900 mb-1">
        {title}
      </h3>

      {/* 描述 */}
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-4">
          {description}
        </p>
      )}

      {/* 操作按钮 */}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  )
}

EmptyState.displayName = "EmptyState"

export { EmptyState }
