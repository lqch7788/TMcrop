/**
 * 库存入库按模块下沉 — 行级弹窗组件
 * 2026-06-18 任务 3 / 2026-07-08 任务 T6 重构
 *
 * 设计要点：
 * - stockType 由 props 传入并锁死（UI 禁用 Select），与源记录的业务类型绑定
 * - 顶部蓝色块只读展示源记录信息（编码/作物名/品种）— 与 T6 之前的实现保持一致
 * - 单位字段用字典下拉（getDictItems('unit')），与其他模块保持一致
 * - 来源类型保留 6 种（与 inventoryInbound SourceType 一致）
 * - 字段渲染统一走 FIELD_CONFIG / COMMON_FIELDS 矩阵（与 AddStockModal 同源）
 * - 行级弹窗不采集"作物选择"（来自 sourceRecord），过滤 COMMON_FIELDS.cropSelector
 * - 提交走 useInventoryInboundStore.submitInbound（V2.1 架构铁律）
 * - 来源切换时调 fieldsToResetOnSourceTypeChange 清空，避免残留数据
 *
 * 参考：
 * - 字段矩阵：AddStockModal.constants.ts（T2 抽出）
 * - 表单 → payload 映射：services/addStockFormAdapter.ts
 * - 字典下拉：HarvestRecordModal.tsx:75, 369-374
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
  NumberInput,
} from '@/components/ui'
import { Package, AlertCircle, Sprout, Leaf, Wheat } from 'lucide-react'
import { useWarehouseStore, getActiveWarehouses, useSupplierStore, useBaseStore } from '@/stores'
import { useDictionaryStore, getDictItems } from '@/stores/useDictionaryStore'
import { useInventoryInboundStore } from '@/stores/useInventoryInboundStore'
import { todayLocal } from '@/lib/dateUtils'
import { showAlert } from '@/lib/dialogService'
import { toPayload, buildOperatorInfo } from '@/services/addStockFormAdapter'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  COMMON_FIELDS,
  FIELD_CONFIG,
  validateBySourceType,
  fieldsToResetOnSourceTypeChange,
  type FieldConfig,
} from './AddStockModal.constants'
import type {
  InboundSourceRecord,
  SourceType,
  StockType,
} from '@/types/inventoryInbound'

// ============ 常量配置 ============

/** 来源类型下拉项（6 种，与 inventoryInbound SourceType 一致） */
const SOURCE_TYPE_OPTIONS: Array<{ value: SourceType; label: string; hint: string }> = [
  { value: 'external_purchased', label: '外购入库', hint: '从供应商/市场购买入库' },
  { value: 'gift', label: '赠送/受赠', hint: '他人或单位赠送的作物' },
  { value: 'commissioned', label: '委托生产', hint: '委托他方生产后交付' },
  { value: 'transfer', label: '调拨入库', hint: '从其他基地/仓库调入' },
  { value: 'manual', label: '手动录入', hint: '盘点/期初/其他' },
  { value: 'self_produced', label: '自产', hint: '本基地自产' },
]

/** 库存类型中文标签（与弹窗标题联动） */
const STOCK_TYPE_LABEL: Record<StockType, { label: string; icon: React.ReactNode }> = {
  seed: { label: '种源', icon: <Sprout className="w-5 h-5 text-emerald-600" /> },
  seedling: { label: '种苗', icon: <Leaf className="w-5 h-5 text-green-600" /> },
  product: { label: '成品', icon: <Wheat className="w-5 h-5 text-amber-600" /> },
}

/** 品质等级（与 AddStockModal 一致） */
const QUALITY_GRADES = [
  { value: 'special', label: '特优' },
  { value: 'excellent', label: '优' },
  { value: 'good', label: '良' },
  { value: 'qualified', label: '合格' },
  { value: 'unqualified', label: '不合格' },
]

const deepInputClass =
  'px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner'

// ============ Props ============

interface InventoryInboundModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  /** 锁死的库存类型（与源记录业务类型绑定） */
  stockType: StockType
  /** 源记录快照（来自种源/育苗/种植行） */
  sourceRecord: InboundSourceRecord
}

// ============ 主组件 ============

export const InventoryInboundModal: React.FC<InventoryInboundModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  stockType,
  sourceRecord,
}) => {
  // ---- 字段矩阵（行级弹窗不采集 cropSelector） ----
  const filteredCommonFields = useMemo(
    () => COMMON_FIELDS.filter((f) => f.key !== 'cropSelector'),
    [],
  )
  const sourceFields = FIELD_CONFIG['self_produced']

  // ---- 表单状态（统一 Record<string, any>，与 FIELD_CONFIG 字段对位） ----
  const initialFormData = (): Record<string, any> => {
    const data: Record<string, any> = {
      recordDate: todayLocal(),
      warehouseId: '',
      quantity: 0,
      unit: sourceRecord.unit || '克',
      qualityGrade: '',
      unitPrice: 0,
      totalAmount: 0,
      notes: '',
      cropCode: sourceRecord.cropCode,
      cropName: sourceRecord.cropName,
      varietyName: sourceRecord.cropVariety,
    }
    // 给 6 来源专属字段填默认空值（避免 undefined 干扰校验）
    ;[...sourceFields].forEach((f) => {
      data[f.key] = ''
    })
    return data
  }

  const [formData, setFormData] = useState<Record<string, any>>(initialFormData)
  const [sourceType, setSourceType] = useState<SourceType>('self_produced')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [topError, setTopError] = useState<string | null>(null)

  // ---- Store hooks ----
  const warehouses = useWarehouseStore((s) => s.warehouses)
  const loadWarehouses = useWarehouseStore((s) => s.loadWarehouses)
  const supplierItems = useSupplierStore((s: any) => s.items)
  const loadSuppliers = useSupplierStore((s: any) => s.loadItems)
  const bases = useBaseStore((s: any) => s.bases)
  const loadBases = useBaseStore((s: any) => s.loadBases)
  const submitInboundAction = useInventoryInboundStore((s) => s.submitInbound)
  const dictionaries = useDictionaryStore((s) => s.dictionaries)
  const loadDictionaries = useDictionaryStore((s) => s.loadDictionaries)

  // ---- 字典下拉（单位）----
  const unitOptions = useMemo(
    () => getDictItems('unit').map((d) => d.dictCode).filter(Boolean),
    [dictionaries],
  )

  // ---- 弹窗打开时按需加载基础数据 ----
  useEffect(() => {
    if (!isOpen) return
    if (warehouses.length === 0) void loadWarehouses()
    if (supplierItems.length === 0) void loadSuppliers()
    if (bases.length === 0) void loadBases()
    if (dictionaries.length === 0) void loadDictionaries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // ---- 弹窗打开时重置表单 ----
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData())
      setSourceType('self_produced')
      setErrors({})
      setTopError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sourceRecord.id, sourceRecord.module])

  // ---- 派生 ----
  const activeWarehouses = useMemo(
    () => getActiveWarehouses(),
    // 依赖 warehouses 保证其变化时重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [warehouses],
  )

  // 单价 × 数量（外购使用）
  const totalAmount = useMemo(() => {
    const q = Number(formData.quantity) || 0
    const p = Number(formData.unitPrice) || 0
    return q * p
  }, [formData.quantity, formData.unitPrice])

  // ---- 字段更新工具 ----
  const updateField = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  // ---- 切换来源：清空来源专属字段，避免残留 ----
  const handleSourceTypeChange = (newSource: SourceType) => {
    if (newSource === sourceType) return
    setFormData((prev) => {
      const next = { ...prev }
      fieldsToResetOnSourceTypeChange().forEach((k) => delete next[k])
      return next
    })
    setSourceType(newSource)
    setErrors({})
    setTopError(null)
  }

  // ---- 提交 ----
  const handleSubmit = async () => {
    const newErrors = validateBySourceType(formData, sourceType)
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setTopError('请检查必填项')
      return
    }
    setErrors({})
    setTopError(null)
    setSubmitting(true)

    try {
      // T5 任务：操作人从 useAuthStore.currentUser 读取（realName 优先）；未登录兜底 'system'
      const currentUser = useAuthStore.getState().currentUser
      const operator = buildOperatorInfo(currentUser)
      const payload = toPayload(formData, sourceType, sourceRecord, operator, {
        stockType,
      })
      // totalAmount 应保持最新
      payload.totalAmount = totalAmount

      const result = await submitInboundAction(payload)
      if (result) {
        showAlert('入库成功')
        onSuccess?.()
        onClose()
      } else {
        setTopError('入库失败')
      }
    } catch (e) {
      setTopError(e instanceof Error ? e.message : '入库失败')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- 当前来源专属字段（用于渲染） ----
  const currentSourceFields = FIELD_CONFIG[sourceType]

  const stockTypeInfo = STOCK_TYPE_LABEL[stockType]

  // ---- renderFieldByType：按 FieldType 派发 UI ----
  const renderFieldByType = (field: FieldConfig) => {
    const errMsg = errors[field.key]
    const inputClass = errMsg
      ? `${deepInputClass} border-red-400 focus:border-red-500 focus:ring-red-200`
      : deepInputClass

    switch (field.type) {
      case 'date':
        return (
          <FormField key={field.key} label={field.label + (field.required ? ' *' : '')} required={field.required}>
            <Input
              type="date"
              value={formData[field.key] || ''}
              onChange={(e) => updateField(field.key, e.target.value)}
              className={inputClass}
            />
            {errMsg && <div className="text-xs text-red-500 mt-1">{errMsg}</div>}
          </FormField>
        )

      case 'number':
        return (
          <FormField key={field.key} label={field.label + (field.required ? ' *' : '')} required={field.required}>
            <NumberInput
              value={formData[field.key] ?? 0}
              onChange={(v) => updateField(field.key, v)}
              min={0}
              className={inputClass}
              placeholder="0"
            />
            {errMsg && <div className="text-xs text-red-500 mt-1">{errMsg}</div>}
          </FormField>
        )

      case 'text':
        return (
          <FormField key={field.key} label={field.label + (field.required ? ' *' : '')} required={field.required}>
            <Input
              value={formData[field.key] || ''}
              onChange={(e) => updateField(field.key, e.target.value)}
              className={inputClass}
            />
            {errMsg && <div className="text-xs text-red-500 mt-1">{errMsg}</div>}
          </FormField>
        )

      case 'select-dict-unit':
        return (
          <FormField key={field.key} label={field.label + (field.required ? ' *' : '')} required={field.required}>
            <Select value={formData[field.key] || ''} onValueChange={(v) => updateField(field.key, v)}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="请选择单位" />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.length === 0 ? (
                  <SelectItem value={formData[field.key] || '__none__'} disabled>
                    字典加载中…
                  </SelectItem>
                ) : (
                  unitOptions.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errMsg && <div className="text-xs text-red-500 mt-1">{errMsg}</div>}
          </FormField>
        )

      case 'select-enum-quality':
        return (
          <FormField key={field.key} label={field.label + (field.required ? ' *' : '')} required={field.required}>
            <Select value={formData[field.key] || ''} onValueChange={(v) => updateField(field.key, v)}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">不指定</SelectItem>
                {QUALITY_GRADES.map((q) => (
                  <SelectItem key={q.value} value={q.value}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errMsg && <div className="text-xs text-red-500 mt-1">{errMsg}</div>}
          </FormField>
        )

      case 'select':
        // 仓库：来源字段（key=warehouseId）来自 COMMON_FIELDS
        return (
          <FormField key={field.key} label={field.label + (field.required ? ' *' : '')} required={field.required}>
            <Select value={formData[field.key] || ''} onValueChange={(v) => updateField(field.key, v)}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="请选择仓库" />
              </SelectTrigger>
              <SelectContent>
                {activeWarehouses.length === 0 ? (
                  <SelectItem value="__empty__" disabled>
                    暂无仓库，请到【基础数据-仓库】创建
                  </SelectItem>
                ) : (
                  activeWarehouses.map((w: any) => (
                    <SelectItem
                      key={w.oid || w.id}
                      value={String(w.oid || w.id)}
                    >
                      {w.name || w.warehouseName}
                      {w.warehouseType || w.type ? `（${w.warehouseType || w.type}）` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errMsg && <div className="text-xs text-red-500 mt-1">{errMsg}</div>}
          </FormField>
        )

      case 'supplier-select':
        return (
          <FormField key={field.key} label={field.label + (field.required ? ' *' : '')} required={field.required}>
            <Select
              value={formData.supplierId || ''}
              onValueChange={(v) => {
                const found = supplierItems.find((s: any) => String(s.id) === String(v))
                setFormData((prev) => ({
                  ...prev,
                  supplierId: String(found?.id ?? v),
                  supplierName: found?.name ?? '',
                }))
                if (errors.supplierId) {
                  setErrors((prev) => {
                    const next = { ...prev }
                    delete next.supplierId
                    return next
                  })
                }
              }}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="请选择供应商" />
              </SelectTrigger>
              <SelectContent>
                {supplierItems.length === 0 ? (
                  <SelectItem value="__empty__" disabled>
                    暂无供应商
                  </SelectItem>
                ) : (
                  supplierItems.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                      {s.contactPerson ? `（${s.contactPerson}）` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errMsg && <div className="text-xs text-red-500 mt-1">{errMsg}</div>}
          </FormField>
        )

      case 'base-select':
        return (
          <FormField key={field.key} label={field.label + (field.required ? ' *' : '')} required={field.required}>
            <Select
              value={formData.baseId || ''}
              onValueChange={(v) => {
                const found = bases.find((b: any) => String(b.id) === String(v) || String(b.oid) === String(v))
                setFormData((prev) => ({
                  ...prev,
                  baseId: String(found?.id ?? v),
                  baseName: found?.name ?? '',
                }))
                if (errors.baseId) {
                  setErrors((prev) => {
                    const next = { ...prev }
                    delete next.baseId
                    return next
                  })
                }
              }}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="请选择基地" />
              </SelectTrigger>
              <SelectContent>
                {bases.length === 0 ? (
                  <SelectItem value="__empty__" disabled>
                    暂无基地
                  </SelectItem>
                ) : (
                  bases.map((b: any) => (
                    <SelectItem key={b.id || b.oid} value={String(b.id || b.oid)}>
                      {b.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errMsg && <div className="text-xs text-red-500 mt-1">{errMsg}</div>}
          </FormField>
        )

      case 'derived':
        // 总金额（quantity * unitPrice）— 只读计算字段
        return (
          <FormField key={field.key} label={field.label + (field.required ? ' *' : '')} required={field.required}>
            <Input
              type="text"
              value={`¥ ${totalAmount.toFixed(2)}`}
              readOnly
              className={`${deepInputClass} bg-gray-100 font-mono text-emerald-700`}
            />
          </FormField>
        )

      case 'textarea':
        return (
          <FormField key={field.key} label={field.label + (field.required ? ' *' : '')} required={field.required}>
            <TextArea
              value={formData[field.key] || ''}
              onChange={(e) => updateField(field.key, e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="选填"
            />
            {errMsg && <div className="text-xs text-red-500 mt-1">{errMsg}</div>}
          </FormField>
        )

      case 'crop-selector':
        // 行级弹窗不应到达此分支（filteredCommonFields 已过滤）
        return null

      default:
        return null
    }
  }

  // 公共字段顺序：日期 → 仓库 → 数量/单位/品质/单价/总金额/备注
  // 来源字段追加在公共字段之后，按 FIELD_CONFIG 顺序
  const allFields = [...filteredCommonFields, ...currentSourceFields]

  // 把字段分组成"行"，用于 grid 布局：
  // - 单字段（textarea/derived）独占一行
  // - 其他字段：每行最多 3 个
  const renderFieldRows = () => {
    const rows: FieldConfig[][] = []
    let buffer: FieldConfig[] = []
    const flushBuffer = () => {
      if (buffer.length > 0) {
        rows.push(buffer)
        buffer = []
      }
    }
    for (const field of allFields) {
      if (field.type === 'textarea' || field.type === 'derived') {
        flushBuffer()
        rows.push([field])
      } else {
        buffer.push(field)
        if (buffer.length === 3) flushBuffer()
      }
    }
    flushBuffer()
    return rows
  }

  const fieldRows = renderFieldRows()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={
        <div className="flex items-center gap-2">
          {stockTypeInfo.icon}
          <span>
            {stockTypeInfo.label}入库登记 - {sourceRecord.code}
          </span>
        </div>
      }
      submitText={submitting ? '提交中...' : '确认入库'}
      cancelText="取消"
      width={900}
      height={760}
    >
      <div className="space-y-4">
        {/* 源记录信息（只读蓝色块）— 保留与原实现一致 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
            <Package className="w-3.5 h-3.5" /> 源记录信息
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-gray-600">来源编码：</span>
              <span className="font-medium text-gray-900">{sourceRecord.code || '-'}</span>
            </div>
            <div>
              <span className="text-gray-600">作物名称：</span>
              <span className="font-medium text-gray-900">
                {sourceRecord.cropName || '-'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">作物品种：</span>
              <span className="font-medium text-gray-900">
                {sourceRecord.cropVariety || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* 顶部错误提示 */}
        {topError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">{topError}</div>
          </div>
        )}

        {/* 来源类型选择 — 始终置于顶部 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs font-semibold text-blue-800 mb-2">入库来源 *</div>
          <div className="grid grid-cols-3 gap-2">
            {SOURCE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSourceTypeChange(opt.value)}
                className={`text-left p-2 rounded border transition-all text-sm ${
                  sourceType === opt.value
                    ? 'border-blue-500 bg-white shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{opt.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 字段矩阵渲染：按 FIELD_CONFIG 顺序遍历 */}
        <div className="space-y-3">
          {fieldRows.map((row, idx) => {
            // 把 grid 列数映射到 Tailwind 静态类名（JIT 要求完整静态串）
            const cols = Math.min(row.length, 3)
            const gridClass =
              cols === 1 ? 'grid grid-cols-1 gap-4' :
              cols === 2 ? 'grid grid-cols-2 gap-4' :
              'grid grid-cols-3 gap-4'
            // textarea/derived 单字段独占一行
            const isFullRow = row.length === 1 && (row[0].type === 'textarea' || row[0].type === 'derived')
            return (
              <div key={idx} className={isFullRow ? 'block' : gridClass}>
                {row.map((field) => renderFieldByType(field))}
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

export default InventoryInboundModal
