/**
 * 种植结束弹窗 (任务 16: Phase 3 UI 流程)
 *
 * 5 种结束方式 (2026-06-11 业务边界澄清后):
 *  1. 采收入库 (走既有 HarvestModal, 本弹窗仅传递)
 *  2. 残株回种源 (destination=seed_source) - PROPAGATION/QUANTITY
 *  3. 残株入库存 (destination=inventory_stock) - QUANTITY
 *  4. 自交种子入种源 - PROPAGATION
 *  5. 直接废弃 - DISPOSAL
 *
 * 风格遵循 V1.1 现有约定 (HarvestModal 风格):
 *  - UnifiedModal 容器
 *  - UI 库组件 (Label, Select, Input, NumberInput, TextArea)
 *  - lucide-react 图标
 *  - deepInputClass 深度输入框样式
 *  - showAlert 服务提示
 */
import React, { useState } from 'react';
import { Label } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { Input, TextArea } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { Sprout, Trash2, Recycle, Package, Wheat, AlertTriangle } from 'lucide-react';
import { Planting } from '../../../../types/crop';
import { showAlert } from '@/lib/dialogService';
import type { EndType, CirculationDestination } from '../../../../types/cropCirculation';

interface EndPlantingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Planting;
}

type SubType = 'cutting' | 'seed_saving' | 'quantity_refill' | 'quantity_inbound'

const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"

export function EndPlantingModal({ isOpen, onClose, onSuccess, record }: EndPlantingModalProps) {
  const [endType, setEndType] = useState<EndType | null>(null)
  const [subType, setSubType] = useState<SubType>('cutting')
  const [destination, setDestination] = useState<CirculationDestination>('seed_source')
  const [quantity, setQuantity] = useState<number>(0)
  const [unit, setUnit] = useState<string>('g')
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const hasSeedSource = !!record.sourceId
  const requiresCirculation = endType === 'circulate' || endType === 'circulate_to_inventory' || endType === 'self_seed'

  const handleSubmit = async () => {
    if (!endType) return showAlert('请选择结束方式')
    if (requiresCirculation && !hasSeedSource) {
      return showAlert('该种植记录无种源,无法回流')
    }
    if (endType === 'circulate_to_inventory' && !warehouseId) {
      return showAlert('残株入库存必须选择仓库')
    }
    if (subType !== 'quantity_refill' && subType !== 'quantity_inbound' && quantity <= 0) {
      return showAlert('代际型回流请填写数量')
    }

    setSubmitting(true)
    try {
      // 残株回种源 + 自交种子走 /:id/end 路由 (Phase 2 任务 10 实施)
      // 残株入库存也走该路由
      // 采收入库 / 直接废弃也走该路由 (后端分发)
      const body: any = {
        endType,
        subType: requiresCirculation ? subType : undefined,
        destination: endType === 'circulate_to_inventory' ? 'inventory_stock' : 'seed_source',
        warehouseId: endType === 'circulate_to_inventory' ? warehouseId : undefined,
        quantity,
        unit,
        notes,
      }
      const apiBase = (window as any).__API_BASE__ || ''
      const res = await fetch(`${apiBase}/api/plantings/${record.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        showAlert('种植结束成功')
        onSuccess?.()
        onClose()
      } else {
        showAlert(data.error || '操作失败')
      }
    } catch (e: any) {
      showAlert(e.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <UnifiedModal
      open={isOpen}
      onClose={onClose}
      title="种植结束"
      width="md"
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

        {/* 第 2 层: 回流方式 (仅残株回种源/残株入库存/自交种子时显示) */}
        {requiresCirculation && (
          <div>
            <Label className="text-gray-900">回流方式 *</Label>
            <Select value={subType} onValueChange={(v) => setSubType(v as SubType)}>
              <SelectTrigger className={deepInputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cutting">扦插繁殖（建新种源）</SelectItem>
                <SelectItem value="seed_saving">留种（建新种源）</SelectItem>
                <SelectItem value="quantity_refill">数量回填（追加到原种源）</SelectItem>
                <SelectItem value="quantity_inbound">数量入库存</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 第 3 层: 数量 + 单位 + 仓库 (入库存时) */}
        {endType && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-gray-900">数量</Label>
              <NumberInput
                value={quantity}
                onChange={setQuantity}
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
            {endType === 'circulate_to_inventory' && (
              <div>
                <Label className="text-gray-900">仓库 *</Label>
                <Input
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className={deepInputClass}
                  placeholder="WH001"
                />
              </div>
            )}
          </div>
        )}

        {/* 第 4 层: 备注 */}
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
      </div>
    </UnifiedModal>
  )
}
