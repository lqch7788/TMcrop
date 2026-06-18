/**
 * 库存入库按模块下沉 — 公共弹窗组件
 * 2026-06-18 任务 3
 *
 * 设计要点：
 * - stockType 由 props 传入并锁死（UI 禁用 Select），与源记录的业务类型绑定
 * - 顶部蓝色块只读展示源记录信息（编码/作物名/品种）
 * - 单位字段用字典下拉（getDictItems('unit')），与其他模块保持一致
 * - 来源类型保留 6 种（与 inventory.ts SourceType 一致）
 * - 提交走 useInventoryInboundStore.submitInbound（V2.1 架构铁律）
 * - 来源为外购时必选供应商（与 AddStockModal 行为一致）
 *
 * 参考：
 * - 字段布局：AddStockModal.tsx
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
  DatePicker,
  NumberInput,
} from '@/components/ui'
import { Package, AlertCircle, Sprout, Leaf, Wheat } from 'lucide-react'
import { useWarehouseStore, getActiveWarehouses } from '@/stores'
import { useSupplierStore } from '@/stores'
import { useDictionaryStore, getDictItems } from '@/stores/useDictionaryStore'
import { useInventoryInboundStore } from '@/stores/useInventoryInboundStore'
import { todayLocal } from '@/lib/dateUtils'
import { showAlert } from '@/lib/dialogService'
import type {
  InboundSourceRecord,
  SourceType,
  StockType,
} from '@/types/inventoryInbound'

// ============ 常量配置 ============

/** 来源类型下拉项（6 种，与 inventory.ts SourceType 一致） */
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
  // ---- 表单状态 ----
  const [recordDate, setRecordDate] = useState<string>(todayLocal())
  const [sourceType, setSourceType] = useState<SourceType>('self_produced')
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [quantity, setQuantity] = useState<number | string>(0)
  const [unit, setUnit] = useState<string>(sourceRecord.unit || '克')
  const [unitPrice, setUnitPrice] = useState<number | string>(0)
  const [qualityGrade, setQualityGrade] = useState<string>('')
  const [supplierId, setSupplierId] = useState<string>('')
  const [supplierName, setSupplierName] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---- Store hooks ----
  const warehouses = useWarehouseStore((s) => s.warehouses)
  const loadWarehouses = useWarehouseStore((s) => s.loadWarehouses)
  const supplierItems = useSupplierStore((s) => s.items)
  const loadSuppliers = useSupplierStore((s) => s.loadItems)
  const submitInboundAction = useInventoryInboundStore((s) => s.submitInbound)
  const dictionaries = useDictionaryStore((s) => s.dictionaries)
  const loadDictionaries = useDictionaryStore((s) => s.loadDictionaries)

  // ---- 字典下拉（单位）----
  const unitOptions = useMemo(
    () => getDictItems('unit').map((d) => d.dictCode).filter(Boolean),
    [dictionaries]
  )

  // ---- 弹窗打开时按需加载基础数据 ----
  useEffect(() => {
    if (!isOpen) return
    if (warehouses.length === 0) void loadWarehouses()
    if (supplierItems.length === 0) void loadSuppliers()
    if (dictionaries.length === 0) void loadDictionaries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // ---- 弹窗打开时重置表单 ----
  useEffect(() => {
    if (isOpen) {
      setRecordDate(todayLocal())
      setSourceType('self_produced')
      setWarehouseId('')
      setQuantity(0)
      // 单位优先取源记录的单位；如源记录没给且字典已加载，则用字典第一项；否则保留 '克' 占位
      setUnit(sourceRecord.unit || (unitOptions[0] ?? '克'))
      setUnitPrice(0)
      setQualityGrade('')
      setSupplierId('')
      setSupplierName('')
      setNotes('')
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sourceRecord.id, sourceRecord.module])

  // ---- 派生 ----
  const activeWarehouses = useMemo(
    () => getActiveWarehouses(),
    // 依赖 warehouses 保证其变化时重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [warehouses]
  )
  const totalAmount = (Number(quantity) || 0) * (Number(unitPrice) || 0)

  // ---- 供应商选中 ----
  const handleSelectSupplier = (supplierIdValue: string) => {
    const found = supplierItems.find((s: any) => String(s.id) === String(supplierIdValue))
    if (found) {
      setSupplierId(String(found.id))
      setSupplierName(found.name || '')
    } else {
      setSupplierId(supplierIdValue)
      setSupplierName('')
    }
  }

  // ---- 校验 ----
  const validate = (): string | null => {
    const qtyNum = Number(quantity) || 0
    if (qtyNum <= 0) return '请填写数量（> 0）'
    if (!unit) return '请选择单位'
    if (!warehouseId) return '请选择仓库'
    if (sourceType === 'external_purchased' && !supplierId) return '外购入库必须选择供应商'
    // 单位必须在字典内（字典已加载时）
    if (unitOptions.length > 0 && !unitOptions.includes(unit)) return '单位无效，请从下拉选择'
    return null
  }

  // ---- 提交 ----
  const handleSubmit = async () => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      const qtyNum = Number(quantity) || 0
      const result = await submitInboundAction({
        sourceModule: sourceRecord.module,
        sourceId: sourceRecord.id,
        stockType,
        sourceType,
        warehouseId,
        quantity: qtyNum,
        unit,
        recordDate,
        unitPrice: Number(unitPrice) || 0,
        totalAmount,
        qualityGrade: qualityGrade || undefined,
        supplierId: supplierId || undefined,
        supplierName: supplierName || undefined,
        productionPlanId: sourceRecord.productionPlanId,
        productionPlanCode: sourceRecord.productionPlanCode,
        notes: notes || undefined,
        operatorName: 'system',
      })

      if (result) {
        showAlert('入库成功')
        // 重置可清字段（保留弹窗打开状态直到父组件关闭）
        setQuantity(0)
        setUnitPrice(0)
        setNotes('')
        onSuccess?.()
        onClose()
      } else {
        setError('入库失败')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '入库失败')
    } finally {
      setSubmitting(false)
    }
  }

  const stockTypeInfo = STOCK_TYPE_LABEL[stockType]

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
        {/* 源记录信息（只读蓝色块） */}
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

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* 基础信息三列：日期/库存类型/来源类型 */}
        <div className="grid grid-cols-3 gap-4">
          <FormField label="入库日期 *" required>
            <Input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className={deepInputClass}
            />
          </FormField>

          <FormField label="库存类型 *" required>
            <Select value={stockType} disabled>
              <SelectTrigger className={deepInputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={stockType}>{stockTypeInfo.label}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="来源类型 *" required>
            <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
              <SelectTrigger className={deepInputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {/* 仓库 + 数量 + 单位 */}
        <div className="grid grid-cols-3 gap-4">
          <FormField label="入库仓库 *" required>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className={deepInputClass}>
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
          </FormField>

          <FormField label="数量 *" required>
            <NumberInput
              value={quantity}
              onChange={(v) => setQuantity(v)}
              min={0}
              className={deepInputClass}
              placeholder="0"
            />
          </FormField>

          <FormField label="单位 *" required>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="请选择单位" />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.length === 0 ? (
                  <SelectItem value={unit} disabled>
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
          </FormField>
        </div>

        {/* 品质 + 单价 + 总金额（只读计算） */}
        <div className="grid grid-cols-3 gap-4">
          <FormField label="品质等级">
            <Select value={qualityGrade} onValueChange={setQualityGrade}>
              <SelectTrigger className={deepInputClass}>
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
          </FormField>

          <FormField label="单价（元）">
            <NumberInput
              value={unitPrice}
              onChange={(v) => setUnitPrice(v)}
              min={0}
              className={deepInputClass}
              placeholder="0.00"
            />
          </FormField>

          <FormField label="总金额（元）">
            <Input
              type="text"
              value={`¥ ${totalAmount.toFixed(2)}`}
              readOnly
              className={`${deepInputClass} bg-gray-100 font-mono text-emerald-700`}
            />
          </FormField>
        </div>

        {/* 来源类型说明 */}
        <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
          {SOURCE_TYPE_OPTIONS.find((s) => s.value === sourceType)?.hint}
        </div>

        {/* 供应商（外购必选，其他来源可选） */}
        {sourceType === 'external_purchased' && (
          <FormField label="供应商 *" required>
            {supplierName ? (
              <div
                className={`${deepInputClass} flex items-center justify-between bg-gray-50`}
              >
                <span className="text-sm text-gray-900">{supplierName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSupplierId('')
                    setSupplierName('')
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ) : (
              <Select value={supplierId} onValueChange={handleSelectSupplier}>
                <SelectTrigger className={deepInputClass}>
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
            )}
          </FormField>
        )}

        {/* 备注 */}
        <FormField label="备注">
          <TextArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={deepInputClass}
            placeholder="选填"
          />
        </FormField>
      </div>
    </Modal>
  )
}

export default InventoryInboundModal
