/**
 * Breadcrumb 面包屑导航
 * 显示当前位置导航路径
 */
import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const Breadcrumb = React.forwardRef<HTMLDivElement, BreadcrumbProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center", className)}
      {...props}
    >
      {children}
    </div>
  )
)
Breadcrumb.displayName = "Breadcrumb"

export interface BreadcrumbListProps extends React.HTMLAttributes<HTMLOlElement> {}

const BreadcrumbList = React.forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({ className, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn("flex items-center flex-wrap gap-2", className)}
      {...props}
    />
  )
)
BreadcrumbList.displayName = "BreadcrumbList"

export interface BreadcrumbItemProps extends React.HTMLAttributes<HTMLLiElement> {}

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, ...props }, ref) => (
    <li
      ref={ref}
      className={cn("inline-flex items-center", className)}
      {...props}
    />
  )
)
BreadcrumbItem.displayName = "BreadcrumbItem"

export interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean
}

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ className, asChild, ...props }, ref) => (
    <a
      ref={ref}
      className={cn(
        "text-sm text-gray-500 hover:text-gray-900 transition-colors",
        className
      )}
      {...props}
    />
  )
)
BreadcrumbLink.displayName = "BreadcrumbLink"

export interface BreadcrumbPageProps extends React.HTMLAttributes<HTMLSpanElement> {}

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, BreadcrumbPageProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("text-sm font-medium text-gray-900", className)}
      aria-current="page"
      {...props}
    />
  )
)
BreadcrumbPage.displayName = "BreadcrumbPage"

export interface BreadcrumbSeparatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode
}

const BreadcrumbSeparator: React.FC<BreadcrumbSeparatorProps> = ({
  className,
  children,
  ...props
}) => (
  <span
    className={cn("text-gray-400", className)}
    {...props}
  >
    {children || <ChevronRight className="w-4 h-4" />}
  </span>
)
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator }
