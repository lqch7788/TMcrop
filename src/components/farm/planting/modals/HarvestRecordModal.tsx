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
import { Label } from '@/components/ui'
import { UnifiedModal } from '@/components/ui'
import { Input, TextArea } from '@/components/ui'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { NumberInput } from '@/components/ui'
import { Button } from '@/components/ui'
import { Sprout, Trash2, Recycle, Package, Wheat, AlertTriangle, Download } from 'lucide-react'
import { Planting, PlantingHarvestRecord } from '../../../../types/crop'
import type { EndType } from '../../../../types/cropCirculation'
import type { AddHarvestRecordInput } from '@/services/apiPlantingService'
import { showAlert, showConfirm } from '@/lib/dialogService'
import { usePlantingStore } from '@/stores/usePlantingStore'
import { useWarehouseStore } from '@/stores/useWarehouseStore'
import { useDictionaryStore, getDictItems, getDictItemName } from '@/stores/useDictionaryStore'
import { todayLocal } from '@/lib/dateUtils'

interface HarvestRecordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  record: Planting
}

const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"

type SubType = 'cutting' | 'seed_saving' | 'quantity_refill' | 'quantity_inbound'

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

/** destination 中文标签映射（前端展示用） */
function getDestinationLabel(dest: string): string {
  const map: Record<string, string> = {
    harvest: '采收入库',
    circulate: '残株回种源',
    self_seed: '自交种子入种源',
    dispose: '直接废弃',
  }
  return map[dest] || dest
}

/** subType 中文标签映射 */
function getSubTypeLabel(sub: string | undefined): string {
  if (!sub) return '-'
  const map: Record<string, string> = {
    cutting: '扦插繁殖',
    seed_saving: '留种',
    quantity_refill: '数量回填',
    quantity_inbound: '数量入库存',
  }
  return map[sub] || sub
}

export function HarvestRecordModal({ isOpen, onClose, onSuccess, record }: HarvestRecordModalProps) {
  const [destination, setDestination] = useState<EndType | null>(null)
  const [subType, setSubType] = useState<SubType>('cutting')
  const [quantity, setQuantity] = useState<number | string>(0)
  // 2026-06-18: 单位默认值从字典选取，旧 'g' 兼容映射为 '克'
  const [unit, setUnit] = useState<string>('克')
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [recordDate, setRecordDate] = useState<string>(todayLocal())
  const [submitting, setSubmitting] = useState(false)
  // 2026-06-19: 采收形态（仅 destination='harvest' 必填）— 区分果实/种子/种苗/枝条等
  const [sourceForm, setSourceForm] = useState<string>('')

  const addHarvestRecord = usePlantingStore((s) => s.addHarvestRecord)
  const harvestRecordsMap = usePlantingStore((s) => s.harvestRecords)
  const loadHarvestRecords = usePlantingStore((s) => s.loadHarvestRecords)
  const deleteHarvestRecord = usePlantingStore((s) => s.deleteHarvestRecord)
  const endPlantingAction = usePlantingStore((s) => s.endPlanting)

  const warehouses = useWarehouseStore((s) => s.warehouses)
  const loadWarehouses = useWarehouseStore((s) => s.loadWarehouses)

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
      void loadHarvestRecords(record.id)
    }
    // 字典加载完成后，若 unit 仍为旧的 'g' 占位，尝试对齐到 '克'
    if (dictionaries.length > 0 && unit === '克' && record.unit && record.unit !== '克') {
      // 仅在 record.unit 已是字典值时切换
      if (unitOptions.includes(record.unit)) {
        setUnit(record.unit)
      } else if (record.unit === 'g' && unitOptions.includes('克')) {
        // 兼容旧数据 'g' 已是 '克'（默认占位），无需切换
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, warehouses.length, loadWarehouses, loadHarvestRecords, record.id, dictionaries.length, loadDictionaries])

  const harvestRecords: PlantingHarvestRecord[] = harvestRecordsMap[record.id] || []
  const activeWarehouses = warehouses.filter((w: any) => !w.status || w.status === 'active')

  const hasSeedSource = !!record.sourceId
  const requiresWarehouse = destination === 'harvest'
  const requiresCirculation = destination === 'circulate' || destination === 'self_seed'

  // 数量类型（必填 > 0）；PROPAGATION（cutting/seed_saving）不需
  const isQuantityType = subType === 'quantity_refill'
  const isPropagationType = subType === 'cutting' || subType === 'seed_saving'

  // 2026-06-18: dispose 剩余可处理植株数 = 种植数量 − 已废弃
  const remainingDispose = Math.max(0, (record.plantingCount || 0) - (record.disposeQty || 0))
  const disposeOverLimit = destination === 'dispose' && Number(quantity) > remainingDispose

  const resetForm = () => {
    setDestination(null)
    setSubType('cutting')
    setQuantity(0)
    setWarehouseId('')
    setNotes('')
  }

  const handleAdd = async () => {
    if (!destination) {
      showAlert('请选择去向')
      return
    }
    if (requiresCirculation && !hasSeedSource) {
      showAlert('该种植记录无种源,无法回流')
      return
    }
    if (requiresWarehouse && !warehouseId) {
      showAlert('采收入库必须选择仓库')
      return
    }

    // 数量 + 单位校验（5 个去向统一必填 — 2026-06-18）
    const qtyNum = Number(quantity) || 0
    if (destination && qtyNum <= 0) {
      showAlert('请填写数量（> 0）')
      return
    }
    // 2026-06-18: dispose 上限硬拦截（前端先挡，后端也会再挡）
    if (destination === 'dispose' && qtyNum > remainingDispose) {
      showAlert(`直接废弃数量 ${qtyNum} 超过剩余可废弃 ${remainingDispose}（种植 ${record.plantingCount} - 已废弃 ${record.disposeQty || 0}）`)
      return
    }
    if (destination && !unit) {
      showAlert('请选择单位')
      return
    }
    if (destination && unitOptions.length > 0 && !unitOptions.includes(unit)) {
      showAlert('单位无效，请从下拉选择')
      return
    }
    // 2026-06-19: destination='harvest' 必须选采收形态（区分果实/种子/种苗/枝条等）
    if (destination === 'harvest' && !sourceForm) {
      showAlert('请选择采收形态（果实/种子/种苗/枝条等）')
      return
    }

    setSubmitting(true)
    try {
      const input: AddHarvestRecordInput = {
        recordDate,
        destination: destination as AddHarvestRecordInput['destination'],
        subType: requiresCirculation ? subType : undefined,
        warehouseId: requiresWarehouse ? warehouseId : undefined,
        warehouseName: requiresWarehouse
          ? activeWarehouses.find((w: any) => w.id === warehouseId || w.oid === warehouseId)?.name
          : undefined,
        quantity: qtyNum,
        unit,
        notes,
        createBy: 'system',
        operatorName: 'system',
        // 2026-06-19: 采收形态（仅 harvest）
        sourceForm: destination === 'harvest' ? sourceForm : undefined,
      }
      const result = await addHarvestRecord(record.id, input)
      if (result) {
        showAlert('采收记录添加成功')
        resetForm()
        onSuccess?.()
      } else {
        showAlert('添加失败')
      }
    } catch (e: any) {
      showAlert(parseErrorMessage(e?.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (recordId: string) => {
    const ok = await showConfirm('确定删除这条采收记录？\n将同时撤销对应的库存/回流副作用。')
    if (!ok) return
    const success = await deleteHarvestRecord(record.id, recordId)
    if (success) {
      onSuccess?.()
    } else {
      showAlert('删除失败')
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

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`采收与结束 - ${record.plantCode}`}
      size="xxxl"
      showFooter={true}
      onSubmit={handleAdd}
      submitText={submitting ? '处理中...' : '添加记录'}
      cancelText="关闭"
    >
      <div className="space-y-4">
        {/* 表单区 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">添加新采收记录</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>采收日期 *</Label>
              <Input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className={deepInputClass}
              />
            </div>
            <div>
              <Label>去向 *</Label>
              <Select value={destination ?? ''} onValueChange={(v) => setDestination(v as EndType)}>
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="harvest">
                    <span className="flex items-center gap-1.5"><Wheat className="w-3.5 h-3.5" /> 采收入库</span>
                  </SelectItem>
                  <SelectItem value="circulate" disabled={!hasSeedSource}>
                    <span className="flex items-center gap-1.5"><Recycle className="w-3.5 h-3.5" /> 残株回种源</span>
                  </SelectItem>
                  <SelectItem value="self_seed" disabled={!hasSeedSource}>
                    <span className="flex items-center gap-1.5"><Sprout className="w-3.5 h-3.5" /> 自交种子入种源</span>
                  </SelectItem>
                  <SelectItem value="dispose">
                    <span className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> 直接废弃</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {!hasSeedSource && (
                <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> 该种植记录无种源, 回流相关选项已禁用
                </p>
              )}
            </div>
            {requiresCirculation && (
              <div>
                <Label>回流方式 *</Label>
                <Select value={subType} onValueChange={(v) => setSubType(v as SubType)}>
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {destination === 'circulate' ? (
                      <>
                        <SelectItem value="cutting">扦插繁殖（建新种源）</SelectItem>
                        <SelectItem value="seed_saving">留种（建新种源）</SelectItem>
                        <SelectItem value="quantity_refill">数量回填（追加到原种源）</SelectItem>
                      </>
                    ) : (
                      <SelectItem value="seed_saving">留种（建新种源）</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {requiresWarehouse && (
              <div>
                <Label>仓库 *</Label>
                {activeWarehouses.length === 0 ? (
                  <div>
                    <Input
                      value={warehouseId}
                      onChange={(e) => setWarehouseId(e.target.value)}
                      className={deepInputClass}
                      placeholder="请先在【基础数据-仓库】中创建仓库，或输入仓库 ID"
                    />
                    <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> 暂无可用仓库，请到【基础数据-仓库】中创建
                    </p>
                  </div>
                ) : (
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger className={deepInputClass}>
                      <SelectValue placeholder="请选择仓库" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeWarehouses.map((w: any) => (
                        <SelectItem key={w.id || w.oid} value={w.id || w.oid}>
                          {w.name || w.warehouseName || w.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            {/* 2026-06-19: 采收形态（仅 destination='harvest' 显示且必填）— 区分果实/种子/种苗/枝条等 */}
            {destination === 'harvest' && (
              <div>
                <Label>采收形态 *</Label>
                <Select value={sourceForm} onValueChange={setSourceForm}>
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue placeholder="选采收形态（果实/种子/种苗/枝条等）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="果实">果实</SelectItem>
                    <SelectItem value="种子">种子</SelectItem>
                    <SelectItem value="种苗">种苗</SelectItem>
                    <SelectItem value="穗条">穗条</SelectItem>
                    <SelectItem value="枝条">枝条</SelectItem>
                    <SelectItem value="块根">块根</SelectItem>
                    <SelectItem value="块茎">块茎</SelectItem>
                    <SelectItem value="鳞茎">鳞茎</SelectItem>
                    <SelectItem value="叶片">叶片</SelectItem>
                    <SelectItem value="花朵">花朵</SelectItem>
                    <SelectItem value="整株">整株</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {destination && (
              <>
                <div>
                  <Label>数量 *</Label>
                  <NumberInput
                    value={quantity}
                    onChange={(v) => setQuantity(v)}
                    min={0}
                    className={`${deepInputClass} ${disposeOverLimit ? 'border-red-500 ring-1 ring-red-200' : ''}`}
                    placeholder="0"
                  />
                  {/* 2026-06-18: dispose 选定时显示剩余可废弃上限（防超限） */}
                  {destination === 'dispose' && (
                    <p className={`mt-1 text-xs flex items-center gap-1 ${disposeOverLimit ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      <AlertTriangle className={`w-3 h-3 ${disposeOverLimit ? 'text-red-600' : 'text-gray-400'}`} />
                      剩余可废弃: <span className="font-semibold">{remainingDispose}</span> 株
                      （种植 {record.plantingCount} - 已废弃 {record.disposeQty || 0}）
                      {disposeOverLimit ? `，已超出 ${Number(quantity) - remainingDispose}` : ''}
                    </p>
                  )}
                </div>
                <div>
                  <Label>单位 *</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className={deepInputClass}>
                      <SelectValue placeholder="请选择单位" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.length === 0 ? (
                        <SelectItem value="克" disabled>字典加载中…</SelectItem>
                      ) : (
                        unitOptions.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {destination && (
              <div className="col-span-3">
                <Label>备注</Label>
                <TextArea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={deepInputClass}
                  placeholder="可选"
                  rows={2}
                />
              </div>
            )}
          </div>
        </div>

        {/* 历史记录表 */}
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900">历史记录 ({harvestRecords.length} 条)</h4>
            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              disabled={harvestRecords.length === 0}
              className="flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              导出
            </Button>
          </div>
          {harvestRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无采收记录</div>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-blue-500 text-white sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left">日期</th>
                    <th className="px-2 py-2 text-left">去向</th>
                    <th className="px-2 py-2 text-left">方式</th>
                    <th className="px-2 py-2 text-left">数量</th>
                    <th className="px-2 py-2 text-left">单位</th>
                    <th className="px-2 py-2 text-left">仓库</th>
                    <th className="px-2 py-2 text-left">操作员</th>
                    <th className="px-2 py-2 text-left">备注</th>
                    <th className="px-2 py-2 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {harvestRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5">{r.recordDate}</td>
                      <td className="px-2 py-1.5">{getDestinationLabel(r.destination)}</td>
                      <td className="px-2 py-1.5">{getSubTypeLabel(r.subType)}</td>
                      <td className="px-2 py-1.5">{r.quantity}</td>
                      <td className="px-2 py-1.5">{r.unit}</td>
                      <td className="px-2 py-1.5">{r.warehouseName || r.warehouseId || '-'}</td>
                      <td className="px-2 py-1.5">{r.operatorName || r.createBy || '-'}</td>
                      <td className="px-2 py-1.5 text-gray-500 truncate max-w-[200px]" title={r.notes || ''}>
                        {r.notes || '-'}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(r.id)}
                          className="text-red-600"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 累计统计 + 总结束 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">去向累计</h4>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">采收入库：</span>
              <span className="font-bold text-blue-600">
                {(record.harvestToInventoryQty || 0).toLocaleString()} {record.unit || ''}
              </span>
            </div>
            <div>
              <span className="text-gray-600">残株回种源：</span>
              <span className="font-bold text-emerald-600">
                {(record.residualToSourceQty || 0).toLocaleString()} {record.unit || ''}
              </span>
            </div>
            <div>
              <span className="text-gray-600">自交种子：</span>
              <span className="font-bold text-amber-600">
                {(record.selfSeedToSourceQty || 0).toLocaleString()} {record.unit || ''}
              </span>
            </div>
            <div>
              <span className="text-gray-600">直接废弃：</span>
              <span className="font-bold text-red-600">
                {(record.disposeQty || 0).toLocaleString()} {record.unit || ''}
              </span>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleTotalEnd}
              disabled={record.isHarvestLocked}
            >
              {record.isHarvestLocked ? '已结束（软锁）' : '总结束（软锁）'}
            </Button>
          </div>
        </div>
      </div>
    </UnifiedModal>
  )
}
