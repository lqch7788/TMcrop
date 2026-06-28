/**
 * 繁殖事件行卡组件（2026-06-28：方案B 合并繁殖记录到每日记录）
 *
 * 设计要点：
 * - 仅 1:多 模式有意义，记录母株产生匍匐茎苗/扦插/组培/分株的事件
 * - 折叠态：摘要显示「母株+X / 子苗+Y · 健康」+ ✕删除
 * - 展开态：4 字段一行（母株变化/子苗产出/子苗状态/备注）
 * - 已移除"移栽位置"字段（2026-06-28 业务规则：统一从作物库存出库统计）
 * - 受控组件：value + onChange 由父组件管理（便于父组件序列化到 JSON）
 */
import React, { useState } from 'react'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { PROPAGATION_STATUS_MAP } from '@/constants/cropConstants'

export interface PropagationEventItem {
  id: string
  motherChange?: number | undefined
  seedlingOutput?: number | undefined
  seedlingStatus?: 'healthy' | 'weak' | 'diseased' | undefined
  remarks?: string
}

interface PropagationEventCardProps {
  /** 行数据 */
  value: PropagationEventItem
  /** 变更回调 */
  onChange: (next: PropagationEventItem) => void
  /** 删除回调 */
  onRemove: () => void
  /** 是否默认展开 */
  defaultExpanded?: boolean
}

export function PropagationEventCard({
  value,
  onChange,
  onRemove,
  defaultExpanded = false,
}: PropagationEventCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded || !value.motherChange && !value.seedlingOutput)
  // 摘要：母株+X 株 / 子苗+Y 株 · 健康/弱苗/病害
  const summaryParts: string[] = []
  if (value.motherChange != null && value.motherChange !== 0) {
    summaryParts.push(`母株${value.motherChange > 0 ? '+' : ''}${value.motherChange} 株`)
  }
  if (value.seedlingOutput != null && value.seedlingOutput !== 0) {
    summaryParts.push(`子苗+${value.seedlingOutput} 株`)
  }
  const statusLabel = value.seedlingStatus ? PROPAGATION_STATUS_MAP[value.seedlingStatus] : ''
  if (statusLabel) summaryParts.push(statusLabel)
  const summary = summaryParts.length > 0 ? summaryParts.join(' · ') : '（未填写）'

  return (
    <div className="border border-indigo-200 rounded-lg bg-white overflow-hidden">
      {/* 折叠/展开头部 */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-indigo-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-indigo-500 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-indigo-500 shrink-0" />
        )}
        <span className="text-sm text-gray-700 flex-1 truncate" title={summary}>
          {summary}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded p-1 shrink-0 transition-colors"
          title="删除此事件"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 展开态：完整表单（4 字段一行） */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-gray-100 bg-indigo-50/20">
          {/* 4 字段一行：母株变化 + 子苗产出 + 子苗状态 + 备注 */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label className="text-xs text-gray-600 mb-1">
                母株变化 <span className="text-gray-400">（株）</span>
              </Label>
              <Input
                type="number"
                value={value.motherChange ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    motherChange: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="如：1（新增/减少）"
                className="h-8 text-sm border-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1">
                子苗产出 <span className="text-gray-400">（株）</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={value.seedlingOutput ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    seedlingOutput: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="如：50（匍匐茎/扦插/组培）"
                className="h-8 text-sm border-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1">子苗状态</Label>
              <Select
                value={value.seedlingStatus || 'healthy'}
                onValueChange={(v) =>
                  onChange({ ...value, seedlingStatus: v as 'healthy' | 'weak' | 'diseased' })
                }
              >
                <SelectTrigger className="h-8 text-sm border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROPAGATION_STATUS_MAP).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1">备注</Label>
              <Input
                value={value.remarks || ''}
                onChange={(e) => onChange({ ...value, remarks: e.target.value })}
                placeholder="可选"
                className="h-8 text-sm border-gray-300"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}