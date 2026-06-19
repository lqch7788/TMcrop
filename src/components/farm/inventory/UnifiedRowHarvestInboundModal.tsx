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

import React, { useEffect, useMemo, useState } from 'react'
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
import { Sprout, Leaf, Wheat, Plus, Trash2, AlertCircle, Package } from 'lucide-react'
import { useWarehouseStore, useInventoryStore } from '@/stores'
import { useDictionaryStore, getDictItems } from '@/stores/useDictionaryStore'
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
  const [auditor, setAuditor] = useState<string>('')
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
    }
  }, [isOpen, loadWarehouses, loadDictionaries])

  // ---- 重置表单 ----
  useEffect(() => {
    if (isOpen) {
      setHarvestDate(todayLocal())
      setWarehouseId('')
      setWarehouseName('')
      setHarvesterIds([])
      setHarvesterNames([])
      setAuditor('')
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
  }, [isOpen, stockType, sourceRecord])

  // ---- 字典项 ----
  const unitOptions = useMemo(() => {
    const items = getDictItems?.(dictionaries, 'unit') || []
    return items.length > 0
      ? items.map((it: any) => ({ value: it.dictCode, label: it.dictValue || it.dictCode }))
      : [
          { value: '克', label: '克' },
          { value: 'kg', label: '千克' },
          { value: '株', label: '株' },
          { value: '枝', label: '枝' },
          { value: '个', label: '个' },
          { value: '袋', label: '袋' },
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
      auditor: auditor || undefined,
      remarks: remarks || undefined,
      saleType,
      isSupplementary: isSupplementary || undefined,
      supplementaryReason: isSupplementary ? supplementaryReason : undefined,
      unitPrice: Number(unitPrice) || 0,
      unit,
      warehouseId,
      warehouseName: warehouseName || undefined,
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
    <Modal isOpen={isOpen} onClose={onClose} title={titleText} size="lg">
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
            <Input
              value={harvesterNames.join(',')}
              onChange={(e) => {
                const names = e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
                setHarvesterNames(names)
                setHarvesterIds(names.map((_, i) => `H${i}`))
              }}
              placeholder="多个采收员用逗号分隔"
              className={deepInputClass}
            />
          </FormField>
          <FormField label="审核员">
            <Input
              value={auditor}
              onChange={(e) => setAuditor(e.target.value)}
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
                    <Input
                      value={p.unit}
                      onChange={(e) => updateProduct(idx, { unit: e.target.value })}
                      className={deepInputClass}
                    />
                  </div>
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

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '确认入库'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default UnifiedRowHarvestInboundModal
