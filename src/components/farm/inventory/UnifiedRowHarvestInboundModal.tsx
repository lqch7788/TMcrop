/**
 * 行级采收入库弹窗（unify-harvest-inbound-into-source-operations）
 * 2026-06-19 Phase 3
 *
 * 基于 InventoryInboundModal 模式扩展，承载原采收入库页 AddModal 全部 18 字段：
 * - harvestDate, greenhouseIds[], batchCode, harvesterIds[], auditor, remarks
 * - isSupplementary + supplementaryReason
 * - unitPrice, unit, warehouseId
 * - products[] (种源/育苗 lock 1 条，种植 1..N)
 *
 * 弹窗 → submitUnifiedInbound → POST /api/inventory/inbound-from-source
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
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
import {Sprout, Leaf, Wheat, Plus, Trash2, AlertCircle, X, ChevronDown, Download} from 'lucide-react'
import { useWarehouseStore, useInventoryStore } from '@/stores'
import { useDictionaryStore, getDictItems } from '@/stores/useDictionaryStore'
import { useAuthStore } from '@/stores/useAuthStore'
import {useUserStore} from '@/stores/useUserStore'
import { useHarvestRecordStore } from '@/stores/useHarvestRecordStore'
// 2026-07-01: 行级采收入库成功后需要同步写 planting_harvest_records，让 HarvestRecordModal 历史表能显示
import { usePlantingStore } from '@/stores/usePlantingStore'
import { todayLocal } from '@/lib/dateUtils'
import { showAlert, showConfirm } from '@/lib/dialogService'
import {
  submitUnifiedInbound,
  validateUnifiedInboundInput,
  type StockType,
  type SourceModule,
  type InboundProduct,
} from '@/services/unifiedHarvestInboundService'
import type { HarvestRecord } from '@/types'

// ============ 常量 ============

const STOCK_TYPE_LABEL: Record<StockType, { label: string; icon: React.ReactNode }> = {
  seed: { label: '种源', icon: <Sprout className="w-5 h-5 text-emerald-600" /> },
  seedling: { label: '种苗', icon: <Leaf className="w-5 h-5 text-green-600" /> },
  product: { label: '种植成品', icon: <Wheat className="w-5 h-5 text-amber-600" /> },
}

const QUALITY_GRADES = [
  { value: 'special', label: '特优' },
  { value: 'excellent', label: '优' },
  { value: 'good', label: '良' },
  { value: 'qualified', label: '合格' },
  { value: 'unqualified', label: '不合格' },
]

// 2026-06-19: 种源形态（种源行入库必填）
// 2026-06-30 Bug 21：已删除 PROPAGATION_FORMS（用户选 B — 库存形态列改读产品明细
// "采收形态" sourceForm / inventory_stock.source_form；种源形态字段不再独立写入库存）

/**
 * 2026-06-27：成品形态（种植行采收入库）
 * key 与后端 HARVEST_FORM_MAP / src/constants/cropConstants 一致
 */
const HARVEST_FORMS = [
  { value: 'whole_plant', label: '整株' },
  { value: 'flower', label: '花朵' },
  { value: 'fruit', label: '果实' },
  { value: 'seed', label: '种子' },
  { value: 'tuber', label: '块茎' },
  { value: 'bulb', label: '球根' },
  { value: 'leaf', label: '叶片' },
  { value: 'root', label: '根茎' },
  { value: 'stem', label: '茎秆' },
  { value: 'cutting', label: '枝条' },
  { value: 'other', label: '其他' },
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
  const [isSupplementary, setIsSupplementary] = useState<boolean>(false)
  const [supplementaryReason, setSupplementaryReason] = useState<string>('')
  const [unitPrice, setUnitPrice] = useState<number | string>(0)
  const [unit, setUnit] = useState<string>(sourceRecord.unit || '克')
  // 2026-06-19: 种源形态（仅种源行入库必填）— 2026-06-30 Bug 21 删：用户选 B，
  //   改为统一从产品明细 sourceForm（= inventory_stock.source_form）读形态
  // 2026-06-27：成品形态（仅种植行入库时使用）
  const [harvestForm, setHarvestForm] = useState<string>('')

  // 2026-07-01: 字段绑定交换（与种植 HarvestRecordModal 一致）
  // 历史 bug：seedlings/seed_sources/plantings 等主表的 crop_name 字段实际存"品种"（如"红富士"），
  // crop_variety 字段实际存"类型/名称"（如"苹果"）—— 字段名与值语义相反。
  // 入库时需要把字段名交换，让"作物名称"列显示苹果、"作物品种"列显示红富士。
  // 弹窗顶部 "源记录" 区域也保持原值（让用户能看到原始数据），只在入库产品明细里做交换。
  const initialCropName = sourceRecord.cropVariety || ''  // "苹果"（取 seedlings.crop_variety）
  const initialCropVariety = sourceRecord.cropName || ''  // "红富士"（取 seedlings.crop_name）

  // products: 种源/育苗 lock 1 条，种植允许多条
  const [products, setProducts] = useState<InboundProduct[]>([
    {
      cropCode: sourceRecord.cropCode || '',
      cropName: initialCropName,
      cropVariety: initialCropVariety,
      plantingMode: sourceRecord.plantingMode || '',
      harvestQuantity: 0,
      unit: sourceRecord.unit || '克',
      grade: '',
      sourceForm: '',  // 采收形态（果实/籽/枝条等）
      // 2026-06-30 Bug 12 修复：成品形态（写入 inventory_stock.product_form）
      // 顶部"成品形态"下拉（harvestForm）→ useEffect 同步到 products[i].productForm
      productForm: '',
    },
  ])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---- Store hooks ----
  const warehouses = useWarehouseStore((s: any) => s.warehouses || [])
  const loadWarehouses = useWarehouseStore((s: any) => s.loadWarehouses)
  const dictionaries = useDictionaryStore((s: any) => s.dictionaries)
  const loadDictionaries = useDictionaryStore((s: any) => s.loadDictionaries)
  // 2026-07-01: 弹窗底部"采收记录"历史表 + 导出 Excel
  const loadHarvestRecords = useHarvestRecordStore((s) => s.loadRecords)
  const recordsByKey = useHarvestRecordStore((s) => s.recordsByKey)
  const loadingByKey = useHarvestRecordStore((s) => s.loadingByKey)
  const prependHarvestRecord = useHarvestRecordStore((s) => s.prependRecord)

  // ---- 加载字典/仓库 ----
  useEffect(() => {
    if (isOpen) {
      loadWarehouses?.()
      loadDictionaries?.()
      loadUsers?.()
      // 2026-07-01: 弹窗打开时加载该来源记录的采收历史
      if (sourceRecord?.id) {
        loadHarvestRecords(sourceModule, sourceRecord.id)
      }
    }
  }, [isOpen, loadWarehouses, loadDictionaries, loadUsers, sourceModule, sourceRecord?.id, loadHarvestRecords])

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
      setIsSupplementary(false)
      setSupplementaryReason('')
      setUnitPrice(0)
      setUnit(sourceRecord.unit || '克')
      setProducts([
        {
          cropCode: sourceRecord.cropCode || '',
          cropName: initialCropName,        // 2026-07-01: 字段绑定交换（苹果）
          cropVariety: initialCropVariety,  // 2026-07-01: 字段绑定交换（红富士）
          plantingMode: sourceRecord.plantingMode || '',
          harvestQuantity: 0,
          unit: sourceRecord.unit || '克',
          grade: '',
          sourceForm: '',  // 采收形态
          productForm: '',  // 2026-06-30 Bug 12 修复：成品形态重置
        },
      ])
      setError(null)
    }
    prevIsOpen.current = isOpen
  }, [isOpen, stockType, sourceRecord, currentUser])

  // 2026-06-30 Bug 12 修复：顶部"成品形态"harvestForm → 同步到所有 products[].productForm
  // 原因：executeInboundFromSource.service.ts:279 写 product_form: product.productForm
  //       种植行允许多产物（果实+种子+枝条），顶部一个下拉选了形态后，每条 product 都用同一形态
  // 限制：多产物场景下用户希望"每条产物的形态不同"？当前产品明细里没单独的形态下拉
  //       — 若未来需要多形态，加每行 productForm Select 即可
  useEffect(() => {
    if (!harvestForm) return
    setProducts((prev) => prev.map((p) => ({ ...p, productForm: harvestForm })))
  }, [harvestForm])

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
        cropName: initialCropName,        // 2026-07-01: 字段绑定交换
        cropVariety: initialCropVariety,  // 2026-07-01: 字段绑定交换
        plantingMode: sourceRecord.plantingMode || '',
        harvestQuantity: 0,
        unit: sourceRecord.unit || '克',
        grade: '',
        sourceForm: '',  // 采收形态
        productForm: '',  // 2026-06-30 Bug 12 修复：成品形态初始值
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
      isSupplementary: isSupplementary || undefined,
      supplementaryReason: isSupplementary ? supplementaryReason : undefined,
      unitPrice: Number(unitPrice) || 0,
      unit,
      warehouseId,
      warehouseName: warehouseName || undefined,
      // 2026-06-30 Bug 21：propagationForm 字段删除，统一从产品明细 sourceForm 读 inventory 形态
      harvestForm: harvestForm || undefined,
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
      // 2026-07-01 修复：种植行入库成功后同步写 planting_harvest_records
      // 原因：submitUnifiedInbound 写的是 harvest_records/inventory_stock（4 表），
      //       但 HarvestRecordModal 历史区读的是 planting_harvest_records
      //       —— 不写这条，行级采收入库在 HarvestRecordModal 看不到
      if (sourceModule === 'planting' && sourceRecord?.id && result.data?.harvestCode) {
        try {
          // 累加 products 总数（与 HarvestRecordModal 弹窗 harvest 分支的算法保持一致）
          const totalQty = (input.products || []).reduce(
            (s, p) => s + (Number(p.harvestQuantity) || 0),
            0,
          )
          const product = input.products?.[0]
          await usePlantingStore.getState().addHarvestRecord(sourceRecord.id, {
            recordDate: input.harvestDate,
            destination: 'harvest',
            warehouseId: input.warehouseId,
            warehouseName: input.warehouseName,
            quantity: totalQty,
            unit: product?.unit || input.unit,
            notes: input.remarks,
            createBy: useAuthStore.getState().currentUser?.realName || 'system',
            operatorName: useAuthStore.getState().currentUser?.realName || 'system',
            // 2026-06-30: harvest 形态（果实/种子/种苗/枝条…）
            // 顶部"采收形态"联动 productForm（弹窗内的对应字段）
            sourceForm: product?.productForm,
          })
        } catch (e) {
          // 写 planting_harvest_records 失败不影响主流程（已成功入库）
          console.error('[UnifiedRowHarvestInboundModal] 同步 planting_harvest_records 失败:', e)
        }
      }
      // 2026-07-01: 刷新该来源的采收历史（提交后 store 里数据陈旧，重新拉取）
      if (sourceRecord?.id) {
        void loadHarvestRecords(sourceModule, sourceRecord.id)
      }
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

  // 2026-07-01: 弹窗底部"采收记录"历史表数据
  // recordKey = `${sourceModule}:${sourceRecord.id}`，对应 store 里的索引
  const recordKey = sourceRecord?.id ? `${sourceModule}:${sourceRecord.id}` : ''
  const historyRecords: HarvestRecord[] = (recordKey ? recordsByKey[recordKey] : undefined) || []
  const historyLoading = !!loadingByKey[recordKey]

  // 2026-07-01: 品质等级中文化（与产品明细 Select 选项一致：special/excellent/good/qualified/unqualified → 特优/优/良/合格/不合格）
  const GRADE_LABEL: Record<string, string> = {
    special: '特优',
    excellent: '优',
    good: '良',
    qualified: '合格',
    unqualified: '不合格',
  }
  function gradeLabel(value: string | undefined | null): string {
    if (!value) return ''
    return GRADE_LABEL[value] || value
  }

  // 2026-07-01: 弹窗表 + 导出 Excel 共用的列名定义（保持一致）
  // 弹窗表 16 列：日期/单号/产物序号/作物编码/作物名称/作物品种/数量/单位/采收形态/品质/仓库/采收员/操作员/补录/创建时间/操作
  // 2026-07-01: "产物名" → "作物名称"，"品种" → "作物品种"（与入库弹窗 label 一致）
  const EXCEL_HEADERS = [
    '采收日期', '入库单号', '来源编码', '采收形态', '产物序号', '作物编码', '作物名称',
    '作物品种', '采收数量', '单位', '品质', '采收形态(产物)', '单价(元)',
    '仓库', '采收员', '操作员', '补录', '补录原因', '备注', '创建时间',
  ] as const

  // 2026-07-01: 解析 harvest_records.products 字段（JSON 字符串 → InboundProduct[]）
  // 入库时后端把整组 products 存成 JSON.stringify(input.products)，前端读出后 JSON.parse
  function parseProductsField(productsField: unknown): InboundProduct[] {
    if (!productsField) return []
    if (Array.isArray(productsField)) return productsField as InboundProduct[]
    if (typeof productsField === 'string') {
      try {
        const parsed = JSON.parse(productsField)
        return Array.isArray(parsed) ? (parsed as InboundProduct[]) : []
      } catch {
        return []
      }
    }
    return []
  }

  // 2026-07-01: 导出历史记录为 Excel（用 xlsx 库，按"每个 product 1 行"展开）
  // 1 条入库记录 = 1..N 条 product（种源/育苗=1，种植=多产物），导出时按产物展开方便审计
  const handleExportExcel = () => {
    if (historyRecords.length === 0) {
      showAlert('暂无采收记录可导出')
      return
    }
    // 共用工具：从 harvest_records + products 数组里提 1 行数据
    const harvesterNamesStr = (r: any): string => {
      try {
        const arr = typeof r.harvesterNames === 'string' ? JSON.parse(r.harvesterNames) : r.harvesterNames
        return Array.isArray(arr) ? arr.join('、') : ''
      } catch { return '' }
    }
    const buildRow = (r: any, p: any, idx: number): Record<string, unknown> => ({
      '采收日期': r.harvestDate || '',
      '入库单号': r.harvestCode || r.id,
      '来源编码': r.sourceCode || '',
      '采收形态': r.harvestForm || '',
      '产物序号': idx > 0 ? idx + 1 : '',
      '作物编码': p.cropCode || '',
      '作物名称': p.cropName || '',  // 2026-07-01: 字段名改（产物名 → 作物名称）
      '作物品种': p.cropVariety || '',  // 2026-07-01: 字段名改（品种 → 作物品种）
      '采收数量': p.harvestQuantity ?? '',
      '单位': p.unit || '',
      '品质': gradeLabel(p.grade),  // 2026-07-01: 品质英→中
      '采收形态(产物)': p.sourceForm || p.productForm || '',
      '单价(元)': r.unitPrice ?? '',
      '仓库': r.warehouseName || r.warehouseId || '',
      '采收员': harvesterNamesStr(r),
      '操作员': r.operator || r.operatorName || r.createBy || '',
      '补录': r.isSupplementary ? '是' : '否',
      '补录原因': r.supplementaryReason || '',
      '备注': p.remarks || r.remarks || r.notes || '',
      '创建时间': r.createTime || '',
    })
    const rows: Record<string, unknown>[] = []
    for (const r of historyRecords) {
      const products = parseProductsField((r as any).products)
      if (products.length === 0) {
        rows.push(buildRow(r, {}, 0))
      } else {
        products.forEach((p, idx) => rows.push(buildRow(r, p, idx)))
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows, { header: [...EXCEL_HEADERS] })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '采收记录')
    const filename = `采收记录_${sourceRecord.code}_${todayLocal()}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  // 2026-07-01: 删除 1 条采收记录（弹窗删除按钮）
  const deleteRecord = useHarvestRecordStore((s) => s.deleteRecord)
  const deletingIds = useHarvestRecordStore((s) => s.deletingIds)
  const handleDeleteRecord = async (recordId: string) => {
    const ok = await showConfirm('确定删除这条采收记录？\n将同时删除对应的库存实例、入库审计和流水。')
    if (!ok) return
    try {
      const success = await deleteRecord(recordId, sourceModule, sourceRecord.id || '')
      if (success) {
        showAlert('删除成功', { title: '成功' })
      }
    } catch (e: any) {
      showAlert(e?.message || '删除失败')
    }
  }

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

        {/* 基础字段单行布局：5 个字段（采收日期 / 目标仓库 / 单价 / 采收员 / 操作员）同行展示。
            采收员占 4 列（多选 chip 区域需要更宽），其他各占 2 列，合计 12。 */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-2">
            <FormField label="采收日期" required>
              <DatePicker
                className="w-full"
                selected={harvestDate ? new Date(harvestDate) : undefined}
                onChange={(date) => setHarvestDate(todayLocal(date))}
              />
            </FormField>
          </div>
          <div className="col-span-2">
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
          </div>
          <div className="col-span-2">
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
          </div>
          <div className="col-span-4">
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
          </div>
          <div className="col-span-2">
            <FormField label="操作员">
              <Input
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder="默认当前登录人员"
                className={deepInputClass}
              />
            </FormField>
          </div>
        </div>

        {/* 2026-06-30 Bug 21：顶部"种源形态"Select 已删除，统一走产品明细 sourceForm
            （详见本 commit message 解释） */}

        {/* 2026-06-27：成品类型（仅种植行入库可选）
            —— 因为同一棵植株在不同阶段可采收不同产物，每次入库独立选择 */}
        {sourceModule === 'planting' && (
          <FormField label="成品类型">
            <Select value={harvestForm} onValueChange={setHarvestForm}>
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="选择本次采收的成品类型（可选）" />
              </SelectTrigger>
              <SelectContent>
                {HARVEST_FORMS.map((o) => (
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
            {products.map((p, idx) => {
              // 2026-07-01：所有产品明细字段同一行展示。
              // 种源行（sourceModule === 'seed_source'）不显示"采收形态"，列宽自动补齐。
              const showSourceForm = sourceModule !== 'seed_source'
              return (
                <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                  <div className="grid grid-cols-12 gap-2">
                    <div className={showSourceForm ? 'col-span-2' : 'col-span-3'}>
                      <div className="text-xs text-gray-500 mb-1">作物名称</div>
                      <Input
                        value={p.cropName}
                        onChange={(e) => updateProduct(idx, { cropName: e.target.value })}
                        className={deepInputClass}
                        disabled={productsLocked}
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-gray-500 mb-1">作物品种</div>
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
                    <div className="col-span-1">
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
                    {/* 2026-06-19: 种源形态已表达入库类型，产品内"采收形态"仅非种源行显示
                        避免与"种源形态"字段语义重复 */}
                    {showSourceForm && (
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
                    <div className={showSourceForm ? 'col-span-2' : 'col-span-3'}>
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
              )
            })}
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

        {/* 2026-07-01: 弹窗底部"采收记录"历史表（仿照种植 HarvestRecordModal 样式）
            数据来自 harvest_records 表按 (source_module, source_id) 过滤
            每条入库记录按 products 数组展开成多行（与 Excel 导出列保持一致）
            品质英→中、导出按钮绿色、加删除按钮 */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">
              采收记录（{historyRecords.length} 条）
              {historyLoading && <span className="ml-2 text-xs text-gray-500">加载中…</span>}
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleExportExcel}
              disabled={historyRecords.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Download className="w-4 h-4 mr-1" /> 导出 Excel
            </Button>
          </div>
          {historyRecords.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg">
              {historyLoading ? '正在加载采收记录…' : '暂无采收记录'}
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-blue-500 text-white sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left whitespace-nowrap">采收日期</th>
                    <th className="px-2 py-2 text-left whitespace-nowrap">入库单号</th>
                    <th className="px-2 py-2 text-left">作物名称</th>
                    <th className="px-2 py-2 text-left">作物品种</th>
                    <th className="px-2 py-2 text-right whitespace-nowrap">采收数量</th>
                    <th className="px-2 py-2 text-left">单位</th>
                    <th className="px-2 py-2 text-left">采收形态</th>
                    <th className="px-2 py-2 text-left">品质</th>
                    <th className="px-2 py-2 text-left">仓库</th>
                    <th className="px-2 py-2 text-left">采收员</th>
                    <th className="px-2 py-2 text-left">操作员</th>
                    <th className="px-2 py-2 text-left">补录</th>
                    <th className="px-2 py-2 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRecords.flatMap((r) => {
                    const products = parseProductsField((r as any).products)
                    let harvesterStr = ''
                    try {
                      const arr = typeof (r as any).harvesterNames === 'string'
                        ? JSON.parse((r as any).harvesterNames)
                        : (r as any).harvesterNames
                      harvesterStr = Array.isArray(arr) ? arr.join('、') : ''
                    } catch { /* ignore */ }
                    const isDeleting = !!deletingIds[r.id]
                    // 没有 products 详情时也展示 1 行（汇总级）
                    if (products.length === 0) {
                      return [
                        <tr key={r.id} className="hover:bg-gray-50 align-top">
                          <td className="px-2 py-1.5 whitespace-nowrap">{r.harvestDate || '-'}</td>
                          <td className="px-2 py-1.5 font-mono text-xs">{(r as any).harvestCode || r.id}</td>
                          <td className="px-2 py-1.5" colSpan={6}><span className="text-gray-400">（无产品明细）</span></td>
                          <td className="px-2 py-1.5">{r.warehouseName || r.warehouseId || '-'}</td>
                          <td className="px-2 py-1.5 text-xs">{harvesterStr || '-'}</td>
                          <td className="px-2 py-1.5">{(r as any).operator || r.operatorName || r.createBy || '-'}</td>
                          <td className="px-2 py-1.5 text-xs">
                            {(r as any).isSupplementary
                              ? <span className="text-amber-600">是（{(r as any).supplementaryReason || '无原因'}）</span>
                              : <span className="text-gray-400">否</span>}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRecord(r.id)}
                              disabled={isDeleting}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>,
                      ]
                    }
                    return products.map((p, idx) => (
                      <tr key={`${r.id}-${idx}`} className="hover:bg-gray-50 align-top">
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.harvestDate || '-'}</td>
                        <td className="px-2 py-1.5 font-mono text-xs">{(r as any).harvestCode || r.id}</td>
                        <td className="px-2 py-1.5 font-medium">{p.cropName || '-'}</td>
                        <td className="px-2 py-1.5">{p.cropVariety || '-'}</td>
                        <td className="px-2 py-1.5 text-right text-emerald-700 font-medium">{p.harvestQuantity ?? 0}</td>
                        <td className="px-2 py-1.5">{p.unit || '-'}</td>
                        <td className="px-2 py-1.5">{p.sourceForm || p.productForm || (r as any).harvestForm || '-'}</td>
                        <td className="px-2 py-1.5">{gradeLabel(p.grade) || '-'}</td>
                        <td className="px-2 py-1.5">{r.warehouseName || r.warehouseId || '-'}</td>
                        <td className="px-2 py-1.5 text-xs">{harvesterStr || '-'}</td>
                        <td className="px-2 py-1.5">{(r as any).operator || r.operatorName || r.createBy || '-'}</td>
                        <td className="px-2 py-1.5 text-xs">
                          {(r as any).isSupplementary
                            ? <span className="text-amber-600">是（{(r as any).supplementaryReason || '无原因'}）</span>
                            : <span className="text-gray-400">否</span>}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {idx === 0 ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRecord(r.id)}
                              disabled={isDeleting}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 底部按钮已移到 Modal footer prop（避免双"取消"按钮） */}
      </div>
    </Modal>
  )
}

export default UnifiedRowHarvestInboundModal
