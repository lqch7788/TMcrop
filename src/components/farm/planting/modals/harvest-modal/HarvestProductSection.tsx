/**
 * 采收弹窗 — 产品明细 + 备注区
 * 2026-10-18：从 HarvestRecordModal.tsx 拆出（纯移动，无逻辑变更）
 */
import type { Dispatch, SetStateAction } from 'react'
import { Input, Label, TextArea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, NumberInput } from '@/components/ui'
import type { EndType } from '../../../../../types/cropCirculation'
import type { InboundProduct } from '@/services/unifiedHarvestInboundService'
import { deepInputClass } from './helpers'

interface HarvestProductSectionProps {
  destination: EndType | null
  products: InboundProduct[]
  updateProduct: (idx: number, patch: Partial<InboundProduct>) => void
  unitOptions: string[]
  qualityGradeOptions: Array<{ value: string; label: string }>
  notes: string
  setNotes: Dispatch<SetStateAction<string>>
}

export function HarvestProductSection({
  destination,
  products,
  updateProduct,
  unitOptions,
  qualityGradeOptions,
  notes,
  setNotes,
}: HarvestProductSectionProps) {
  return (
    <>
        {/* 2026-06-19: 采收入库扩展字段（与行级采收入库弹窗 UnifiedRowHarvestInboundModal 字段集一致）
            顶部保留 6 字段：采收日期 / 去向=采收入库 / 仓库 / 采收形态 / 操作员 / 采收人员(多选)
            顶部不显示"数量/单位"（harvest 分支由下方产品明细承担，避免重复）
            顶部不显示独立的"备注"（产品明细里已有）
            提交时调 submitUnifiedInbound → POST /api/inventory/inbound-from-source → 4 表写入
            保证采收入库可保存到作物库存（用户核心诉求） */}
        {destination === 'harvest' && (
          <div className="space-y-3">
            {/* 产品明细（单条锁死，种植行单一作物）— 列顺序：作物编码/作物/品种/采收量/单位/品质/备注（2026-08-16：作物品种列改名"作物"并上移到品种前面；2026-07-06：单价字段已删除）
                顶部基础字段已选"采收形态"，此处不重复该列；不显示添加/删除按钮（单条固定） */}
            <div>
              <div className="space-y-2">
                {products.map((p, idx) => (
                  <div key={idx} className="border border-emerald-200 rounded-lg p-3 bg-white">
                    <div className="grid grid-cols-3 gap-4">
                      {/* 1. 作物编码（11位 crop code） */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">作物编码</div>
                        <Input
                          value={p.cropCode || ''}
                          onChange={(e) => updateProduct(idx, { cropCode: e.target.value.toUpperCase() })}
                          placeholder="11位编码"
                          className={deepInputClass + ' font-mono'}
                        />
                      </div>
                      {/* 2. 作物（最细化名 cropVariety） — 2026-08-16 重命名「作物品种」→「作物」并提到品种前面 */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">作物</div>
                        <Input
                          value={p.cropVariety || ''}
                          onChange={(e) => updateProduct(idx, { cropVariety: e.target.value })}
                          placeholder="最细化名"
                          className={deepInputClass}
                        />
                      </div>
                      {/* 3. 品种（类型名 cropName） */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">品种</div>
                        <Input
                          value={p.cropName || ''}
                          onChange={(e) => updateProduct(idx, { cropName: e.target.value })}
                          placeholder="类型名"
                          className={deepInputClass}
                        />
                      </div>
                      {/* 4. 数量（必填）+ 单位 - 合并占 1/3 宽度，与种植自留种模式对称 */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">数量 *</div>
                        <div className="flex gap-1">
                          <NumberInput
                            value={p.harvestQuantity}
                            onChange={(v) => updateProduct(idx, { harvestQuantity: Number(v) || 0 })}
                            className={deepInputClass}
                            placeholder="0"
                          />
                          <Select value={p.unit} onValueChange={(v) => updateProduct(idx, { unit: v })}>
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
                      {/* 6. 品质 */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">品质</div>
                        <Select value={p.grade || ''} onValueChange={(v) => updateProduct(idx, { grade: v })}>
                          <SelectTrigger className={deepInputClass}>
                            <SelectValue placeholder="品质" />
                          </SelectTrigger>
                          <SelectContent>
                            {qualityGradeOptions.map((g) => (
                              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* 2026-07-06：单价字段已删除（用户需求）*/}
                      {/* 7. 备注 */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">备注</div>
                        <Input
                          value={p.remarks || ''}
                          onChange={(e) => updateProduct(idx, { remarks: e.target.value })}
                          placeholder="备注"
                          className={deepInputClass}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2026-06-19: 备注字段（仅非 harvest 去向显示，harvest 由产品明细的"备注"列承担） */}
        {destination && destination !== 'harvest' && (
          <div>
            <Label>备注</Label>
            <TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={deepInputClass}
              placeholder="可选"
              rows={2}
            />
            {/* 2026-06-29: 种植自留种说明 - 移到备注下方 */}
            {destination === 'planting_self_kept' && (
              <p className="mt-1 text-xs text-gray-500 flex items-start gap-1">
                <span className="text-emerald-600">💡</span>
                <span>
                  果实/枝条/穗条/整株等植物体请选「扦插类」；种子/种苗请选「留种」。
                  数量回流到内部种源列表，不进作物库存。
                </span>
              </p>
            )}
          </div>
        )}

    </>
  )
}
