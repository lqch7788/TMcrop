/**
 * 种植采收记录 + 总结束 弹窗 (Phase 1: 2026-06-17)
 * 仿照 DailyRecordModal 结构
 * 5 种 destination + 历史记录表 + 4 列累计 + 总结束按钮
 */
import React, { useState, useEffect } from 'react'
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
    circulate_to_inventory: '残株入库存',
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
  const [unit, setUnit] = useState<string>('g')
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [recordDate, setRecordDate] = useState<string>(todayLocal())
  const [submitting, setSubmitting] = useState(false)

  const addHarvestRecord = usePlantingStore((s) => s.addHarvestRecord)
  const harvestRecordsMap = usePlantingStore((s) => s.harvestRecords)
  const loadHarvestRecords = usePlantingStore((s) => s.loadHarvestRecords)
  const deleteHarvestRecord = usePlantingStore((s) => s.deleteHarvestRecord)
  const endPlantingAction = usePlantingStore((s) => s.endPlanting)

  const warehouses = useWarehouseStore((s) => s.warehouses)
  const loadWarehouses = useWarehouseStore((s) => s.loadWarehouses)

  // 弹窗打开时加载数据
  useEffect(() => {
    if (isOpen) {
      if (warehouses.length === 0) {
        void loadWarehouses()
      }
      void loadHarvestRecords(record.id)
    }
  }, [isOpen, warehouses.length, loadWarehouses, loadHarvestRecords, record.id])

  const harvestRecords: PlantingHarvestRecord[] = harvestRecordsMap[record.id] || []
  const activeWarehouses = warehouses.filter((w: any) => !w.status || w.status === 'active')

  const hasSeedSource = !!record.sourceId
  const requiresWarehouse = destination === 'harvest' || destination === 'circulate_to_inventory'
  const requiresCirculation = destination === 'circulate' || destination === 'circulate_to_inventory' || destination === 'self_seed'

  // 残株入库存 只支持 quantity_inbound
  const isInvalidInventorySubType = destination === 'circulate_to_inventory' && subType !== 'quantity_inbound'
  // 数量类型（必填 > 0）；PROPAGATION（cutting/seed_saving）不需
  const isQuantityType = subType === 'quantity_refill' || subType === 'quantity_inbound'
  const isPropagationType = subType === 'cutting' || subType === 'seed_saving'

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
    if (isInvalidInventorySubType) {
      showAlert('残株入库存只支持"数量入库存"方式')
      return
    }
    if (requiresWarehouse && !warehouseId) {
      showAlert(destination === 'harvest' ? '采收入库必须选择仓库' : '残株入库存必须选择仓库')
      return
    }

    // 数量校验
    const qtyNum = Number(quantity) || 0
    if (destination === 'harvest' && qtyNum <= 0) {
      showAlert('采收入库必须填写数量')
      return
    }
    if (destination === 'circulate_to_inventory' && qtyNum <= 0) {
      showAlert('残株入库存必须填写数量')
      return
    }
    if (isQuantityType && qtyNum <= 0) {
      showAlert('请填写数量（>0）')
      return
    }
    if (destination !== 'dispose' && !isPropagationType && qtyNum <= 0) {
      showAlert('请填写数量（> 0）')
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
      r.unit,
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
                  <SelectItem value="circulate_to_inventory" disabled={!hasSeedSource}>
                    <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> 残株入库存</span>
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
                    {destination === 'circulate_to_inventory' ? (
                      <SelectItem value="quantity_inbound">数量入库存</SelectItem>
                    ) : destination === 'circulate' ? (
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
                {destination === 'circulate_to_inventory' && (
                  <p className="mt-1 text-xs text-gray-500">残株入库存只支持"数量入库存"方式</p>
                )}
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
            {destination && (destination === 'harvest' || destination === 'circulate_to_inventory' || isQuantityType || destination === 'dispose') && (
              <>
                <div>
                  <Label>
                    数量
                    {destination === 'harvest' || destination === 'circulate_to_inventory' || isQuantityType ? ' *' : ''}
                  </Label>
                  <NumberInput
                    value={quantity}
                    onChange={(v) => setQuantity(v)}
                    min={0}
                    className={deepInputClass}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>单位</Label>
                  <Input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className={deepInputClass}
                    placeholder="g / kg / 株"
                  />
                </div>
              </>
            )}
            {requiresCirculation && isPropagationType && (
              <p className="col-span-3 text-xs text-gray-500">代际型回流不需要填写数量，会在种源中建新记录</p>
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
              <span className="text-gray-600">残株入库存：</span>
              <span className="font-bold text-purple-600">
                {(record.residualToInventoryQty || 0).toLocaleString()} {record.unit || ''}
              </span>
            </div>
            <div>
              <span className="text-gray-600">自交种子：</span>
              <span className="font-bold text-amber-600">
                {(record.selfSeedToSourceQty || 0).toLocaleString()} {record.unit || ''}
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
