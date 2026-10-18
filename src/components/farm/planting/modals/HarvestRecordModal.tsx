/**
 * 种植采收记录 + 总结束 弹窗 (Phase 1: 2026-06-17)
 * 仿照 DailyRecordModal 结构
 * 5 种 destination + 历史记录表 + 4 列累计 + 总结束按钮
 *
 * ============================================================================
 * 2026-06-19 重要说明 (unify-harvest-inbound-into-source-operations change)：
 * ============================================================================
 * 本弹窗存在两套并行的"采收"语义，请勿混淆：
 *
 * 1. 本弹窗的"harvest"去向 = 写入 `planting_harvest_records` 表（种植内部采收审计）
 *    - 不写入 inventory_stock
 *    - 不触发跨页库存刷新
 *    - 仅在种植内部记录"什么时候结束了、怎么结束的"
 *
 * 2. 行级"采收入库"操作列（Package 图标）= 走 `UnifiedRowHarvestInboundModal`
 *    - 调 `POST /api/inventory/inbound-from-source`
 *    - 写入 harvest_records（审计归档表）+ inventory_stock + inventory_inbound_records + inventory_transaction
 *    - 触发 useInventoryStore.notifyChange() 跨页刷新
 *    - 是入库主流程
 *
 * 用户操作建议：
 * - 想让种植产物"入库" → 用行级"采收入库"按钮
 * - 想记录"种植结束但不入库"（内部循环/转种源/销毁/切分）→ 用本弹窗
 *
 * D6 决策：暂不合并两套链路，两套并存。
 * ============================================================================
 */
import React, { useState, useEffect, useMemo } from 'react'
// 2026-07-13 方案 B：删除 useNavigate import（补录跳转已废除）
import { UnifiedModal } from '@/components/ui'
import { Planting, PlantingHarvestRecord } from '../../../../types/crop'
import type { EndType } from '../../../../types/cropCirculation'
import type { AddHarvestRecordInput } from '@/services/apiPlantingService'
import { showAlert, showConfirm } from '@/lib/dialogService'
import { usePlantingStore } from '@/stores/usePlantingStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useWarehouseStore } from '@/stores/useWarehouseStore'
import { useDictionaryStore, getDictItems, getDictItemName } from '@/stores/useDictionaryStore'
import { useUserStore } from '@/stores/useUserStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { useSeedSourceStore } from '@/stores/useSeedSourceStore'
import { todayLocal } from '@/lib/dateUtils'
// 2026-10-19：作物名称/品种以品种库为权威（修复历史字段反置导致入库记录串字段）
import * as apiCropVarietyService from '@/services/apiCropVarietyService'
// 2026-06-19: 采收入库（destination='harvest'）走库存主链路
// 字段集参照行级采收入库弹窗 UnifiedRowHarvestInboundModal（种源/育苗/种植 3 页面共用一致）
// 提交到 POST /api/inventory/inbound-from-source → 4 表写入 + 跨页刷新
import { submitUnifiedInbound, type InboundProduct } from '@/services/unifiedHarvestInboundService'
// 2026-10-09：种植自留种走育苗补录审批流（之前 addHarvestRecord 是完成即生效，不进审批）
// 2026-10-16：种植自留种取消补录审批 → 移除 submitSeedlingSupplementaryApplication import（改直连 addHarvestRecord）

interface HarvestRecordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  record: Planting
}

/** 解析后端错误信息（Zod JSON 错误可能为数组） */
function parseErrorMessage(raw: string | undefined): string {
  if (!raw) return '操作失败'
  try {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr) && arr[0]?.message) {
      return arr[0].message
    }
  } catch {
    // 不是 JSON
  }
  return raw
}

import {
  getDestinationLabel,
  getSubTypeLabel,
  type SubType,
  type UserLite,
  type WarehouseLite,
} from './harvest-modal/helpers'
// 2026-10-18：大组件拆分 —— 表单/产品明细/历史区移入 ./harvest-modal/*（纯移动，无逻辑变更）
import { HarvestFormSection } from './harvest-modal/HarvestFormSection'
import { HarvestProductSection } from './harvest-modal/HarvestProductSection'
import { HarvestHistorySection } from './harvest-modal/HarvestHistorySection'

export function HarvestRecordModal({ isOpen, onClose, onSuccess, record }: HarvestRecordModalProps) {
  // 2026-07-06：去向默认值改为「采收入库」(harvest)，原为 null（用户手动选择）
  // 理由：种植行操作列的"采收与结束"入口进入此弹窗，采收入库是最常见去向
  const [destination, setDestination] = useState<EndType | null>('harvest')
  // 2026-07-03：删除错误信息（固定在弹窗内显示，不用 showAlert/toast 一闪而过）
  const [deleteError, setDeleteError] = useState<{
    message: string
    blockingRecords?: any[]
    blockingTransactions?: any[]
  } | null>(null)
  const [subType, setSubType] = useState<SubType>('cutting')
  const [quantity, setQuantity] = useState<number | string>(0)
  // 2026-07-01 P0-4 修复：单位初值用 record.unit 优先，没有再 fallback 到 '克'
  // 原因：硬编码 '克' 导致默认单位与 record.unit（一般是 '株'）不一致，每次都要手动切换
  const [unit, setUnit] = useState<string>(record.unit || '克')
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [recordDate, setRecordDate] = useState<string>(todayLocal())
  const [submitting, setSubmitting] = useState(false)
  // 2026-06-19: 采收形态（仅 destination='harvest' 必填）— 区分果实/种子/种苗/枝条等
  const [sourceForm, setSourceForm] = useState<string>('')
  // 2026-07-18: 种源合并键 — 用户输入世代（planting_self_kept 模式）
  const [generation, setGeneration] = useState<string>('')

  // 2026-07-18: 合并推荐 — MergePreview 回调状态
  // matchedUnitSource: 推荐种源的单位（用于自动填充）
  const [matchedUnitSource, setMatchedUnitSource] = useState<{ id: string; sourceCode: string; unit: string } | null>(null)
  // 单位是否被自动推荐（用于显示「✨ 自动」标签）
  const [unitAutoRecommended, setUnitAutoRecommended] = useState<boolean>(false)
  // 2026-07-18: 用户选择强制新建（即使有匹配也不合并）
  const [forceNew, setForceNew] = useState<boolean>(false)

  // ============ 2026-06-19: 采收入库字段（参照行级采收入库弹窗 UnifiedRowHarvestInboundModal）============
  // 字段集与行级"采收入库"图标弹窗一致：操作员/采收员多选/产品明细(多产物) + 复用上方 6 字段（2026-07-06：单价字段已删除）
  const [operator, setOperator] = useState<string>('')               // 操作员
  const [harvesterIds, setHarvesterIds] = useState<string[]>([])     // 采收人员 ID
  const [harvesterNames, setHarvesterNames] = useState<string[]>([]) // 采收人员姓名
  const [harvesterPopoverOpen, setHarvesterPopoverOpen] = useState(false)
  // 2026-07-06：删除单价字段（用户需求：去除单价），后端 unit_price 默认为 0
  // 产品明细（多产物表，种植行允许多条：果实/种子/枝条/种苗等）
  const [products, setProducts] = useState<InboundProduct[]>([
    {
      cropCode: record.cropCode || '',
      // 2026-10-19：不再对 cropName/cropVariety 做盲交换（种植表新老数据语义混用）。
      // 品种库命中时由下方 useEffect 用权威值覆盖；未命中保留种植单原值。
      cropName: record.cropName || '',
      cropVariety: record.cropVariety || '',
      plantingMode: '',
      harvestQuantity: 0,
      unit: record.unit || '克',
      grade: '',
      sourceForm: '',
      // 2026-06-30 Bug 12 修复：成品形态（果实/种子/花朵/枝条/整株/其他）
      // 与顶部"采收形态"下拉联动（useEffect 同步）
      productForm: '',
    },
  ])

  // 2026-06-19: 操作员，默认 = 当前登录人员姓名
  const currentUser = useAuthStore((s) => s.currentUser)

  const addHarvestRecord = usePlantingStore((s) => s.addHarvestRecord)
  const harvestRecordsMap = usePlantingStore((s) => s.harvestRecords)
  const loadHarvestRecords = usePlantingStore((s) => s.loadHarvestRecords)
  const deleteHarvestRecord = usePlantingStore((s) => s.deleteHarvestRecord)
  const endPlantingAction = usePlantingStore((s) => s.endPlanting)

  const warehouses = useWarehouseStore((s) => s.warehouses)
  const loadWarehouses = useWarehouseStore((s) => s.loadWarehouses)

  // 2026-06-19: 用户列表（采收员多选 + 操作员/审核员来源）
  const users = useUserStore((s) => s.users)
  const loadUsers = useUserStore((s) => s.loadUsers)

  // 2026-06-18: 单位字典（袋/株/粒/千克/克/吨/亩）
  const dictionaries = useDictionaryStore((s) => s.dictionaries)
  const loadDictionaries = useDictionaryStore((s) => s.loadDictionaries)
  const unitOptions = useMemo(
    () => getDictItems('unit').map((d) => d.dictCode).filter(Boolean),
    [dictionaries]
  )

  // 弹窗打开时加载数据
  useEffect(() => {
    if (isOpen) {
      if (warehouses.length === 0) {
        void loadWarehouses()
      }
      if (dictionaries.length === 0) {
        void loadDictionaries()
      }
      if (users.length === 0) {
        void loadUsers()
      }
      void loadHarvestRecords(record.id)
      // 2026-06-19: 采收入库默认值同步当前登录人员
      if (currentUser?.realName && !operator) {
        setOperator(currentUser.realName)
      }
      // 2026-07-01 P0-4 修复：每次弹窗打开/record 切换时，强制同步 record.unit 与表单 unit
      if (record.unit) {
        setUnit(record.unit)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, warehouses.length, loadWarehouses, loadHarvestRecords, record.id, dictionaries.length, loadDictionaries, users.length, loadUsers, currentUser?.realName, record.unit])

  const harvestRecords: PlantingHarvestRecord[] = harvestRecordsMap[record.id] || []
  const activeWarehouses = warehouses.filter((w: WarehouseLite) => !w.status || w.status === 'active')

  // 2026-06-30 Bug 12 修复：顶部"采收形态"选择 → 自动同步到 products[0].productForm
  // 原因：submitUnifiedInbound 入参 products[].productForm 是写入 inventory_stock.product_form 的唯一通道
  //       种植行单一产物（单条 product），不需要多形态选择，把顶部 sourceForm 同步过去即可
  useEffect(() => {
    if (!sourceForm) return
    setProducts((prev) => prev.map((p, i) => (i === 0 ? { ...p, productForm: sourceForm } : p)))
  }, [sourceForm])

  // 2026-10-19：作物名称/品种以品种库为权威（品种库语义：variety_name=作物名称、sub_variety1_name=品种）。
  // 命中时覆盖产品明细初始值；未命中保留种植单原值（新数据语义正常）。
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    apiCropVarietyService.getAllVarieties()
      .then((list) => {
        if (cancelled) return
        const v = list.find((x) => x.cropCode === record.cropCode)
        if (!v) return
        const cropName = v.varietyName || record.cropName || ''
        const cropVariety = v.subVariety1Name || v.varietyName || record.cropVariety || ''
        setProducts((prev) => prev.map((p) => ({ ...p, cropName, cropVariety })))
      })
      .catch((error) => {
        console.error('[HarvestRecordModal] 加载品种库失败:', error)
      })
    return () => { cancelled = true }
  }, [isOpen, record.cropCode, record.cropName, record.cropVariety])

  const hasSeedSource = !!record.sourceId
  const requiresWarehouse = destination === 'harvest'
  // 2026-06-29: 合并 planting_self_kept 替代 circulate + self_seed
  // 老值 'circulate' / 'self_seed' 仍兼容：编辑历史记录时仍能展示，但新建时已不允许
  const requiresSelfKept = destination === 'planting_self_kept' || destination === 'circulate' || destination === 'self_seed'

  // 数量类型（必填 > 0）；PROPAGATION（cutting/seed_saving）不需
  const isQuantityType = subType === 'quantity_refill'
  const isPropagationType = subType === 'cutting' || subType === 'seed_saving'

  // 2026-07-09：dispose 功能已下线（与每日记录"损耗"语义重叠），相关计算/校验全部移除
  // 活体剩余公式仅在 DailyRecordModal 的损耗字段使用：
  //   活体剩余 = plantingCount + supplementCount - lossCount

  const resetForm = () => {
    // 2026-07-06：与初始默认值保持一致，重置时仍回到「采收入库」
    setDestination('harvest')
    setSubType('cutting')
    setQuantity(0)
    setWarehouseId('')
    setNotes('')
    // 2026-07-18: 合并推荐相关状态重置
    setMatchedUnitSource(null)
    setUnitAutoRecommended(false)
    setForceNew(false)
    // 2026-06-19: 采收入库字段重置
    setHarvesterIds([])
    setHarvesterNames([])
    setProducts([{
      cropCode: record.cropCode || '',
      // 2026-10-19：不再盲交换，品种库命中时由 useEffect 覆盖为权威值
      cropName: record.cropName || '',
      cropVariety: record.cropVariety || '',
      plantingMode: '',
      harvestQuantity: 0,
      unit: record.unit || '克',
      grade: '',
      sourceForm: '',
      // 2026-06-30 Bug 12 修复：成品形态重置
      productForm: '',
    }])
  }

  // 2026-06-19: 采收入库产品明细操作函数（与行级弹窗一致；种植行锁死 1 条，无 add/remove）
  const updateProduct = (idx: number, patch: Partial<InboundProduct>) => {
    setProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  // 2026-06-19: 采收人员切换
  const toggleHarvester = (u: UserLite) => {
    const name = u.realName || u.real_name || u.username || ''
    const id = u.oid || u.id || `H${harvesterNames.length}`
    if (harvesterNames.includes(name)) {
      setHarvesterNames((prev) => prev.filter((n) => n !== name))
      setHarvesterIds((prev) => prev.filter((_, i) => harvesterNames[i] !== name))
    } else {
      setHarvesterNames((prev) => [...prev, name])
      setHarvesterIds((prev) => [...prev, id])
    }
  }

  // 2026-06-19: 品质等级（与行级采收入库弹窗一致）
  const qualityGradeOptions = [
    { value: 'special', label: '特优' },
    { value: 'excellent', label: '优' },
    { value: 'good', label: '良' },
    { value: 'qualified', label: '合格' },
    { value: 'unqualified', label: '不合格' },
  ]

  const handleAdd = async () => {
    if (!destination) {
      showAlert('请选择去向')
      return
    }
    // 2026-06-29: 合并 planting_self_kept 替代旧 circulate / self_seed
    if (requiresSelfKept && !hasSeedSource) {
      showAlert('该种植记录无种源,无法回流')
      return
    }
    if (requiresWarehouse && !warehouseId) {
      showAlert('采收入库必须选择仓库')
      return
    }

    // 数量 + 单位校验（仅对非 harvest 去向必填 — 2026-06-19）
    // harvest 由下方产品明细承担数量+单位，顶部不重复显示
    const qtyNum = Number(quantity) || 0
    if (destination && destination !== 'harvest' && qtyNum <= 0) {
      showAlert('请填写数量（> 0）')
      return
    }
    // 2026-07-09：dispose 上限校验移除（功能已下线）
    if (destination && destination !== 'harvest' && !unit) {
      showAlert('请选择单位')
      return
    }
    if (destination && destination !== 'harvest' && unitOptions.length > 0 && !unitOptions.includes(unit)) {
      showAlert('单位无效，请从下拉选择')
      return
    }
    // 2026-06-19: destination='harvest' 必须选采收形态（区分果实/种子/种苗/枝条等）
    if (destination === 'harvest' && !sourceForm) {
      showAlert('请选择采收形态（果实/种子/种苗/枝条等）')
      return
    }
    // 2026-06-29: planting_self_kept 必须选采收形态（用于 seed_sources.seed_form）
    if (destination === 'planting_self_kept' && !sourceForm) {
      showAlert('种植自留种必须选择采收形态（果实/种子/种苗/穗条/枝条/块根/块茎/鳞茎/叶片/花朵/整株/其他）')
      return
    }

    // 2026-07-09 v5 阶段三（路径 B）：补录已下沉到库存页 AddStockModal 统一入口
    // 种植/育苗行点"采收入库"按钮 → navigate → 库存页 → 预填 sourceId + 必填补录原因
    // 本弹窗（HarvestRecordModal）只服务于"种植进行中"的正常采收场景，不再处理补录

    // 2026-06-19: 采收入库（destination='harvest'）走库存主链路 submitUnifiedInbound
    // 写入 harvest_records + inventory_stock + inventory_inbound_records + inventory_transaction 4 张表
    // 字段集与行级"采收入库"图标弹窗 (UnifiedRowHarvestInboundModal) 一致
    if (destination === 'harvest') {
      // 校验产品明细
      if (products.length === 0 || products.every((p) => !p.harvestQuantity || p.harvestQuantity <= 0)) {
        showAlert('请至少填写 1 条产品明细（采收数量 > 0）')
        return
      }
      for (let i = 0; i < products.length; i++) {
        const p = products[i]
        if (!p.cropName) {
          showAlert(`第 ${i + 1} 行：产物名必填`)
          return
        }
        if (!p.harvestQuantity || p.harvestQuantity <= 0) {
          showAlert(`第 ${i + 1} 行：采收数量必须 > 0`)
          return
        }
        if (!p.unit) {
          showAlert(`第 ${i + 1} 行：单位必填`)
          return
        }
      }

      setSubmitting(true)
      try {
        const warehouse = activeWarehouses.find((w: WarehouseLite) => w.id === warehouseId || w.oid === warehouseId)
        const result = await submitUnifiedInbound({
          stockType: 'product',
          sourceModule: 'planting',
          sourceRecordId: record.id,
          sourceRecordCode: record.plantCode,
          harvestDate: recordDate,
          // 2026-06-19: greenhouse_name / planting_mode 由后端反查 plantings 表兜底（前端不传避免依赖 record 上的运行时字段）
          greenhouseIds: [],
          greenhouseNames: [],
          harvesterIds,
          harvesterNames,
          remarks: notes || undefined,
          unit,
          warehouseId,
          warehouseName: warehouse?.name,
          products: products.map((p) => ({
            ...p,
            harvestQuantity: Number(p.harvestQuantity) || 0,
          })),
          operatorName: harvesterNames[0] || operator || currentUser?.realName || 'system',
        })
        if (result.success) {
          showAlert(`采收入库成功！\n入库单号：${result.data?.harvestCode}\n入库库存：${result.data?.stockIds.length} 条`)
          // 跨页通知库存订阅者
          // 2026-07-10 P0-6 修复：catch(_) {} → catch(e) { console.warn(...) }（避免静默吞错）
          try { useInventoryStore.getState().notifyChange?.() } catch (e) { console.warn('[HarvestRecordModal] 跨页库存通知失败:', e) }
          // 同步写入 planting_harvest_records（保留去向累计）
          // harvest 分支顶部 unit 为空（由产品明细承担），此处取 products[0].unit 兜底
          const totalQty = products.reduce((s, p) => s + (Number(p.harvestQuantity) || 0), 0)
          await addHarvestRecord(record.id, {
            recordDate,
            destination: 'harvest',
            warehouseId,
            warehouseName: warehouse?.name,
            quantity: totalQty,
            unit: products[0]?.unit || '',
            notes,
            createBy: currentUser?.realName || 'system',
            operatorName: currentUser?.realName || 'system',
            // sourceForm 由固定形态下拉（SEED_FORM_OPTIONS / 硬编码 SelectItem）写入，
            // 取值域与 seedForm 一致；此处仅做类型断言，运行时值不变
            seedForm: sourceForm as AddHarvestRecordInput['seedForm'],
            // 2026-10-18 P0 修复：回写入库记录/库存实例 ID，供后续删除/编辑精确回滚
            harvestRecordId: result.data?.harvestRecordId,
            inventoryStockId: result.data?.stockIds?.[0],
          })
          resetForm()
          onSuccess?.()
        } else {
          showAlert(result.error || '采收入库失败')
        }
      } catch (e) {
        // 2026-07-10 P0-2 修复：catch(e) + instanceof 守卫（parseErrorMessage 接收 string 参数）
        showAlert(parseErrorMessage(e instanceof Error ? e.message : '采收入库失败'))
      } finally {
        setSubmitting(false)
      }
      return
    }

    setSubmitting(true)
    try {
      // 2026-06-29: 合并 planting_self_kept 替代旧 circulate / self_seed
      // - 老值（circulate/self_seed）作为历史值仍可被后端接受（编辑历史记录）
      // - 新建只能选 planting_self_kept
      // - subType 前端不再传（由后端基于 seedForm 派生）
      // 2026-07-09：dispose 已下线，destination 只剩 harvest / planting_self_kept 两种
      const inputDestination: AddHarvestRecordInput['destination'] =
        destination === 'planting_self_kept' ? 'planting_self_kept'
        : 'harvest'

      const input: AddHarvestRecordInput = {
        recordDate,
        destination: inputDestination,
        subType: undefined,  // 2026-06-29: 前端不再传 subType（后端基于 seedForm 派生）
        generation: destination === 'planting_self_kept' ? (generation || '') : '',  // 2026-07-18: 种源合并键 — 2026-08-16 后端 Zod schema 用 z.string().optional()，不接 null
        forceNew: destination === 'planting_self_kept' ? forceNew : undefined,  // 2026-07-18: 用户选择强制新建
        // 2026-07-02: harvest 分支也写形态（该分支已在 376 行 return，此处只需判 requiresSelfKept）
        seedForm: requiresSelfKept ? (sourceForm as AddHarvestRecordInput['seedForm']) : undefined,
        warehouseId: requiresWarehouse ? warehouseId : undefined,
        warehouseName: requiresWarehouse
          ? activeWarehouses.find((w: WarehouseLite) => w.id === warehouseId || w.oid === warehouseId)?.name
          : undefined,
        quantity: qtyNum,
        unit,
        notes,
        createBy: currentUser?.realName || 'system',
        // 2026-07-18：种植自留种模式补传 operatorId（默认当前登录人员）
        // - 与采收入库模式（已通过 UnifiedRowHarvestInboundModal 处理）对称
        // - 后端 executeCirculation → crop_circulation_records.operator_id，用于种源追溯时间线「操作员」列
        operatorId: requiresSelfKept ? (currentUser?.oid || undefined) : undefined,
        operatorName: currentUser?.realName || 'system',
      }

      // 2026-10-16：取消种植自留种的补录审批（用户决策）——种植自留种是正常留种采收，不属于补录范畴。
      //   改回直连回流：POST /plantings/:id/harvest-records → executeCirculation（同步写 circulation/种源/flow/PHR）。
      //   补录审批保留给「作物库存新建入库补录」（AddStockModal → crop_storage 联动）。
      //   input 已按 destination 构造（含 planting_self_kept 的 seedForm/generation/forceNew 等）。
      const result = await addHarvestRecord(record.id, input);
      if (result) {
        showAlert(destination === 'planting_self_kept' ? '种植自留种采收成功，已回流至种源' : '采收记录添加成功');
        if (requiresSelfKept) {
          try { await useSeedSourceStore.getState().loadItems() } catch (e) { console.warn('[HarvestRecordModal] 刷新种源列表失败:', e) }
        }
        resetForm();
        onSuccess?.();
      } else {
        showAlert('添加失败');
      }
    } catch (e) {
      // 2026-07-10 P0-2 修复：catch(e) + instanceof 守卫
      showAlert(parseErrorMessage(e instanceof Error ? e.message : ''))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (recordId: string) => {
    setDeleteError(null)  // 清上次的错误
    const ok = await showConfirm('确定删除这条采收记录？\n将同时撤销对应的库存/回流副作用。')
    if (!ok) return
    try {
      const success = await deleteHarvestRecord(record.id, recordId)
      if (success) {
        setDeleteError(null)
        onSuccess?.()
      }
    } catch (e) {
      // 2026-07-10 P0-2 修复：catch(e) + 自定义属性 narrowing
      const err = e as { message?: string; blockingRecords?: any[]; blockingTransactions?: any[] }
      // 2026-07-03：固定在弹窗内显示阻挡详情（替代 showAlert/toast 一闪而过）
      const blockingRecords = err.blockingRecords || []
      const blockingTransactions = err.blockingTransactions || []
      const baseMsg = err.message || '无法删除'
      if (blockingRecords.length > 0) {
        setDeleteError({ message: baseMsg, blockingRecords })
      } else if (blockingTransactions.length > 0) {
        setDeleteError({ message: baseMsg, blockingTransactions })
      } else {
        setDeleteError({ message: baseMsg })
      }
    }
  }

  const handleTotalEnd = async () => {
    const ok = await showConfirm('确定结束该种植？\n结束后将无法继续添加采收记录（软锁）。')
    if (!ok) return
    const success = await endPlantingAction(record.id, { status: 'ended', endType: 'harvest' })
    if (success) {
      showAlert('种植已结束')
      onSuccess?.()
      onClose()
    } else {
      showAlert('结束失败')
    }
  }

  const handleExport = () => {
    if (harvestRecords.length === 0) {
      showAlert('没有记录可导出')
      return
    }
    // 简单 CSV 导出（UTF-8 BOM 防 Excel 乱码）
    const headers = ['日期', '去向', '方式', '数量', '单位', '仓库', '操作员', '备注']
    const rows = harvestRecords.map((r) => [
      r.recordDate,
      getDestinationLabel(r.destination),
      getSubTypeLabel(r.subType),
      r.quantity.toString(),
      getDictItemName('unit', r.unit) || r.unit,
      r.warehouseName || r.warehouseId || '',
      r.operatorName || r.createBy || '',
      r.notes || '',
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `采收记录_${record.plantCode}_${todayLocal()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 2026-07-13 方案 B：删除补录跳转（统一在 InventoryV3 "补录入库"按钮内实现）
  // 保留 isSourceEnded 判定但不再渲染 SupplementaryJumpButton

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      // 2026-07-06：标题加上作物名+品种，方便用户选择"种植自留种"等去向时确认作物
      // 字段语义（基于 schema 注释）：
      //   cropName: 作物名称（最细化，如"满天星"、"红富士"）
      //   cropVariety: 作物品种（上一级品种名）
      // 注：record.cropName/cropVariety 在数据库里存在"字段名与值语义反"的旧 bug（见下方入库代码 swap），
      //     这里直接显示两个字段以提供完整信息
      // 2026-07-09 v6：弹窗内"补录"按钮（仅已结束/已取消行可见）→ 跳转 AddStockModal
      // 符合用户 v6 设计："必须有采收弹窗，弹窗内"补录"按钮跳转"
      title={(() => {
        const isSourceEnded = !!record.endTime || record.status === 'cancelled'
        return (
          <div className="flex items-center gap-3">
            <span>{`采收 - ${record.plantCode}（${record.cropName || ''} · ${record.cropVariety || ''}）`}</span>
          </div>
        )
      })()}
      size="xxxl"
      // 2026-08-16：关闭拖拽（useCenteredLayout=true）— size=xxxl 1350px 在 1280 视口下
      // centerX=(1280-1350)/2=-35，弹窗 absolute 定位超出左边界 → 用户看不到关闭/最大化按钮
      // Modal 内部 useCenteredLayout 分支已有 Math.min(width, window.innerWidth-32) 自适应视口
      enableDrag={false}
      // 2026-08-16：同时禁用手动 resize（弹窗已用最大 xxxl 尺寸，resize 手柄在边界外更糟）
      enableResize={false}
      showFooter={true}
      onSubmit={handleAdd}
      submitText={submitting ? '处理中...' : '添加记录'}
      cancelText=""
    >
      <div className="space-y-4">
        {/* 2026-07-09 v5 阶段三（路径 B）：补录模式已下沉到库存页 AddStockModal 统一入口
            种植行点"采收入库" → navigate → 库存页 → 预填 sourceId + 黄色 banner + 必填补录原因
            本弹窗（HarvestRecordModal）不再有补录模式 banner */}

        <HarvestFormSection
          record={record}
          recordDate={recordDate}
          setRecordDate={setRecordDate}
          destination={destination}
          setDestination={setDestination}
          sourceForm={sourceForm}
          setSourceForm={setSourceForm}
          hasSeedSource={hasSeedSource}
          quantity={quantity}
          setQuantity={setQuantity}
          unit={unit}
          setUnit={setUnit}
          unitAutoRecommended={unitAutoRecommended}
          setUnitAutoRecommended={setUnitAutoRecommended}
          matchedUnitSource={matchedUnitSource}
          setMatchedUnitSource={setMatchedUnitSource}
          operator={operator}
          setOperator={setOperator}
          generation={generation}
          setGeneration={setGeneration}
          forceNew={forceNew}
          setForceNew={setForceNew}
          subType={subType}
          setSubType={setSubType}
          warehouseId={warehouseId}
          setWarehouseId={setWarehouseId}
          activeWarehouses={activeWarehouses}
          users={users}
          harvesterNames={harvesterNames}
          setHarvesterNames={setHarvesterNames}
          harvesterIds={harvesterIds}
          setHarvesterIds={setHarvesterIds}
          harvesterPopoverOpen={harvesterPopoverOpen}
          setHarvesterPopoverOpen={setHarvesterPopoverOpen}
          toggleHarvester={toggleHarvester}
          unitOptions={unitOptions}
        />
        <HarvestProductSection
          destination={destination}
          products={products}
          updateProduct={updateProduct}
          unitOptions={unitOptions}
          qualityGradeOptions={qualityGradeOptions}
          notes={notes}
          setNotes={setNotes}
        />
        <HarvestHistorySection
          record={record}
          harvestRecords={harvestRecords}
          deleteError={deleteError}
          setDeleteError={setDeleteError}
          handleExport={handleExport}
          handleDelete={handleDelete}
        />
      </div>
    </UnifiedModal>
  )
}
