/**
 * 施肥/用药记录行卡组件（2026-06-28：每日记录子表）
 *
 * 设计要点：
 * - 折叠态：只显示名称+类型摘要 + ✕删除
 * - 展开态：完整 6 字段表单 + 药剂特有两个字段条件渲染
 * - 行卡内联编辑，不嵌套弹窗（操作深度最浅）
 * - 受控组件：value + onChange 由父组件管理（便于父组件序列化到 JSON）
 */
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { ChevronDown, ChevronRight, X, Search } from 'lucide-react'
import {
  PESTICIDE_CATEGORY_MAP,
  DILUTION_TYPE_MAP,
  FEED_UNIT_MAP,
} from '@/constants/cropConstants'
import { useFertilizerLibraryStore, usePesticideLibraryStore, useDictionaryStore } from '@/stores'
// 2026-07-15: 施肥类型使用库表对齐的常量（之前用基肥/追肥不匹配后端 fertilizer_type）
import { FERTILIZER_TYPE_OPTIONS } from '../../../settings/fertilizer-library/constants'

// 施肥方式字典 key（与 FertilizerPoolEditor 一致）
const METHOD_DICT_KEY = 'fertilization_method'

// 通用行卡 item（兼容施肥和用药的并集类型）
export interface FeedRecordItem {
  id: string
  name: string
  category: string
  amount: number | undefined
  unit: string
  dilution?: number
  dilutionType: 'dilute' | 'dry'
  applicationMethod: string
  notes?: string
  // 2026-07-15：选择库中肥料后自动填充完整信息（用于折叠头部显示 + 费用统计）
  brandName?: string
  unitPrice?: number
  fertilizerCode?: string
  specContent?: string
  stockQuantity?: number
  stockUnit?: string
  // 药剂特有
  safetyInterval?: number
  targetPest?: string
}

interface FeedRecordCardProps {
  /** 行卡模式：fertilizer=施肥 / pesticide=用药 */
  mode: 'fertilizer' | 'pesticide'
  /** 行数据 */
  value: FeedRecordItem
  /** 变更回调 */
  onChange: (next: FeedRecordItem) => void
  /** 删除回调 */
  onRemove: () => void
  /** 是否默认展开 */
  defaultExpanded?: boolean
}

// 2026-07-15: 施肥类型改用 FERTILIZER_TYPE_OPTIONS（与 fertilizer_specs.fertilizer_type 对齐）
const FERTILIZER_TYPE_MAP: Record<string, string> = Object.fromEntries(
  FERTILIZER_TYPE_OPTIONS.map(({ value, label }) => [value, label])
)
const CATEGORY_MAP = {
  fertilizer: FERTILIZER_TYPE_MAP,
  pesticide: PESTICIDE_CATEGORY_MAP,
}

export function FeedRecordCard({
  mode,
  value,
  onChange,
  onRemove,
  defaultExpanded = false,
}: FeedRecordCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded || !value.name)
  const [showNameDropdown, setShowNameDropdown] = useState(false)
  const [nameSearch, setNameSearch] = useState('')
  const nameDropdownRef = useRef<HTMLDivElement>(null)
  const categoryMap = CATEGORY_MAP[mode]

  // 加载肥料库 / 药剂库（挂载时加载）
  const fertLibStore = useFertilizerLibraryStore()
  const pestLibStore = usePesticideLibraryStore()
  const dictStore = useDictionaryStore()
  useEffect(() => {
    fertLibStore.fetchItems?.()
    pestLibStore.fetchItems?.()
    dictStore.refreshDictionaries?.()
  }, [])

  // 施肥方式字典（与 FertilizerPoolEditor 一致）
  const methodItems = useMemo(() =>
    dictStore.dictionaries.filter((d: any) => (d.categoryCode || d.category) === METHOD_DICT_KEY),
  [dictStore.dictionaries])

  // 当前模式对应的库
  const libraryItems = mode === 'fertilizer' ? (fertLibStore.items || []) : (pestLibStore.items || [])

  // 按类型过滤后的名称列表（2026-07-15：fertilizerType 单值匹配 / pesticideType JSON 数组包含匹配）
  const filteredNames = useMemo(() => {
    let items = libraryItems.filter((s: any) => s.status === 'active' || !s.status)
    if (value.category) {
      items = items.filter((s: any) => {
        if (mode === 'fertilizer') {
          return s.fertilizerType === value.category
        }
        // 2026-07-15：pesticide_type 可能是 JSON 数组/单值/逗号串，统一解析为数组
        let types: string[] = []
        const pt = s.pesticideType
        if (Array.isArray(pt)) types = pt
        else if (typeof pt === 'string') {
          try { types = JSON.parse(pt) } catch { types = pt.split(',').map((t: string) => t.trim()).filter(Boolean) }
        }
        // 匹配：类型以 category 开头（如 insecticide 匹配 insecticide_sucking）
        return types.some((t: string) => t === value.category || t.startsWith(value.category))
      })
    }
    const kw = nameSearch.trim().toLowerCase()
    if (kw) {
      items = items.filter((s: any) =>
        (s.fertilizerName || '').toLowerCase().includes(kw) ||
        (s.pesticideName || '').toLowerCase().includes(kw) ||
        ((s.brandName || '') || '').toLowerCase().includes(kw)
      )
    }
    return items
  }, [libraryItems, value.category, nameSearch, mode])

  // 选择名称后自动填充（名称 + 单位 + 完整库信息）— 2026-07-15 参照施肥管理弹窗
  const handleSelectName = useCallback((item: any) => {
    const name = mode === 'fertilizer' ? item.fertilizerName : item.pesticideName
    onChange({
      ...value,
      name,
      // 自动填充单位（保留用户已选手动值优先）
      unit: value.unit || item.dosageUnit || item.stockUnit || (mode === 'fertilizer' ? 'kg' : 'L'),
      // 自动填充完整库信息（用于折叠头部显示 + 费用统计）
      brandName: item.brandName || undefined,
      unitPrice: item.unitPrice || undefined,
      fertilizerCode: mode === 'fertilizer' ? (item.fertilizerCode || undefined) : undefined,
      specContent: mode === 'fertilizer' ? (item.specContent || undefined) : undefined,
      stockQuantity: item.stockQuantity || undefined,
      stockUnit: item.stockUnit || undefined,
    })
    setNameSearch('')
    setShowNameDropdown(false)
  }, [mode, value, onChange])

  // 点击外部关闭
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (nameDropdownRef.current && !nameDropdownRef.current.contains(e.target as Node)) {
        setShowNameDropdown(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // 折叠头部摘要（2026-07-15：选中肥料后显示完整信息，参照施肥管理弹窗）
  const summary = (() => {
    if (!value.name) return '（未命名）'
    if (mode === 'fertilizer' && value.fertilizerCode) {
      // 施肥模式：多行显示完整信息
      return value.name
    }
    return `${value.name} · ${categoryMap[value.category] || value.category || '未分类'}`
  })()

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* 折叠/展开头部（选中肥料后显示完整信息） */}
      <div
        className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          {mode === 'fertilizer' && value.fertilizerCode ? (
            // 施肥模式：折叠态多行完整信息（名称+编码+类型+品牌规格+单价+库存）
            <div className="space-y-0.5">
              <div className="font-medium text-sm text-gray-800">{value.name}</div>
              <div className="text-xs text-gray-400">{value.fertilizerCode}</div>
              <div className="text-xs text-gray-500">
                {categoryMap[value.category] || value.category || ''}
                {value.brandName && ` · ${value.brandName}`}
                {value.specContent && ` · ${value.specContent}`}
              </div>
              <div className="text-xs">
                {value.unitPrice > 0 && <span className="text-amber-600 mr-2">¥{Number(value.unitPrice).toFixed(2)}</span>}
                <span className={Number(value.stockQuantity || 0) > 0 ? 'text-emerald-600' : 'text-red-400'}>
                  库存 {Number(value.stockQuantity || 0).toFixed(1)} {value.stockUnit || 'kg'}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-700 truncate block" title={summary}>
              {summary}
            </span>
          )}
        </div>
        {value.amount != null && value.amount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            {value.amount} {FEED_UNIT_MAP[value.unit] || value.unit}
            {value.dilutionType === 'dilute' && value.dilution ? ` × ${value.dilution}倍` : ''}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded p-1 shrink-0 transition-colors"
          title="删除此行"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 展开态：完整表单（2026-06-28：4 字段一行布局，与数量统计面板一致） */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-gray-100 bg-gray-50/30 relative" style={{ overflow: 'visible' }}>
          {/* 第 1 行：类型 + 名称 + 用量 + 单位（2026-07-15：类型移到名称前面，名称改为下拉选择） */}
          <div className="grid grid-cols-4 gap-2" style={{ overflow: 'visible' }}>
            <div>
              <Label className="text-xs text-gray-600 mb-1">
                {mode === 'fertilizer' ? '肥料类型' : '药剂类型'}
              </Label>
              <Select
                value={value.category || Object.keys(categoryMap)[0]}
                onValueChange={(v) => onChange({ ...value, category: v, name: '', unit: mode === 'fertilizer' ? 'kg' : 'L', brandName: undefined, unitPrice: undefined })}
              >
                <SelectTrigger className="h-8 text-sm border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryMap).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative" ref={nameDropdownRef} style={{ zIndex: 50 }}>
              <Label className="text-xs text-gray-600 mb-1">
                {mode === 'fertilizer' ? '肥料名称' : '药剂名称'} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <Input
                  value={showNameDropdown ? nameSearch : value.name}
                  onChange={(e) => { setNameSearch(e.target.value); setShowNameDropdown(true) }}
                  onFocus={() => { setNameSearch(''); setShowNameDropdown(true) }}
                  placeholder={mode === 'fertilizer' ? '搜索肥料名称' : '搜索药剂名称'}
                  className="h-8 pl-7 text-sm border-gray-300"
                />
                {value.name && !showNameDropdown && (
                  <button onClick={() => { onChange({ ...value, name: '' }); setShowNameDropdown(true) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {/* 名称下拉 — z-50 防止被下方字段遮挡 */}
              {showNameDropdown && filteredNames.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {filteredNames.map((item: any) => {
                    const id = item.id
                    const name = mode === 'fertilizer' ? item.fertilizerName : item.pesticideName
                    return (
                      <button
                        key={id}
                        onClick={() => handleSelectName(item)}
                        className="w-full text-left px-3 py-2 hover:bg-amber-50 border-b border-gray-50 last:border-b-0 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-gray-800 truncate">{name}</span>
                          {item.brandName && (
                            <span className="text-gray-500 shrink-0">{item.brandName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.unitPrice > 0 && (
                            <span className="text-amber-600">¥{Number(item.unitPrice).toFixed(2)}</span>
                          )}
                          <span className={Number(item.stockQuantity || 0) > 0 ? 'text-emerald-600' : 'text-red-400'}>
                            库存 {Number(item.stockQuantity || 0).toFixed(1)} {item.stockUnit || (mode === 'fertilizer' ? 'kg' : 'L')}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {showNameDropdown && nameSearch && filteredNames.length === 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl px-3 py-2 text-xs text-gray-500">
                  无匹配项，可手动在详细中输入
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1">
                用量 <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={value.amount ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    amount: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="如：10"
                className="h-8 text-sm border-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1">单位</Label>
              <Select
                value={value.unit || 'g'}
                onValueChange={(v) => onChange({ ...value, unit: v })}
              >
                <SelectTrigger className="h-8 text-sm border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FEED_UNIT_MAP).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 第 1.5 行：品牌 + 单价 + 费用（2026-07-15：选择肥料后自动显示，支持费用统计） */}
          {mode === 'fertilizer' && value.name && (
            <div className="grid grid-cols-3 gap-2 bg-amber-50/50 border border-amber-100 rounded-lg px-3 py-2">
              <div className="text-xs">
                <span className="text-gray-500">品牌：</span>
                <span className="text-gray-800 font-medium">{value.brandName || '-'}</span>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">单价：</span>
                <span className="text-amber-700 font-medium">
                  {value.unitPrice ? `¥${Number(value.unitPrice).toFixed(2)}` : '-'}
                </span>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">费用：</span>
                <span className="text-emerald-700 font-bold">
                  {value.amount && value.unitPrice
                    ? `¥${(value.amount * value.unitPrice).toFixed(2)}`
                    : '-'}
                </span>
              </div>
            </div>
          )}

          {/* 第 2 行：稀释比例 + 施肥方式 + 备注（2026-07-15：删除稀释方式字段，施用→施肥） */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-gray-600 mb-1">
                稀释比例 {value.dilutionType === 'dry' && <span className="text-gray-400">（干施不需要）</span>}
              </Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={value.dilution ?? ''}
                disabled={value.dilutionType === 'dry'}
                onChange={(e) =>
                  onChange({
                    ...value,
                    dilution: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="如：800"
                className="h-8 text-sm border-gray-300 disabled:bg-gray-100"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1">施肥方式</Label>
              <Select
                value={value.applicationMethod || (methodItems[0]?.dictCode || methodItems[0]?.dict_code || '')}
                onValueChange={(v) => onChange({ ...value, applicationMethod: v })}
              >
                <SelectTrigger className="h-8 text-sm border-gray-300">
                  <SelectValue placeholder="选择方式" />
                </SelectTrigger>
                <SelectContent>
                  {methodItems.length > 0 ? (
                    methodItems.map((m: any) => (
                      <SelectItem key={m.dictCode || m.dict_code} value={m.dictCode || m.dict_code}>
                        {m.dictLabel || m.dict_label}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="spray">喷施</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1">备注</Label>
              <Input
                value={value.notes || ''}
                onChange={(e) => onChange({ ...value, notes: e.target.value })}
                placeholder="可选"
                className="h-8 text-sm border-gray-300"
              />
            </div>
          </div>

          {/* 第 3 行（药剂特有）：防治对象 + 安全间隔期 + 占位 + 占位（4 字段一行，保持对齐） */}
          {mode === 'pesticide' && (
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs text-gray-600 mb-1">防治对象</Label>
                <Input
                  value={value.targetPest || ''}
                  onChange={(e) => onChange({ ...value, targetPest: e.target.value })}
                  placeholder="如：白粉病 / 蚜虫"
                  className="h-8 text-sm border-gray-300"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1">
                  安全间隔期（天）<span className="text-gray-400">— 决定何时可采收</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={value.safetyInterval ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      safetyInterval: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="如：7"
                  className="h-8 text-sm border-gray-300"
                />
              </div>
              {/* 2 个占位列，保持 4 列对齐 */}
              <div></div>
              <div></div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}