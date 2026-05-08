/**
 * List 列表组件
 * 通用的列表渲染组件，支持自定义渲染函数
 */
import * as React from "react"
import { cn } from "@/lib/utils"

export interface ListProps<T = any> extends React.HTMLAttributes<HTMLUListElement> {
  dataSource: T[]
  renderItem: (item: T, index: number) => React.ReactNode
}

function List<T = any>(
  { dataSource, renderItem, className, ...props }: ListProps<T>,
  ref: React.Ref<HTMLUListElement>
) {
  return (
    <ul
      ref={ref}
      className={cn("space-y-1", className)}
      {...props}
    >
      {dataSource.map((item, index) => (
        <li key={index}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  )
}

List.displayName = "List"

export { List }
