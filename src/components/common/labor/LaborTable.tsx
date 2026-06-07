import React, { useState } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui'
import { Checkbox } from '@/components/ui'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { Pagination } from '@/components/ui'
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
  title?: string
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
  title,
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
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {/* 表格标题栏 */}
        {title && (
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                {selectable && (
                  <TableHead className="w-12 px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                    <Checkbox checked={allSelected} ref={(el) => {
                      if (el) el.checked = allSelected
                    }} onCheckedChange={handleSelectAll} />
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    style={{ width: col.width }}
                    className={cn(
                      'px-4 py-3 text-left text-sm font-semibold whitespace-nowrap text-white',
                      col.sortable && 'cursor-pointer select-none'
                    )}
                    onClick={() => handleSort(col.key, col.sortable)}
                  >
                    <div className="flex items-center gap-1">
                      {col.title}
                      {col.sortable && sortConfig?.key === col.key && (
                        <span>
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
            <TableBody className="divide-y divide-gray-100">
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
                      className="hover:bg-blue-100 transition-colors"
                    >
                      {selectable && (
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectRow(row)}
                          />
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell key={col.key} className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
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
          <Pagination
            currentPage={pagination.page}
            totalPages={totalPages}
            pageSize={pagination.pageSize}
            onPageChange={(page) => onPageChange?.(page)}
            onPageSizeChange={(size) => onPageSizeChange?.(size)}
            pageSizeOptions={pageSizeOptions}
            showPageSize
          />
        )}
      </div>
    </div>
  )
}
