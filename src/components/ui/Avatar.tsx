/**
 * Avatar 头像
 * 用户头像展示
 */
import * as React from "react"
import { cn } from "@/lib/utils"

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'
export type AvatarStatus = 'online' | 'offline' | 'away'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  name?: string
  size?: AvatarSize
  status?: AvatarStatus
  shape?: 'circle' | 'square'
}

const sizeMap: Record<AvatarSize, { container: string; text: string; status: string }> = {
  sm: { container: 'w-8 h-8', text: 'text-xs', status: 'w-2 h-2' },
  md: { container: 'w-10 h-10', text: 'text-sm', status: 'w-2.5 h-2.5' },
  lg: { container: 'w-12 h-12', text: 'base', status: 'w-3 h-3' },
  xl: { container: 'w-16 h-16', text: 'lg', status: 'w-4 h-4' }
}

const statusColors: Record<AvatarStatus, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500'
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, name, size = 'md', status, shape = 'circle', className, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false)

    const config = sizeMap[size]
    const initials = name
      ? name
          .split(' ')
          .map(n => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : '?'

    const showImage = src && !imageError

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden bg-gray-100",
          config.container,
          shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          className
        )}
        {...props}
      >
        {showImage ? (
          <img
            src={src}
            alt={name || 'avatar'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className={cn("font-medium text-gray-600", config.text)}>
            {initials}
          </span>
        )}

        {/* 状态指示器 */}
        {status && (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full border-2 border-white",
              config.status,
              statusColors[status]
            )}
          />
        )}
      </div>
    )
  }
)
Avatar.displayName = "Avatar"

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number
  children: React.ReactNode
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({
  max = 4,
  children,
  className,
  ...props
}) => {
  const childArray = React.Children.toArray(children)
  const visibleAvatars = childArray.slice(0, max)
  const remainingCount = childArray.length - max

  return (
    <div
      className={cn("flex -space-x-2", className)}
      {...props}
    >
      {visibleAvatars.map((child, index) => (
        <div
          key={index}
          className="ring-2 ring-white rounded-full"
        >
          {child}
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={cn(
            "ring-2 ring-white rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600",
            sizeMap.md.container
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}
AvatarGroup.displayName = "AvatarGroup"

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, ...props }, ref) => (
    <img
      ref={ref}
      className={cn("w-full h-full object-cover", className)}
      {...props}
    />
  )
)
AvatarImage.displayName = "AvatarImage"

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {}

const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("font-medium text-gray-600", className)}
      {...props}
    />
  )
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarGroup, AvatarImage, AvatarFallback }
