/**
 * 育苗每日记录弹窗 — 添加新记录表单区
 * 2026-10-18：从 DailyRecordModal.tsx 拆出（纯移动，无逻辑变更）
 */
import type { Dispatch, SetStateAction } from 'react'
import { Input, Label, DatePicker, TextArea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { FeedRecordCard, type FeedRecordItem } from '../FeedRecordCard'
import { WATERING_METHOD_MAP, WATERING_UNIT_MAP, WATERING_METHOD_OPTIONS, DAILY_RECORD_WATERING_UNITS } from '../../../../../constants/cropConstants'
import { todayLocal } from '@/lib/dateUtils'
import type { DailyFormData } from './types'

const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"

interface DailyRecordFormSectionProps {
  readOnly?: boolean
  isMotherMode: boolean
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
  isMotherMode,
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
            {/* 2026-06-28：UI 重构 — 第 1 行：记录日期 + 操作人员 + 异常情况（基础信息紧凑排列） */}
            <div>
              <Label className="text-gray-700">记录日期 <span className="text-red-500">*</span></Label>
              <DatePicker className="w-full"
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
                  {OPERATORS.map(op => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
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
            <details
              className="md:col-span-3 border border-blue-100 rounded-lg bg-blue-50/20 overflow-hidden"
              open
            >
              <summary className="cursor-pointer select-none px-3 py-2 bg-blue-50/50 hover:bg-blue-50 text-sm font-semibold text-blue-800 flex items-center justify-between">
                <span>▼ 环境参数 — 空气×4 + 土壤×4（共 8 项）</span>
                <span className="text-xs text-blue-600 font-normal">
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
            {/* 2026-06-28：浇水折叠面板（简化版）— 不再需要勾选，用户填了就记录 */}
            {/* open 状态：用户填了方式/量 → 自动展开（视觉反馈），否则保持折叠 */}
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
                    value={formData.wateringMethod || 'manual_watering'}
                    onValueChange={(v) => setFormData({ ...formData, wateringMethod: v })}
                  >
                    <SelectTrigger className={deepInputClass}>
                      <SelectValue placeholder="选择浇水方式（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* 2026-10-17：下拉精简为 5 种主流方式（人工浇水/滴灌/喷灌/喷雾/漫灌），
                          选项来自常量 WATERING_METHOD_OPTIONS；
                          历史数据的翻译仍走全量 WATERING_METHOD_MAP */}
                      {WATERING_METHOD_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
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
                      onChange={(e) => setFormData({
                        ...formData,
                        wateringAmount: e.target.value ? Number(e.target.value) : undefined
                      })}
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
                        {/* 2026-10-17：下拉精简为 升 / 立方米（选项来自常量 DAILY_RECORD_WATERING_UNITS）；
                            历史数据的单位翻译仍走全量 WATERING_UNIT_MAP */}
                        {DAILY_RECORD_WATERING_UNITS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </details>
            {/* 2026-06-28：施肥折叠面板（动态列表，1:N 嵌套）— md:col-span-3 占满弹窗宽度 */}
            <details
              className="md:col-span-3 border border-emerald-100 rounded-lg bg-emerald-50/20 overflow-hidden"
              open={(formData.fertilizerRecords?.length || 0) > 0}
            >
              <summary className="cursor-pointer select-none px-3 py-2 bg-emerald-50/50 hover:bg-emerald-50 text-sm font-semibold text-emerald-800 flex items-center justify-between">
                <span>▼ 施肥（{(formData.fertilizerRecords?.length || 0)} 种）</span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleAddFertilizer(); }}
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
            {/* 2026-06-28：用药折叠面板（动态列表，1:N 嵌套，含安全间隔期/防治对象）— md:col-span-3 占满宽度 */}
            <details
              className="md:col-span-3 border border-red-100 rounded-lg bg-red-50/20 overflow-hidden"
              open={(formData.pesticideRecords?.length || 0) > 0}
            >
              <summary className="cursor-pointer select-none px-3 py-2 bg-red-50/50 hover:bg-red-50 text-sm font-semibold text-red-800 flex items-center justify-between">
                <span>▼ 用药（{(formData.pesticideRecords?.length || 0)} 种）</span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleAddPesticide(); }}
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
            {/* 2026-06-28：数量池统计折叠到二级（避免与施肥/用药面板混淆，UI 更整洁）— md:col-span-3 占满宽度 */}
            <details
              className="md:col-span-3 border border-gray-200 rounded-lg bg-gray-50/50 overflow-hidden"
              open={false}
            >
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 flex items-center justify-between">
                <span>▼ 数量统计</span>
                <span className="text-xs text-gray-500 font-normal">
                  {/* 2026-07-28 审核 H-7：原读 motherLossCount/replantCount/expandedPlantCount/seedlingLossCount 是死字段从未被赋值，改读实际输入字段 */}
                  {/* 2026-10-17 单池化：母株损耗两种模式都有效；小苗产出/小苗损耗仅 1:多 */}
                  {(formData.survivalCountChange || 0) > 0 ? ' 母株损耗 ' + formData.survivalCountChange : ''}
                  {(formData.replantChange || 0) > 0 ? ' 补苗 ' + formData.replantChange : ''}
                  {(isMotherMode && (formData.runnerIncreaseCount || 0) > 0) ? ' 小苗产出 ' + formData.runnerIncreaseCount : ''}
                  {(isMotherMode && (formData.lossCountChange || 0) > 0) ? ' 小苗损耗 ' + formData.lossCountChange : ''}
                </span>
              </summary>
              {/* 2026-06-28：内部 4 列布局 — 1:多 模式 4 字段一行（母株损耗/补苗/小苗产出/小苗损耗 — 母株池先排，再小苗池）；1:1 模式 2 字段（补苗/小苗损耗） */}
              <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* 2026-10-17 单池化：母株损耗两种模式都显示 ——
                    1:1 模式下苗床上的苗既是母株也是小苗，损耗统一记入母株池
                    （此前 1:1 隐藏本字段、只留"小苗损耗"，而 1:1 的小苗产出池恒为 0 → 损耗永远录不进去） */}
                <div>
                  <Label className="text-gray-700">
                    母株损耗
                    <span className="text-xs text-gray-500 ml-1">
                      {isMotherMode
                        ? '（母株死亡/减少，存入"母株损耗"字段）'
                        : '（1:1 模式：小苗即母株，损耗记入母株池）'}
                    </span>
                  </Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.survivalCountChange ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '' || v === '-') {
                          setFormData({ ...formData, survivalCountChange: undefined });
                          return;
                        }
                    const n = Number(v);
                    if (!isNaN(n) && n >= 0) {
                      setFormData({ ...formData, survivalCountChange: n });
                    }
                  }}
                  placeholder="今日母株死亡数（不可为负）"
                  className={deepInputClass}
                />
              </div>
            {/* 2026-06-28：补苗移到母株损耗之后（按"母株池 → 小苗池"业务分组：母株损耗+补苗=母株池；小苗产出+小苗损耗=小苗池） */}
            {/* 补苗（两种模式都显示）— 1:1=补种子进入；1:多=补母株进入；补入"补苗累计"字段 */}
            <div>
              <Label className="text-gray-700">
                补苗
                <span className="text-xs text-gray-500 ml-1">
                  （{isMotherMode ? '新增母株进入苗床，存入"补苗累计"字段' : '重新补种子进入苗床，存入"补苗累计"字段'}）
                </span>
              </Label>
              <Input
                type="number"
                min="0"
                value={formData.replantChange ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || v === '-') {
                    setFormData({ ...formData, replantChange: undefined });
                    return;
                  }
                  const n = Number(v);
                  if (!isNaN(n) && n >= 0) {
                    setFormData({ ...formData, replantChange: n });
                  }
                }}
                placeholder={isMotherMode ? '今日新增母株数（不可为负）' : '今日补种子数（不可为负）'}
                className={deepInputClass}
              />
            </div>
            {/* 小苗产出（仅 1:多 模式 — 1:1 模式无"小苗产出"业务概念） */}
            {isMotherMode && (
              <div>
                <Label className="text-gray-700">
                  小苗产出
                  <span className="text-xs text-gray-500 ml-1">（匍匐茎/组培/扦插/分株每日新增，存入"小苗产出"字段）</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.runnerIncreaseCount ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || v === '-') {
                      setFormData({ ...formData, runnerIncreaseCount: undefined });
                      return;
                    }
                    const n = Number(v);
                    if (!isNaN(n) && n >= 0) {
                      setFormData({ ...formData, runnerIncreaseCount: n });
                    }
                  }}
                  placeholder="今日新增小苗数（不可为负）"
                  className={deepInputClass}
                />
              </div>
            )}
            {/* 2026-06-27：移除"人工定植"录入字段（按业务规则：所有成品小苗必须先入库再出库） */}
            {/* 2026-10-17 单池化：小苗损耗仅 1:多 模式显示 ——
                1:1 没有独立小苗产出池（expanded 恒 0），损耗统一走上面的"母株损耗" */}
            {isMotherMode && (
            <div>
              <Label className="text-gray-700">
                小苗损耗
                <span className="text-xs text-gray-500 ml-1">（小苗死亡/淘汰，存入"小苗损耗"字段）</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={formData.lossCountChange ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || v === '-') {
                    setFormData({ ...formData, lossCountChange: undefined });
                    return;
                  }
                  const n = Number(v);
                  if (!isNaN(n) && n >= 0) {
                    setFormData({ ...formData, lossCountChange: n });
                  }
                }}
                placeholder="今日小苗死亡数（不可为负）"
                className={deepInputClass}
              />
            </div>
            )}
              </div>{/* 关闭数量统计 details 内层 grid */}
            </details>{/* 关闭数量统计 details 面板 */}
            {/* 2026-06-28：操作人员 + 异常情况 已移到第 1 行（与记录日期同排），此处不再重复 */}
            {/* 备注（单独一行，占3列） */}
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
