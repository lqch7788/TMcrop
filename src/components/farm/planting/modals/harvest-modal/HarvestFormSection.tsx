/**
 * 采收弹窗 — 表单区（采收日期/去向/采收形态/数量/仓库/操作员/采收人员）
 * 2026-10-18：从 HarvestRecordModal.tsx 拆出（纯移动，无逻辑变更）
 */
import type { Dispatch, SetStateAction } from 'react'
import { Input, Label, DatePicker } from '@/components/ui'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { NumberInput } from '@/components/ui'
import { Wheat, AlertTriangle, ChevronDown, X } from 'lucide-react'
import type { Planting } from '../../../../../types/crop'
import type { EndType } from '../../../../../types/cropCirculation'
import { todayLocal } from '@/lib/dateUtils'
import { MergePreview } from '../MergePreview'
import { deepInputClass, SEED_FORM_OPTIONS, getSubTypeLabel, type SubType, type UserLite, type WarehouseLite } from './helpers'

interface HarvestFormSectionProps {
  record: Planting
  recordDate: string
  setRecordDate: Dispatch<SetStateAction<string>>
  destination: EndType | null
  setDestination: Dispatch<SetStateAction<EndType | null>>
  sourceForm: string
  setSourceForm: Dispatch<SetStateAction<string>>
  hasSeedSource: boolean
  quantity: number | string
  setQuantity: Dispatch<SetStateAction<number | string>>
  unit: string
  setUnit: Dispatch<SetStateAction<string>>
  unitAutoRecommended: boolean
  setUnitAutoRecommended: Dispatch<SetStateAction<boolean>>
  matchedUnitSource: { id: string; sourceCode: string; unit: string } | null
  setMatchedUnitSource: Dispatch<SetStateAction<{ id: string; sourceCode: string; unit: string } | null>>
  operator: string
  setOperator: Dispatch<SetStateAction<string>>
  generation: string
  setGeneration: Dispatch<SetStateAction<string>>
  forceNew: boolean
  setForceNew: Dispatch<SetStateAction<boolean>>
  subType: SubType
  setSubType: Dispatch<SetStateAction<SubType>>
  warehouseId: string
  setWarehouseId: Dispatch<SetStateAction<string>>
  activeWarehouses: WarehouseLite[]
  users: UserLite[]
  harvesterNames: string[]
  setHarvesterNames: Dispatch<SetStateAction<string[]>>
  harvesterIds: string[]
  setHarvesterIds: Dispatch<SetStateAction<string[]>>
  harvesterPopoverOpen: boolean
  setHarvesterPopoverOpen: Dispatch<SetStateAction<boolean>>
  toggleHarvester: (u: UserLite) => void
  unitOptions: string[]
}

export function HarvestFormSection({
  record,
  recordDate,
  setRecordDate,
  destination,
  setDestination,
  sourceForm,
  setSourceForm,
  hasSeedSource,
  quantity,
  setQuantity,
  unit,
  setUnit,
  unitAutoRecommended,
  setUnitAutoRecommended,
  matchedUnitSource,
  setMatchedUnitSource,
  operator,
  setOperator,
  generation,
  setGeneration,
  forceNew,
  setForceNew,
  subType,
  setSubType,
  warehouseId,
  setWarehouseId,
  activeWarehouses,
  users,
  harvesterNames,
  setHarvesterNames,
  harvesterIds,
  setHarvesterIds,
  harvesterPopoverOpen,
  setHarvesterPopoverOpen,
  toggleHarvester,
  unitOptions,
}: HarvestFormSectionProps) {
  return (
    <>
        {/* 表单区 */}
        <div className="space-y-4">
          {/* 第1行：采收日期 + 去向（所有模式共用） */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>采收日期 *</Label>
              <DatePicker
                className="w-full"
                selected={recordDate ? new Date(recordDate) : undefined}
                onChange={(date) => setRecordDate(todayLocal(date))}
              />
            </div>
            <div>
              <Label>去向 *</Label>
              <Select value={destination ?? ''} onValueChange={(v) => {
                setDestination(v as EndType);
                setSourceForm('');
              }}>
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="harvest">
                    <span className="flex items-center gap-1.5"><Wheat className="w-3.5 h-3.5" /> 采收入库</span>
                  </SelectItem>
                  {/* 2026-10-12 (IS-NEW-168) P2 修复："种植自留种"≠入库，红色警示避免误选 — 母株保留场景，需走育苗补录审批流 */}
                  <SelectItem value="planting_self_kept" disabled={!hasSeedSource}>
                    <span className="flex items-center gap-1.5 text-red-600 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" /> 种植自留种（保留母株·不直接入库）
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {!hasSeedSource && (
                <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> 该种植记录无种源, 种植自留种选项已禁用
                </p>
              )}
            </div>
            {/* 第1行第3列：采收形态（仅 planting_self_kept 显示）
                注：世代字段已移到下方第2行，与「数量」「操作员」同一行（用户需求 2026-07-18） */}
            {destination === 'planting_self_kept' && (
              <div>
                <Label>采收形态 *</Label>
                <Select value={sourceForm} onValueChange={setSourceForm}>
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue placeholder="选采收形态" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEED_FORM_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* 第1行第3列：采收形态（harvest 模式） */}
            {destination === 'harvest' && (
              <div>
                <Label>采收形态 *</Label>
                <Select value={sourceForm} onValueChange={setSourceForm}>
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue placeholder="选采收形态" />
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
          </div>
          {/* 第2行：数量+单位（1/3）+ 操作员（1/3）+ 世代（1/3）（仅 planting_self_kept 显示） */}
          {destination === 'planting_self_kept' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>数量 *</Label>
                <div className="flex gap-1">
                  <NumberInput
                    value={quantity}
                    onChange={(v) => setQuantity(v)}
                    className={deepInputClass}
                    placeholder="0"
                  />
                  <Select
                    value={unit}
                    onValueChange={(v) => {
                      setUnit(v)
                      // 2026-07-18: 用户手动改单位 → 清掉「自动推荐」标记
                      setUnitAutoRecommended(false)
                    }}
                  >
                    <SelectTrigger className={deepInputClass}>
                      <SelectValue placeholder="单位" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.length === 0 ? (
                        <SelectItem value="克" disabled>加载中…</SelectItem>
                      ) : (
                        unitOptions.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {/* 2026-07-18: 自动推荐单位提示 */}
                {unitAutoRecommended && matchedUnitSource && (
                  <p className="mt-1 text-xs text-cyan-600 flex items-center gap-1">
                    <span>✨</span>
                    <span>已自动推荐【{matchedUnitSource.unit}】— 与已有种源 <code className="font-mono">{matchedUnitSource.sourceCode}</code> 一致</span>
                  </p>
                )}
              </div>
              <div>
                <Label>操作员 *</Label>
                <Input
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="默认当前登录人员"
                  className={deepInputClass}
                />
              </div>
              {/* 2026-07-18：世代字段从第1行移到第2行，与「数量」「操作员」同一行（用户需求） */}
              <div>
                <Label>世代 <span className="text-gray-400 text-xs">(可选)</span></Label>
                {/* 2026-07-18 Bug 修复：datalist 有 2 个 bug
                    1. value 与文本不同时浏览器会显示两条（"F1" 和 "F1(杂交一代)"）
                    2. 选中后再次点箭头只显示匹配项，丢失其他选项
                    改用 Select 解决（与「采收形态」「去向」一致） */}
                <Select value={generation || ''} onValueChange={(v) => setGeneration(v)}>
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue placeholder="留空 = 不参与合并" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">（留空 — 不参与合并）</SelectItem>
                    <SelectItem value="F1">F1（杂交一代）</SelectItem>
                    <SelectItem value="F2">F2（杂交二代）</SelectItem>
                    <SelectItem value="F3">F3（杂交三代）</SelectItem>
                    <SelectItem value="BC1">BC1（回交一代）</SelectItem>
                    <SelectItem value="BC2">BC2（回交二代）</SelectItem>
                    <SelectItem value="无性">无性（扦插/组培）</SelectItem>
                    <SelectItem value="DH">DH（双单倍体）</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-gray-400">
                  留空 = 跨世代合并；填值 = 仅同世代合并
                </p>
              </div>
            </div>
          )}
          {/* 2026-07-18：合并预览（planting_self_kept 模式 + 作物+形态已选） */}
          {destination === 'planting_self_kept' && record?.cropCode && sourceForm && (
            <MergePreview
              cropCode={record.cropCode}
              seedForm={sourceForm}
              unit={unit || ''}
              generation={generation || null}
              newQuantity={Number(quantity) || 0}
              linkedPlantingId={record.id}
              forceNew={forceNew}
              onForceNewChange={(v) => setForceNew(v)}
              onMatchFound={(m) => {
                setMatchedUnitSource(m)
                if (m && m.unit && (!unit || unit === record.unit)) {
                  setUnit(m.unit)
                  setUnitAutoRecommended(true)
                } else if (!m) {
                  setUnitAutoRecommended(false)
                }
              }}
            />
          )}
          {/* 兼容历史老记录（circulate/self_seed）— 仍显示原 subType，但禁止通过 UI 新建 */}
          {(destination === 'circulate' || destination === 'self_seed') && (
            <div>
              <Label>回流方式（历史记录，不可修改）</Label>
              <Select value={subType} onValueChange={(v) => setSubType(v as SubType)} disabled>
                <SelectTrigger className={deepInputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={subType}>{getSubTypeLabel(subType)}</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-gray-400">
                此记录为旧版本（circulate/self_seed），已合并到「种植自留种」。
              </p>
            </div>
          )}
          {/* 2026-07-18：harvest 模式 - 第2行：仓库 + 操作员 + 采收人员（3 列各 1/3） */}
          {destination === 'harvest' && (
            <div className="grid grid-cols-3 gap-4">
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
                      {activeWarehouses.map((w: WarehouseLite) => (
                        <SelectItem key={w.id || w.oid || ''} value={w.id || w.oid || ''}>
                          {w.name || w.warehouseName || w.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label>操作员</Label>
                <Input
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="默认当前登录人员"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label>采收人员</Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setHarvesterPopoverOpen(!harvesterPopoverOpen)}
                    className={`${deepInputClass} w-full text-left flex items-center justify-between min-h-[44px] ${harvesterPopoverOpen ? 'border-emerald-500 ring-2 ring-emerald-200' : ''}`}
                  >
                    <div className="flex-1 flex flex-wrap gap-1">
                      {harvesterNames.length === 0 ? (
                        <span className="text-gray-400">点击选择采收员（可多选）</span>
                      ) : (
                        harvesterNames.map((n, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded">
                            {n}
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
                  {harvesterPopoverOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {users.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">用户列表加载中…</div>
                      ) : (
                        users.map((u: UserLite) => {
                          const name = u.realName || u.real_name || u.username || ''
                          const checked = harvesterNames.includes(name)
                          return (
                            <label key={u.oid || u.id} className="flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 cursor-pointer">
                              <input type="checkbox" checked={checked} onChange={() => toggleHarvester(u)} />
                              <span className="text-sm">{name}</span>
                            </label>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* 2026-07-18：非 harvest 非 planting_self_kept 模式 - 数量+单位合并（1/3） */}
          {destination && destination !== 'harvest' && destination !== 'planting_self_kept' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>数量 *</Label>
                <div className="flex gap-1">
                  <NumberInput
                    value={quantity}
                    onChange={(v) => setQuantity(v)}
                    className={deepInputClass}
                    placeholder="0"
                  />
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className={deepInputClass}>
                      <SelectValue placeholder="单位" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.length === 0 ? (
                        <SelectItem value="克" disabled>加载中…</SelectItem>
                      ) : (
                        unitOptions.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          </div>

    </>
  )
}
