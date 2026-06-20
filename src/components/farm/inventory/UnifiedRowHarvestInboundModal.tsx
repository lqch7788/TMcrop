/**
 * 行级采收入库弹窗（unify-harvest-inbound-into-source-operations）
 * 2026-06-19 Phase 3
 *
 * 基于 InventoryInboundModal 模式扩展，承载原采收入库页 AddModal 全部 18 字段：
 * - harvestDate, greenhouseIds[], batchCode, harvesterIds[], auditor, remarks
 * - saleType (self_use / external_sale)
 * - isSupplementary + supplementaryReason
 * - unitPrice, unit, warehouseId
 * - products[] (种源/育苗 lock 1 条，种植 1..N)
 *
 * 弹窗 → submitUnifiedInbound → POST /api/inventory/inbound-from-source
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Modal,
  FormField,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  TextArea,
  DatePicker,
  NumberInput,
  Button,
} from '@/components/ui'
import { Sprout, Leaf, Wheat, Plus, Trash2, AlertCircle, Package, X, ChevronDown } from 'lucide-react'
import { useWarehouseStore, useInventoryStore } from '@/stores'
import { useDictionaryStore, getDictItems } from '@/stores/useDictionaryStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUserStore, getActiveUsers } from '@/stores/useUserStore'
import { todayLocal } from '@/lib/dateUtils'
import { showAlert } from '@/lib/dialogService'
import {
  submitUnifiedInbound,
  validateUnifiedInboundInput,
  type StockType,
  type SourceModule,
  type SaleType,
  type InboundProduct,
} from '@/services/unifiedHarvestInboundService'

// ============ 常量 ============

const STOCK_TYPE_LABEL: Record<StockType, { label: string; icon: React.ReactNode }> = {
  seed: { label: '种源', icon: <Sprout className="w-5 h-5 text-emerald-600" /> },
  seedling: { label: '种苗', icon: <Leaf className="w-5 h-5 text-green-600" /> },
  product: { label: '种植成品', icon: <Wheat className="w-5 h-5 text-amber-600" /> },
}

const SALE_TYPE_OPTIONS: Array<{ value: SaleType; label: string }> = [
  { value: 'self_use', label: '自用' },
  { value: 'external_sale', label: '外售' },
]

const QUALITY_GRADES = [
  { value: 'special', label: '特优' },
  { value: 'excellent', label: '优' },
  { value: 'good', label: '良' },
  { value: 'qualified', label: '合格' },
  { value: 'unqualified', label: '不合格' },
]

// 2026-06-19: 种源形态（种源行入库必填）
const PROPAGATION_FORMS = [
  { value: '种子', label: '种子' },
  { value: '种苗', label: '种苗' },
  { value: '实生苗', label: '实生苗' },
  { value: '扦插苗', label: '扦插苗' },
  { value: '嫁接苗', label: '嫁接苗' },
  { value: '组培苗', label: '组培苗' },
  { value: '分株苗', label: '分株苗' },
  { value: '种球', label: '种球' },
  { value: '球根', label: '球根' },
]

// 2026-06-19: 采收形态（每条 product 必填，区分果实/籽/枝条等）
const SOURCE_FORMS = [
  { value: '果实', label: '果实' },
  { value: '种子', label: '种子' },
  { value: '种苗', label: '种苗' },
  { value: '穗条', label: '穗条' },
  { value: '枝条', label: '枝条' },
  { value: '块根', label: '块根' },
  { value: '块茎', label: '块茎' },
  { value: '鳞茎', label: '鳞茎' },
  { value: '叶片', label: '叶片' },
  { value: '花朵', label: '花朵' },
  { value: '整株', label: '整株' },
  { value: '其他', label: '其他' },
]

const deepInputClass =
  'px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner'

// ============ Props ============

export interface UnifiedRowHarvestInboundModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  stockType: StockType
  sourceModule: SourceModule
  sourceRecord: {
    id: string
    code: string
    cropName?: string
    cropVariety?: string
    cropCode?: string
    unit?: string
    plantingMode?: string
  }
}

// ============ 主组件 ============

export const UnifiedRowHarvestInboundModal: React.FC<UnifiedRowHarvestInboundModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  stockType,
  sourceModule,
  sourceRecord,
}) => {
  // ---- 表单 state ----
  // 2026-06-19: harvestDate 用 YYYY-MM-DD string 存储（与 AddModal 采购日期字段同模式）
  const [harvestDate, setHarvestDate] = useState<string>(todayLocal())
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [warehouseName, setWarehouseName] = useState<string>('')
  const [harvesterIds, setHarvesterIds] = useState<string[]>([])
  const [harvesterNames, setHarvesterNames] = useState<string[]>([])
  // 2026-06-19: 审核员 → 操作员，默认值 = 系统登录人员姓名（realName）
  const currentUser = useAuthStore((s) => s.currentUser)
  const [operator, setOperator] = useState<string>(currentUser?.realName || '')
  // 2026-06-19: 采收员 — 用户列表 + 多选下拉
  const users = useUserStore((s) => s.users)
  const loadUsers = useUserStore((s) => s.loadUsers)
  const [harvesterPopoverOpen, setHarvesterPopoverOpen] = useState(false)
  const [remarks, setRemarks] = useState<string>('')
  const [saleType, setSaleType] = useState<SaleType>(
    stockType === 'product' ? 'external_sale' : 'self_use'
  )
  const [isSupplementary, setIsSupplementary] = useState<boolean>(false)
  const [supplementaryReason, setSupplementaryReason] = useState<string>('')
  const [unitPrice, setUnitPrice] = useState<number | string>(0)
  const [unit, setUnit] = useState<string>(sourceRecord.unit || '克')
  // 2026-06-19: 种源形态（仅种源行入库必填）
  const [propagationForm, setPropagationForm] = useState<string>('')

  // products: 种源/育苗 lock 1 条，种植允许多条
  const [products, setProducts] = useState<InboundProduct[]>([
    {
      cropCode: sourceRecord.cropCode || '',
      cropName: sourceRecord.cropName || '',
      cropVariety: sourceRecord.cropVariety || '',
      plantingMode: sourceRecord.plantingMode || '',
      harvestQuantity: 0,
      unit: sourceRecord.unit || '克',
      grade: '',
      sourceForm: '',  // 采收形态（果实/籽/枝条等）
    },
  ])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---- Store hooks ----
  const warehouses = useWarehouseStore((s: any) => s.warehouses || [])
  const loadWarehouses = useWarehouseStore((s: any) => s.loadWarehouses)
  const dictionaries = useDictionaryStore((s: any) => s.dictionaries)
  const loadDictionaries = useDictionaryStore((s: any) => s.loadDictionaries)

  // ---- 加载字典/仓库 ----
  useEffect(() => {
    if (isOpen) {
      loadWarehouses?.()
      loadDictionaries?.()
      loadUsers?.()
    }
  }, [isOpen, loadWarehouses, loadDictionaries, loadUsers])

  // ---- 重置表单 ----
  // 2026-06-19 修复：只从 false→true 切换时重置（用 ref 标记上一次 isOpen 状态），
  // 避免父组件 re-render 触发 sourceRecord 引用变化误重置已填字段
  const prevIsOpen = useRef(isOpen)
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setHarvestDate(todayLocal())
      setWarehouseId('')
      setWarehouseName('')
      setHarvesterIds([])
      setHarvesterNames([])
      setOperator(currentUser?.realName || '')
      setRemarks('')
      setSaleType(stockType === 'product' ? 'external_sale' : 'self_use')
      setIsSupplementary(false)
      setSupplementaryReason('')
      setUnitPrice(0)
      setUnit(sourceRecord.unit || '克')
      setPropagationForm('')  // 重置种源形态
      setProducts([
        {
          cropCode: sourceRecord.cropCode || '',
          cropName: sourceRecord.cropName || '',
          cropVariety: sourceRecord.cropVariety || '',
          plantingMode: sourceRecord.plantingMode || '',
          harvestQuantity: 0,
          unit: sourceRecord.unit || '克',
          grade: '',
          sourceForm: '',  // 采收形态
        },
      ])
      setError(null)
    }
    prevIsOpen.current = isOpen
  }, [isOpen, stockType, sourceRecord, currentUser])

  // ---- 字典项 ----
  const unitOptions = useMemo(() => {
    const items = getDictItems?.(dictionaries, 'unit') || []
    if (items.length > 0) {
      return items.map((it: any) => ({ value: it.dictCode, label: it.dictValue || it.dictCode }))
    }
    // 字典未加载时使用全量单位 fallback（按类型分组，覆盖种源/育苗/种植常见场景）
    return [
      // === 重量类 ===
      { value: '克', label: '克（g）' },
      { value: 'kg', label: '千克（kg）' },
      { value: '吨', label: '吨（t）' },
      { value: 'mg', label: '毫克（mg）' },
      { value: '斤', label: '斤（500g）' },
      { value: '两', label: '两（50g）' },
      // === 体积类 ===
      { value: 'ml', label: '毫升（ml）' },
      { value: '升', label: '升（L）' },
      { value: '立方米', label: '立方米（m³）' },
      // === 数量/个数类（种子/种苗/果实/包装）===
      { value: '粒', label: '粒' },
      { value: '颗', label: '颗' },
      { value: '片', label: '片' },
      { value: '块', label: '块' },
      { value: '包', label: '包' },
      { value: '袋', label: '袋' },
      { value: '盒', label: '盒' },
      { value: '箱', label: '箱' },
      { value: '件', label: '件' },
      { value: '把', label: '把' },
      { value: '串', label: '串' },
      { value: '束', label: '束' },
      { value: '双', label: '双' },
      { value: '套', label: '套' },
      { value: '个', label: '个' },
      // === 农业特有（植株/果实）===
      { value: '株', label: '株' },
      { value: '枝', label: '枝' },
      { value: '穗', label: '穗' },
      { value: '捆', label: '捆' },
      { value: '筐', label: '筐' },
      { value: '篓', label: '篓' },
      { value: '坛', label: '坛' },
      { value: '盆', label: '盆' },
      // === 长度类 ===
      { value: '米', label: '米（m）' },
      { value: 'cm', label: '厘米（cm）' },
      { value: 'mm', label: '毫米（mm）' },
      // === 面积类（种植面积）===
      { value: '平方米', label: '平方米（m²）' },
      { value: '亩', label: '亩' },
      { value: '公顷', label: '公顷（ha）' },
    ]
  }, [dictionaries])

  const productsLocked = stockType !== 'product'

  // ---- 操作 products ----
  const updateProduct = (idx: number, patch: Partial<InboundProduct>) => {
    setProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }
  const addProduct = () => {
    if (productsLocked) return
    setProducts((prev) => [
      ...prev,
      {
        cropCode: sourceRecord.cropCode || '',
        cropName: sourceRecord.cropName || '',
        cropVariety: sourceRecord.cropVariety || '',
        plantingMode: sourceRecord.plantingMode || '',
        harvestQuantity: 0,
        unit: sourceRecord.unit || '克',
        grade: '',
        sourceForm: '',  // 采收形态
      },
    ])
  }
  const removeProduct = (idx: number) => {
    if (productsLocked || products.length <= 1) return
    setProducts((prev) => prev.filter((_, i) => i !== idx))
  }

  // ---- 提交 ----
  const handleSubmit = async () => {
    setError(null)
    const harvesters = harvesterNames.join(',')
    const input = {
      stockType,
      sourceModule,
      sourceRecordId: sourceRecord.id,
      sourceRecordCode: sourceRecord.code,
      harvestDate,
      greenhouseIds: [],
      greenhouseNames: [],
      harvesterIds,
      harvesterNames,
      operator: operator || undefined,
      remarks: remarks || undefined,
      saleType,
      isSupplementary: isSupplementary || undefined,
      supplementaryReason: isSupplementary ? supplementaryReason : undefined,
      unitPrice: Number(unitPrice) || 0,
      unit,
      warehouseId,
      warehouseName: warehouseName || undefined,
      // 2026-06-19: 种源形态（仅种源行入库必填）
      propagationForm: propagationForm || undefined,
      products: products.map((p) => ({
        ...p,
        harvestQuantity: Number(p.harvestQuantity) || 0,
      })),
      operatorName: harvesterNames[0] || 'system',
    }

    const validation = validateUnifiedInboundInput(input)
    if (!validation.ok) {
      setError(validation.error)
      return
    }

    setSubmitting(true)
    try {
      const result = await submitUnifiedInbound(input)
      if (!result.success) {
        setError(result.error || '提交失败')
        return
      }
      // 跨页通知
      try {
        useInventoryStore.getState().notifyChange?.()
      } catch (_) {}
      showAlert(`入库成功！\n入库单号：${result.data?.harvestCode}\n入库库存：${result.data?.stockIds.length} 条`, {
        title: '成功',
      })
      onSuccess?.()
      onClose()
    } catch (e: any) {
      setError(e?.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- UI ----
  const meta = STOCK_TYPE_LABEL[stockType]
  const titleText = `采收入库（${meta.label}）`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titleText}
      size="xxl"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '提交中...' : '确认入库'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 顶部源记录只读信息 */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
          {meta.icon}
          <div className="flex-1">
            <div className="text-sm font-medium text-emerald-900">
              源记录：{sourceRecord.code}
            </div>
            <div className="text-xs text-emerald-700">
              {sourceRecord.cropName || '-'} {sourceRecord.cropVariety ? `(${sourceRecord.cropVariety})` : ''}
              {sourceRecord.unit ? ` · 单位 ${sourceRecord.unit}` : ''}
            </div>
          </div>
        </div>

        {/* 错误条 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* 基础字段 2 列 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="采收日期" required>
            <DatePicker
              className="w-full"
              selected={harvestDate ? new Date(harvestDate) : undefined}
              onChange={(date) => setHarvestDate(todayLocal(date))}
            />
          </FormField>
          <FormField label="目标仓库" required>
            <Select value={warehouseId} onValueChange={(v) => {
              setWarehouseId(v)
              const w = (warehouses || []).find((x: any) => x.id === v || x.warehouseId === v)
              if (w) setWarehouseName(w.name || w.warehouseName || '')
            }}>
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="选择仓库" />
              </SelectTrigger>
              <SelectContent>
                {(warehouses || []).map((w: any) => (
                  <SelectItem key={w.id || w.warehouseId} value={w.id || w.warehouseId}>
                    {w.name || w.warehouseName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="销售类型">
            <Select value={saleType} onValueChange={(v) => setSaleType(v as SaleType)}>
              <SelectTrigger className={deepInputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALE_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="单价（元）">
            <NumberInput
              value={unitPrice}
              onChange={setUnitPrice}
              min={0}
              max={1000000}
              step={0.01}
              className={deepInputClass}
            />
          </FormField>
          <FormField label="采收员">
            <div className="relative">
              {/* 触发按钮：显示已选 chip 列表 + 下拉箭头 */}
              <button
                type="button"
                onClick={() => setHarvesterPopoverOpen(!harvesterPopoverOpen)}
                className={`${deepInputClass} w-full text-left flex items-center justify-between min-h-[44px] ${harvesterPopoverOpen ? 'border-emerald-500 ring-2 ring-emerald-200' : ''}`}
              >
                <div className="flex-1 flex flex-wrap gap-1">
                  {harvesterNames.length === 0 ? (
                    <span className="text-gray-400">点击选择采收员（可多选）</span>
                  ) : (
                    harvesterNames.map((name, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded"
                      >
                        {name}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-emerald-950"
                          onClick={(e) => {
                            e.stopPropagation()
                            setHarvesterNames((prev) => prev.filter((_, i) => i !== idx))
                            setHarvesterIds((prev) => prev.filter((_, i) => i !== idx))
                          }}
                        />
                      </span>
                    ))
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 ml-2 shrink-0" />
              </button>
              {/* 多选下拉列表 */}
              {harvesterPopoverOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {users.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">用户列表加载中…</div>
                  ) : (
                    users.map((u: any) => {
                      const name = u.realName || u.real_name || u.username
                      const checked = harvesterNames.includes(name)
                      return (
                        <label
                          key={u.oid || u.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                setHarvesterNames((prev) => prev.filter((n) => n !== name))
                                setHarvesterIds((prev) => prev.filter((_, i) => harvesterNames[i] !== name))
                              } else {
                                setHarvesterNames((prev) => [...prev, name])
                                setHarvesterIds((prev) => [...prev, u.oid || u.id || `H${prev.length}`])
                              }
                            }}
                          />
                          <span className="text-sm">{name}</span>
                          {u.username && u.username !== name && (
                            <span className="text-xs text-gray-400">@{u.username}</span>
                          )}
                        </label>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </FormField>
          <FormField label="操作员">
            <Input
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder="默认当前登录人员"
              className={deepInputClass}
            />
          </FormField>
        </div>

        {/* 2026-06-19: 种源形态（仅种源行入库必填） */}
        {sourceModule === 'seed_source' && (
          <FormField label="种源形态" required>
            <Select value={propagationForm} onValueChange={setPropagationForm}>
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="选择种源形态（必填）" />
              </SelectTrigger>
              <SelectContent>
                {PROPAGATION_FORMS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}

        {/* 补录 */}
        <div className="flex items-center gap-3 border-t pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isSupplementary}
              onChange={(e) => setIsSupplementary(e.target.checked)}
            />
            补录（事后补录需填原因）
          </label>
          {isSupplementary && (
            <Input
              value={supplementaryReason}
              onChange={(e) => setSupplementaryReason(e.target.value)}
              placeholder="补录原因（必填）"
              className={`${deepInputClass} flex-1`}
            />
          )}
        </div>

        {/* 产品明细 */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">产品明细 {productsLocked && <span className="text-xs text-gray-500">（{meta.label}行锁死 1 条）</span>}</div>
            {!productsLocked && (
              <Button size="sm" variant="outline" onClick={addProduct}>
                <Plus className="w-4 h-4 mr-1" /> 添加产物
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {products.map((p, idx) => (
              <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-3">
                    <div className="text-xs text-gray-500 mb-1">产物名</div>
                    <Input
                      value={p.cropName}
                      onChange={(e) => updateProduct(idx, { cropName: e.target.value })}
                      className={deepInputClass}
                      disabled={productsLocked}
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 mb-1">品种</div>
                    <Input
                      value={p.cropVariety || ''}
                      onChange={(e) => updateProduct(idx, { cropVariety: e.target.value })}
                      className={deepInputClass}
                      disabled={productsLocked}
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 mb-1">采收数量</div>
                    <NumberInput
                      value={p.harvestQuantity}
                      onChange={(v) => updateProduct(idx, { harvestQuantity: Number(v) || 0 })}
                      min={0}
                      className={deepInputClass}
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 mb-1">单位</div>
                    <Select
                      value={p.unit}
                      onValueChange={(v) => updateProduct(idx, { unit: v })}
                    >
                      <SelectTrigger className={deepInputClass}>
                        <SelectValue placeholder="选单位" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.length === 0 ? (
                          <SelectItem value="克" disabled>字典加载中…</SelectItem>
                        ) : (
                          unitOptions.map((u) => (
                            <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* 2026-06-19: 种源形态已表达入库类型，产品内"采收形态"仅种植行（product）显示
                      避免与"种源形态"字段语义重复 */}
                  {sourceModule !== 'seed_source' && (
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 mb-1">采收形态</div>
                    <Select
                      value={p.sourceForm || ''}
                      onValueChange={(v) => updateProduct(idx, { sourceForm: v })}
                    >
                      <SelectTrigger className={deepInputClass}>
                        <SelectValue placeholder="选形态" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_FORMS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  )}
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 mb-1">品质</div>
                    <Select
                      value={p.grade || ''}
                      onValueChange={(v) => updateProduct(idx, { grade: v })}
                    >
                      <SelectTrigger className={deepInputClass}>
                        <SelectValue placeholder="选品质" />
                      </SelectTrigger>
                      <SelectContent>
                        {QUALITY_GRADES.map((g) => (
                          <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 flex items-end">
                    {!productsLocked && products.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => removeProduct(idx)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 备注 */}
        <FormField label="备注">
          <TextArea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            className={deepInputClass}
          />
        </FormField>

        {/* 底部按钮已移到 Modal footer prop（避免双"取消"按钮） */}
      </div>
    </Modal>
  )
}

export default UnifiedRowHarvestInboundModal
