/**
 * 种植结束弹窗 (任务 16: Phase 3 UI 流程)
 *
 * 5 种结束方式 (2026-06-17 修 5 分支全跑通):
 *  1. 采收入库 (harvest) → 写 harvest_records + inventory_stock, status='harvested', **必填仓库**
 *  2. 残株回种源 (circulate) → status='ended'，需种源
 *  3. 残株入库存 (circulate_to_inventory) → status='ended'，需种源+仓库
 *  4. 自交种子入种源 (self_seed) → status='ended'，需种源
 *  5. 直接废弃 (dispose) → status='cancelled'，不需种源
 *
 * 数据流：组件 → usePlantingStore.endPlanting() → service.endPlanting() → API
 */
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { Input, TextArea } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { Sprout, Trash2, Recycle, Package, Wheat, AlertTriangle } from 'lucide-react';
import { Planting } from '../../../../types/crop';
import { showAlert } from '@/lib/dialogService';
import { usePlantingStore } from '@/stores/usePlantingStore';
import { useWarehouseStore } from '@/stores/useWarehouseStore';
import type { EndType, CirculationDestination } from '../../../../types/cropCirculation';
import type { EndPlantingInput } from '@/services/apiPlantingService';

interface EndPlantingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Planting;
}

type SubType = 'cutting' | 'seed_saving' | 'quantity_refill' | 'quantity_inbound'

const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"

/**
 * 解析后端错误信息
 * 后端 400 响应的 error 字段可能是 Zod JSON 字符串，需要提取第一条 message
 */
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

export function EndPlantingModal({ isOpen, onClose, onSuccess, record }: EndPlantingModalProps) {
  const [endType, setEndType] = useState<EndType | null>(null)
  const [subType, setSubType] = useState<SubType>('cutting')
  const [quantity, setQuantity] = useState<number | string>(0)
  const [unit, setUnit] = useState<string>('g')
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const endPlantingAction = usePlantingStore((s) => s.endPlanting)
  const warehouses = useWarehouseStore((s) => s.warehouses)
  const loadWarehouses = useWarehouseStore((s) => s.loadWarehouses)

  // 弹窗打开时加载仓库列表
  useEffect(() => {
    if (isOpen && warehouses.length === 0) {
      loadWarehouses()
    }
  }, [isOpen, warehouses.length, loadWarehouses])

  const activeWarehouses = warehouses.filter((w: any) => !w.status || w.status === 'active')

  const hasSeedSource = !!record.sourceId
  const requiresCirculation = endType === 'circulate' || endType === 'circulate_to_inventory' || endType === 'self_seed'
  const requiresWarehouse = endType === 'harvest' || endType === 'circulate_to_inventory'
  // 残株入库存 只支持 quantity_inbound
  const isInvalidInventorySubType = endType === 'circulate_to_inventory' && subType !== 'quantity_inbound'
  // 数量类型：QUANTITY 必填（>0），PROPAGATION 不需要
  const isQuantityType = subType === 'quantity_refill' || subType === 'quantity_inbound'
  const isPropagationType = subType === 'cutting' || subType === 'seed_saving'

  const handleSubmit = async () => {
    if (!endType) return showAlert('请选择结束方式')
    if (requiresCirculation && !hasSeedSource) {
      return showAlert('该种植记录无种源,无法回流')
    }
    if (requiresWarehouse && !warehouseId) {
      return showAlert(endType === 'harvest' ? '采收入库必须选择仓库' : '残株入库存必须选择仓库')
    }
    if (isInvalidInventorySubType) {
      return showAlert('残株入库存只支持"数量入库存"方式')
    }
    // 数量校验
    const qtyNum = Number(quantity) || 0
    if (endType === 'harvest' && qtyNum <= 0) {
      return showAlert('采收入库必须填写数量')
    }
    if (endType === 'circulate_to_inventory' && qtyNum <= 0) {
      return showAlert('残株入库存必须填写数量')
    }
    if (isQuantityType && qtyNum <= 0) {
      return showAlert('请填写数量（>0）')
    }

    setSubmitting(true)
    try {
      const input: EndPlantingInput = {
        endType: endType as EndPlantingInput['endType'],
        subType: requiresCirculation ? subType : undefined,
        warehouseId: requiresWarehouse ? warehouseId : undefined,
        quantity: qtyNum,
        unit,
        notes,
      }
      const result = await endPlantingAction(record.id, input)
      if (result) {
        showAlert('种植结束成功')
        onSuccess?.()
        onClose()
      } else {
        showAlert('操作失败')
      }
    } catch (e: any) {
      showAlert(parseErrorMessage(e?.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="种植结束"
      size="md"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText={submitting ? '处理中...' : '确定'}
      cancelText="取消"
    >
      <div className="space-y-4">
        {/* 第 1 层: 结束方式 */}
        <div>
          <Label className="text-gray-900">结束方式 *</Label>
          <Select value={endType ?? ''} onValueChange={(v) => setEndType(v as EndType)}>
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

        {/* 第 2 层: 回流方式 (仅回流类显示) */}
        {requiresCirculation && (
          <div>
            <Label className="text-gray-900">回流方式 *</Label>
            <Select value={subType} onValueChange={(v) => setSubType(v as SubType)}>
              <SelectTrigger className={deepInputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {endType === 'circulate_to_inventory' ? (
                  <SelectItem value="quantity_inbound">数量入库存</SelectItem>
                ) : endType === 'circulate' ? (
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
            {endType === 'circulate_to_inventory' && (
              <p className="mt-1 text-xs text-gray-500">残株入库存只支持"数量入库存"方式</p>
            )}
          </div>
        )}

        {/* 第 3 层: 仓库（harvest / circulate_to_inventory 必填） */}
        {requiresWarehouse && (
          <div>
            <Label className="text-gray-900">仓库 *</Label>
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

        {/* 第 4 层: 数量 + 单位 */}
        {endType && (endType === 'harvest' || endType === 'circulate_to_inventory' || isQuantityType || endType === 'dispose') && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-900">数量{endType === 'harvest' || endType === 'circulate_to_inventory' || isQuantityType ? ' *' : ''}</Label>
              <NumberInput
                value={quantity}
                onChange={(v) => setQuantity(v)}
                min={0}
                className={deepInputClass}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-gray-900">单位</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={deepInputClass}
                placeholder="g / kg / 株"
              />
            </div>
          </div>
        )}

        {/* PROPAGATION 类型显示提示，不需要数量 */}
        {requiresCirculation && isPropagationType && (
          <p className="text-xs text-gray-500">代际型回流不需要填写数量，会在种源中建新记录</p>
        )}

        {/* 第 5 层: 备注 */}
        {endType && (
          <div>
            <Label className="text-gray-900">备注</Label>
            <TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={deepInputClass}
              placeholder="可选"
              rows={2}
            />
          </div>
        )}

        {/* 底部说明 */}
        {endType === 'harvest' && (
          <p className="text-xs text-gray-500">
            采收后会自动生成采收记录并写入库存, 可在【库存管理-采收记录】中查看。
          </p>
        )}
        {endType === 'circulate_to_inventory' && (
          <p className="text-xs text-gray-500">
            残株将作为「残株入库」记录到作物库存, 可在库存管理中追溯。
          </p>
        )}
        {endType === 'circulate' && (
          <p className="text-xs text-gray-500">
            残株/留种将回流到种源管理台账, 关联原种源 (parent_source_id)。
          </p>
        )}
        {endType === 'dispose' && (
          <p className="text-xs text-gray-500">
            标记为已废弃，种植记录状态将变为「已取消」。
          </p>
        )}
      </div>
    </UnifiedModal>
  )
}
