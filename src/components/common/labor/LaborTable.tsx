import React, { useState } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 列配置类型
export interface Column<T> {
  key: string
  title: string
  width?: string
  sortable?: boolean
  render?: (row: T, index: number) => React.ReactNode
}

// 排序配置
export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

// 分页配置
export interface PaginationConfig {
  page: number
  pageSize: number
  total: number
  pageSizeOptions?: number[]
}

export interface LaborTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: keyof T | ((row: T) => string)
  selectable?: boolean
  selectedRows?: string[]
  onSelectionChange?: (selectedKeys: string[]) => void
  sortConfig?: SortConfig
  onSort?: (config: SortConfig) => void
  pagination?: PaginationConfig
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  loading?: boolean
  emptyText?: string
  className?: string
}

export function LaborTable<T>({
  columns,
  data,
  rowKey,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  sortConfig,
  onSort,
  pagination,
  onPageChange,
  onPageSizeChange,
  loading = false,
  emptyText = '暂无数据',
  className,
}: LaborTableProps<T>) {
  // 全选状态
  const allSelected = data.length > 0 && data.every((row) => {
    const key = typeof rowKey === 'function' ? rowKey(row) : String(row[rowKey])
    return selectedRows.includes(key)
  })
  const someSelected = selectedRows.length > 0 && !allSelected

  // 处理全选
  const handleSelectAll = () => {
    if (!onSelectionChange) return
    if (allSelected) {
      onSelectionChange([])
    } else {
      const allKeys = data.map((row) => {
        const key = typeof rowKey === 'function' ? rowKey(row) : String(row[rowKey])
        return key
      })
      onSelectionChange(allKeys)
    }
  }

  // 处理单行选择
  const handleSelectRow = (row: T) => {
    if (!onSelectionChange) return
    const key = typeof rowKey === 'function' ? rowKey(row) : String(row[rowKey])
    if (selectedRows.includes(key)) {
      onSelectionChange(selectedRows.filter((k) => k !== key))
    } else {
      onSelectionChange([...selectedRows, key])
    }
  }

  // 处理排序
  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable || !onSort) return
    if (sortConfig?.key === key) {
      if (sortConfig.direction === 'asc') {
        onSort({ key, direction: 'desc' })
      } else {
        onSort({ key, direction: 'asc' })
      }
    } else {
      onSort({ key, direction: 'asc' })
    }
  }

  // 计算分页
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1
  const pageSizeOptions = pagination?.pageSizeOptions || [10, 20, 50, 100]

  return (
    <div className={cn('flex flex-col', className)}>
      {/* 表格 */}
      <div className="overflow-auto rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox checked={allSelected} ref={(el) => {
                    if (el) el.checked = allSelected
                  }} onCheckedChange={handleSelectAll} />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(col.sortable && 'cursor-pointer select-none')}
                  onClick={() => handleSort(col.key, col.sortable)}
                >
                  <div className="flex items-center gap-1">
                    {col.title}
                    {col.sortable && sortConfig?.key === col.key && (
                      <span className="text-emerald-600">
                        {sortConfig.direction === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="h-32 text-center text-gray-500">
                  加载中...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="h-32 text-center text-gray-500">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => {
                const rowKeyValue = typeof rowKey === 'function' ? rowKey(row) : String(row[rowKey])
                const isSelected = selectedRows.includes(rowKeyValue)
                return (
                  <TableRow
                    key={rowKeyValue}
                    data-state={isSelected ? 'selected' : undefined}
                    className={cn(isSelected && 'bg-emerald-50')}
                  >
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelectRow(row)}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        {col.render
                          ? col.render(row, index)
                          : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              共 {pagination.total} 条
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">每页</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                className="h-8 w-16 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:border-emerald-500"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500">条</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (pagination.page <= 3) {
                  pageNum = i + 1
                } else if (pagination.page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = pagination.page - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pagination.page === pageNum ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange?.(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page >= totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page >= totalPages}
              onClick={() => onPageChange?.(totalPages)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
