import React, { useState } from 'react'
import { Search, Calendar, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui'
import { Button } from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { cn } from '@/lib/utils'

// 日期范围类型
export interface DateRange {
  start: Date | null
  end: Date | null
}

// 状态选项
export interface StatusOption {
  value: string
  label: string
  color?: string
}

// 筛选器配置
export interface FilterConfig {
  search?: {
    placeholder?: string
    value?: string
    onChange?: (value: string) => void
  }
  dateRange?: {
    startPlaceholder?: string
    endPlaceholder?: string
    value?: DateRange
    onChange?: (range: DateRange) => void
  }
  status?: {
    placeholder?: string
    options: StatusOption[]
    value?: string
    onChange?: (value: string) => void
  }
  customFilters?: React.ReactNode
}

export interface LaborFiltersProps {
  config: FilterConfig
  onReset?: () => void
  className?: string
}

export function LaborFilters({ config, onReset, className }: LaborFiltersProps) {
  const [localSearch, setLocalSearch] = useState(config.search?.value || '')

  // 处理搜索
  const handleSearch = (value: string) => {
    setLocalSearch(value)
    config.search?.onChange?.(value)
  }

  // 处理日期变化
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    const date = value ? new Date(value) : null
    const newRange: DateRange = {
      start: type === 'start' ? date : config.dateRange?.value?.start || null,
      end: type === 'end' ? date : config.dateRange?.value?.end || null,
    }
    config.dateRange?.onChange?.(newRange)
  }

  // 格式化日期
  const formatDate = (date: Date | null): string => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  // 是否有筛选条件
  const hasFilters = localSearch || config.dateRange?.value?.start || config.dateRange?.value?.end || config.status?.value

  return (
    <div className={cn('flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-lg', className)}>
      {/* 搜索框 */}
      {config.search && (
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={config.search.placeholder || '搜索...'}
              value={localSearch}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
            {localSearch && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 日期范围 */}
      {config.dateRange && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={formatDate(config.dateRange.value?.start || null)}
              onChange={(e) => handleDateChange('start', e.target.value)}
              placeholder={config.dateRange.startPlaceholder || '开始日期'}
              className="h-10 w-36 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <span className="text-gray-400">-</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={formatDate(config.dateRange.value?.end || null)}
              onChange={(e) => handleDateChange('end', e.target.value)}
              placeholder={config.dateRange.endPlaceholder || '结束日期'}
              className="h-10 w-36 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      {/* 状态下拉框 */}
      {config.status && (
        <div className="w-40">
          <Select
            value={config.status.value || '__all__'}
            onValueChange={(value) => config.status?.onChange?.(value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder={config.status.placeholder || '选择状态'} />
            </SelectTrigger>
            <SelectContent>
              {config.status.options.map((option) => (
                <SelectItem key={option.value} value={option.value || '__all__'}>
                  <div className="flex items-center gap-2">
                    {option.color && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 自定义筛选 */}
      {config.customFilters && (
        <div className="flex items-center gap-2">{config.customFilters}</div>
      )}

      {/* 重置按钮 */}
      {hasFilters && onReset && (
        <Button variant="ghost" onClick={onReset} className="text-gray-500">
          <X className="h-4 w-4 mr-1" />
          重置
        </Button>
      )}
    </div>
  )
}
