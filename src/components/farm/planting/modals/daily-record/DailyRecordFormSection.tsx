/**
 * 种植每日记录弹窗 — 添加新记录表单区
 * 2026-10-18：从 DailyRecordModal.tsx 拆出（纯移动，无逻辑变更）
 */
import type { Dispatch, SetStateAction } from 'react'
import { Input, Label, DatePicker, TextArea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { FeedRecordCard, type FeedRecordItem } from '@/components/farm/seedling/modals/FeedRecordCard'
import { WATERING_METHOD_MAP, WATERING_UNIT_MAP } from '../../../../../constants/cropConstants'
import { todayLocal } from '@/lib/dateUtils'
import type { Planting } from '../../../../../types/crop'
import type { DailyFormData } from './types'

const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"

interface DailyRecordFormSectionProps {
  readOnly?: boolean
  record: Planting
  currentAvailable: number
  formData: DailyFormData
  setFormData: Dispatch<SetStateAction<DailyFormData>>
  OPERATORS: Array<{ value: string; label: string }>
  handleAddFertilizer: () => void
  handleUpdateFertilizer: (idx: number, next: FeedRecordItem) => void
  handleRemoveFertilizer: (idx: number) => void
  handleAddPesticide: () => void
  handleUpdatePesticide: (idx: number, next: FeedRecordItem) => void
  handleRemovePesticide: (idx: number) => void
}

export function DailyRecordFormSection({
  readOnly,
  record,
  currentAvailable,
  formData,
  setFormData,
  OPERATORS,
  handleAddFertilizer,
  handleUpdateFertilizer,
  handleRemoveFertilizer,
  handleAddPesticide,
  handleUpdatePesticide,
  handleRemovePesticide,
}: DailyRecordFormSectionProps) {
  return (
    <>
        {/* 添加新记录 */}
        {!readOnly && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">添加新记录</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-700">记录日期 <span className="text-red-500">*</span></Label>
              <DatePicker
                className="w-full"
                selected={formData.recordDate ? new Date(formData.recordDate) : undefined}
                onChange={(date) => setFormData({ ...formData, recordDate: todayLocal(date) })}
              />
            </div>
            <div>
              <Label className="text-gray-700">操作人员</Label>
              <Select
                value={formData.operator}
                onValueChange={(val) => setFormData({ ...formData, operator: val })}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="请选择操作人员" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700">异常情况</Label>
              <Input
                type="text"
                value={formData.abnormality}
                onChange={(e) => setFormData({ ...formData, abnormality: e.target.value })}
                placeholder="无异常请留空"
                className={deepInputClass}
              />
            </div>

            {/* 2026-08-21：环境参数折叠面板 — 8 字段（空气×4 + 土壤×4）*/}
            <details className="md:col-span-3 border border-blue-100 rounded-lg bg-blue-50/20 overflow-hidden" open>
              <summary className="cursor-pointer select-none px-3 py-2 bg-blue-50/50 hover:bg-blue-50 text-sm font-semibold text-blue-800 flex items-center justify-between">
                <span>▼ 环境参数 — 空气×4 + 土壤×4（共 8 项）</span>
                <span className="text-xs text-blue-600 font-normal">
                  {/* summary：空气组 + 土壤组 */}
                  空气 {formData.airTemperature != null ? `${formData.airTemperature}℃` : '-'}/
                  {formData.airHumidity != null ? `${formData.airHumidity}%` : '-'}/
                  {formData.lightIntensity != null ? `${formData.lightIntensity}lux` : '-'}/
                  {formData.co2 != null ? `${formData.co2}ppm` : '-'}
                  {' | '}
                  土壤 {formData.soilTemperature != null ? `${formData.soilTemperature}℃` : '-'}/
                  {formData.soilHumidity != null ? `${formData.soilHumidity}%` : '-'}/
                  pH {formData.soilPhValue ?? '-'}/
                  EC {formData.soilEcValue ?? '-'}
                </span>
              </summary>
              <div className="p-3 space-y-3">
                {/* 空气组 4 字段 */}
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1.5">空气参数</div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label className="text-gray-700">空气温度（℃）</Label>
                      <Input type="number" step="0.1" value={formData.airTemperature ?? ''}
                        onChange={(e) => setFormData({ ...formData, airTemperature: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="如：25" className={deepInputClass} />
                    </div>
                    <div>
                      <Label className="text-gray-700">空气湿度（%）</Label>
                      <Input type="number" step="0.1" value={formData.airHumidity ?? ''}
                        onChange={(e) => setFormData({ ...formData, airHumidity: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="如：65" className={deepInputClass} />
                    </div>
                    <div>
                      <Label className="text-gray-700">光照度（lux）</Label>
                      <Input type="number" value={formData.lightIntensity ?? ''}
                        onChange={(e) => setFormData({ ...formData, lightIntensity: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="如：12000" className={deepInputClass} />
                    </div>
                    <div>
                      <Label className="text-gray-700">CO₂ 含量（ppm）</Label>
                      <Input type="number" value={formData.co2 ?? ''}
                        onChange={(e) => setFormData({ ...formData, co2: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="如：400" className={deepInputClass} />
                    </div>
                  </div>
                </div>
                {/* 土壤组 4 字段 */}
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1.5">土壤参数</div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label className="text-gray-700">土壤温度（℃）</Label>
                      <Input type="number" step="0.1" value={formData.soilTemperature ?? ''}
                        onChange={(e) => setFormData({ ...formData, soilTemperature: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="如：22" className={deepInputClass} />
                    </div>
                    <div>
                      <Label className="text-gray-700">土壤湿度（%）</Label>
                      <Input type="number" step="0.1" value={formData.soilHumidity ?? ''}
                        onChange={(e) => setFormData({ ...formData, soilHumidity: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="如：55" className={deepInputClass} />
                    </div>
                    <div>
                      <Label className="text-gray-700">土壤 pH 值</Label>
                      <Input type="number" step="0.1" value={formData.soilPhValue ?? ''}
                        onChange={(e) => setFormData({ ...formData, soilPhValue: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="如：6.5" className={deepInputClass} />
                    </div>
                    <div>
                      <Label className="text-gray-700">土壤 EC（mS/cm）</Label>
                      <Input type="number" step="0.1" value={formData.soilEcValue ?? ''}
                        onChange={(e) => setFormData({ ...formData, soilEcValue: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="如：2.0" className={deepInputClass} />
                    </div>
                  </div>
                </div>
              </div>
            </details>

            {/* 浇水折叠面板 */}
            <details
              className="md:col-span-3 border border-cyan-100 rounded-lg bg-cyan-50/20 overflow-hidden"
              open={!!(formData.wateringMethod || formData.wateringAmount != null)}
            >
              <summary className="cursor-pointer select-none px-3 py-2 bg-cyan-50/50 hover:bg-cyan-50 text-sm font-semibold text-cyan-800 flex items-center justify-between">
                <span>▼ 浇水（{(formData.wateringMethod || formData.wateringAmount != null) ? '已填写' : '未填写'}）</span>
                <span className="text-xs text-cyan-700 font-normal">
                  {formData.wateringMethod
                    ? `${WATERING_METHOD_MAP[formData.wateringMethod] || formData.wateringMethod}`
                    : ''}
                  {formData.wateringAmount != null
                    ? ` / ${formData.wateringAmount}${WATERING_UNIT_MAP[formData.wateringUnit as string] || formData.wateringUnit || ''}`
                    : ''}
                </span>
              </summary>
              <div className="p-3 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-700">浇水方式</Label>
                  <Select
                    value={formData.wateringMethod || 'spray'}
                    onValueChange={(v) => setFormData({ ...formData, wateringMethod: v })}
                  >
                    <SelectTrigger className={deepInputClass}>
                      <SelectValue placeholder="选择浇水方式（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(WATERING_METHOD_MAP).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-700">浇水量</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.wateringAmount ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          wateringAmount: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="如：5（可选）"
                      className={`${deepInputClass} flex-1`}
                    />
                    <Select
                      value={formData.wateringUnit || 'L'}
                      onValueChange={(v) => setFormData({ ...formData, wateringUnit: v })}
                    >
                      <SelectTrigger className={`${deepInputClass} w-24`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(WATERING_UNIT_MAP).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </details>

            {/* 施肥折叠面板 */}
            <details
              className="md:col-span-3 border border-emerald-100 rounded-lg bg-emerald-50/20 overflow-hidden"
              open={(formData.fertilizerRecords?.length || 0) > 0}
            >
              <summary className="cursor-pointer select-none px-3 py-2 bg-emerald-50/50 hover:bg-emerald-50 text-sm font-semibold text-emerald-800 flex items-center justify-between">
                <span>▼ 施肥（{(formData.fertilizerRecords?.length || 0)} 种）</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAddFertilizer();
                  }}
                  className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  + 添加
                </button>
              </summary>
              <div className="p-3 space-y-2">
                {(formData.fertilizerRecords?.length || 0) === 0 ? (
                  <div className="text-center py-3 text-xs text-gray-500">
                    暂无施肥记录 — 点击「+ 添加」记录
                  </div>
                ) : (
                  formData.fertilizerRecords!.map((rec, idx) => (
                    <FeedRecordCard
                      key={rec.id}
                      mode="fertilizer"
                      value={rec}
                      onChange={(next) => handleUpdateFertilizer(idx, next)}
                      onRemove={() => handleRemoveFertilizer(idx)}
                    />
                  ))
                )}
              </div>
            </details>

            {/* 用药折叠面板 */}
            <details
              className="md:col-span-3 border border-red-100 rounded-lg bg-red-50/20 overflow-hidden"
              open={(formData.pesticideRecords?.length || 0) > 0}
            >
              <summary className="cursor-pointer select-none px-3 py-2 bg-red-50/50 hover:bg-red-50 text-sm font-semibold text-red-800 flex items-center justify-between">
                <span>▼ 用药（{(formData.pesticideRecords?.length || 0)} 种）</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAddPesticide();
                  }}
                  className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  + 添加
                </button>
              </summary>
              <div className="p-3 space-y-2">
                {(formData.pesticideRecords?.length || 0) === 0 ? (
                  <div className="text-center py-3 text-xs text-gray-500">
                    暂无用药记录 — 点击「+ 添加」记录
                  </div>
                ) : (
                  formData.pesticideRecords!.map((rec, idx) => (
                    <FeedRecordCard
                      key={rec.id}
                      mode="pesticide"
                      value={rec}
                      onChange={(next) => handleUpdatePesticide(idx, next)}
                      onRemove={() => handleRemovePesticide(idx)}
                    />
                  ))
                )}
              </div>
            </details>

            {/* 数量统计折叠面板 — 种植单池（损耗 + 补栽） */}
            <details
              className="md:col-span-3 border border-orange-100 rounded-lg bg-orange-50/20 overflow-hidden"
              open
            >
              <summary className="cursor-pointer select-none px-3 py-2 bg-orange-50/50 hover:bg-orange-50 text-sm font-semibold text-orange-800 flex items-center justify-between">
                <span>▼ 数量统计（损耗 + 补栽）</span>
                <span className="text-xs text-orange-700 font-normal">
                  当前活体剩余 {currentAvailable} {record.unit || '株'} ｜
                  本次操作后{' '}
                  <span className="font-semibold">
                    {Math.max(
                      0,
                      currentAvailable - (formData.lossChange || 0) + (formData.supplementChange || 0)
                    )}
                  </span>
                  {' '}{record.unit || '株'}
                </span>
              </summary>
              <div className="p-3 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-700">
                    损耗
                    <span className="text-xs text-gray-500 ml-1">（死亡/淘汰，存入 plantings.loss_count）</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.lossChange ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || v === '-') {
                        setFormData({ ...formData, lossChange: undefined });
                        return;
                      }
                      const n = Number(v);
                      if (!isNaN(n) && n >= 0) {
                        setFormData({ ...formData, lossChange: n });
                      }
                    }}
                    placeholder={`今日损耗（不可超过 ${currentAvailable}）`}
                    className={deepInputClass}
                  />
                </div>
                <div>
                  <Label className="text-gray-700">
                    补栽
                    <span className="text-xs text-gray-500 ml-1">（补种/补苗，存入 plantings.supplement_count）</span>
                  </Label>
                  {/* 2026-06-30: 补栽不关联种源溯源警告
                      缘由：补栽只更新 plantings.supplement_count 累加数字，不写入 planting_seed_sources，
                      会破坏全链路追溯。建议使用「调入」功能选择具体种源批号 — 补栽仅作为应急通道。 */}
                  <div className="bg-amber-50 border border-amber-300 rounded p-2 text-xs text-amber-800 mb-2">
                    ⚠️ 补栽不关联种源溯源，建议使用「调入」功能选择具体种源批号。补栽仅作为无法溯源时的应急通道。
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={formData.supplementChange ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || v === '-') {
                        setFormData({ ...formData, supplementChange: undefined });
                        return;
                      }
                      const n = Number(v);
                      if (!isNaN(n) && n >= 0) {
                        setFormData({ ...formData, supplementChange: n });
                      }
                    }}
                    placeholder="今日补栽数量（无上限）"
                    className={deepInputClass}
                  />
                </div>
              </div>
            </details>

            {/* 备注 */}
            <div className="col-span-3">
              <Label className="text-gray-700">备注</Label>
              <TextArea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
                className={deepInputClass}
                placeholder="请输入备注信息"
              />
            </div>
          </div>
        </div>
        )}

    </>
  )
}
