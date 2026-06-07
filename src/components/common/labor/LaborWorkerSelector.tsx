import React, { useState, useRef, useEffect } from 'react'
import { Search, X, Check, User } from 'lucide-react'
import { Input } from '@/components/ui'
import { Button } from '@/components/ui'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

// 工人类型
export interface Worker {
  id: string
  name: string
  code?: string
  phone?: string
  department?: string
  avatar?: string
}

// 工人选择器属性
export interface LaborWorkerSelectorProps {
  value?: string[]
  onChange?: (selectedIds: string[]) => void
  workers?: Worker[]
  placeholder?: string
  disabled?: boolean
  mode?: 'single' | 'multiple'
  className?: string
}

export function LaborWorkerSelector({
  value = [],
  onChange,
  workers = [],
  placeholder = '选择工人',
  disabled = false,
  mode = 'multiple',
  className,
}: LaborWorkerSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 过滤工人
  const filteredWorkers = workers.filter((worker) => {
    const searchLower = search.toLowerCase()
    return (
      worker.name.toLowerCase().includes(searchLower) ||
      worker.code?.toLowerCase().includes(searchLower) ||
      worker.phone?.includes(search)
    )
  })

  // 已选择的工人
  const selectedWorkers = workers.filter((w) => value.includes(w.id))

  // 切换选择
  const toggleWorker = (workerId: string) => {
    if (mode === 'single') {
      onChange?.([workerId])
      setOpen(false)
      return
    }

    if (value.includes(workerId)) {
      onChange?.(value.filter((id) => id !== workerId))
    } else {
      onChange?.([...value, workerId])
    }
  }

  // 移除已选工人
  const removeWorker = (workerId: string) => {
    onChange?.(value.filter((id) => id !== workerId))
  }

  // 打开时聚焦搜索框
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex flex-wrap items-center gap-1 min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm',
            'focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        >
          {selectedWorkers.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedWorkers.map((worker) => (
                <Badge
                  key={worker.id}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  <span className="max-w-[100px] truncate">{worker.name}</span>
                  {mode === 'multiple' && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        removeWorker(worker.id)
                      }}
                      className="cursor-pointer ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[320px] p-0" align="start">
        {/* 搜索框 */}
        <div className="relative p-2 border-b">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索工人姓名、编号、手机号..."
            className="pl-9 border-0 focus:ring-0"
          />
        </div>

        {/* 工人列表 */}
        <div className="max-h-[240px] overflow-auto">
          {filteredWorkers.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              未找到匹配的工人
            </div>
          ) : (
            <div className="p-1">
              {filteredWorkers.map((worker) => {
                const isSelected = value.includes(worker.id)
                return (
                  <button
                    key={worker.id}
                    type="button"
                    onClick={() => toggleWorker(worker.id)}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors',
                      'hover:bg-gray-100',
                      isSelected && 'bg-emerald-50'
                    )}
                  >
                    {/* 头像 */}
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      {worker.avatar ? (
                        <img
                          src={worker.avatar}
                          alt={worker.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-gray-400" />
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {worker.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {worker.code && `${worker.code}`}
                        {worker.code && worker.department && ' · '}
                        {worker.department}
                      </p>
                    </div>

                    {/* 选中状态 */}
                    {isSelected && (
                      <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
