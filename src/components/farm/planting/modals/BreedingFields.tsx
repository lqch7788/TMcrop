/**
 * 2026-07-03 v5：育种表单字段（仅有性繁殖）
 * 无性繁殖（组培/扦插/嫁接/压条/分株）已迁移至育苗模块
 * 有性繁殖（杂交/自交/回交/选育/标记/其他）保留在种植模块
 * - 父本/母本编码 + 来源
 * - 世代/操作类型/目标性状
 * - 结实数/种子数/授粉花数/结实率
 */

import { useEffect, useMemo, useState } from 'react'
import { Label, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DatePicker, TextArea } from '@/components/ui'
import { OPERATORS } from '@/data/cropData'
import { todayLocal } from '@/lib/dateUtils'
import { getSeedSources } from '@/services/apiSeedSourceService'
import { usePlantingStore } from '@/stores'
import { PlantingStatus } from '@/types/crop'
import type { SeedSource } from '@/types/crop'
import {
  SEXUAL_OPERATION_TYPES,
  OPERATION_TYPE_LABELS,
  GENERATION_OPTIONS,
  TARGET_TRAIT_OPTIONS,
  getRateColor,
} from './recordModalConstants'
import type { BreedingFormState } from './recordModalValidators'
import type { BreedingOperationType } from '@/services/apiPlantingSubRecordService'

export const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"

// 2026-10-18：育种记录属有性繁殖，世代下拉剔除「无性世代」分组（G0-G10）
const SEXUAL_GENERATION_OPTIONS = GENERATION_OPTIONS.filter((o) => o.group !== '无性世代')

interface SourceOption {
  code: string
  label: string
}

/**
 * 2026-10-19：可搜索的编码选择框（父本/母本来源为种源库/种植批号时使用）
 * 输入即过滤下拉选项，避免选项过多时翻找；选中后回填编码。
 */
function SourceCodePicker({ value, onChange, options, placeholder, deepInputClass }: {
  value: string;
  onChange: (v: string) => void;
  options: SourceOption[];
  placeholder: string;
  deepInputClass: string;
}) {
  const [open, setOpen] = useState(false)
  const filtered = useMemo(() => {
    const kw = (value || '').trim().toLowerCase()
    const list = kw
      ? options.filter((o) => o.code.toLowerCase().includes(kw) || o.label.toLowerCase().includes(kw))
      : options
    return list.slice(0, 50)
  }, [value, options])

  return (
    <div className="relative">
      <Input
        value={value ?? ''}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={deepInputClass}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((o) => (
            <div
              key={o.code}
              className="px-3 py-2 text-sm hover:bg-emerald-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              onMouseDown={(e) => { e.preventDefault(); onChange(o.code); setOpen(false) }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface BreedingFieldsProps {
  form: BreedingFormState
  onChange: (form: BreedingFormState) => void
  deepInputClass: string
}

export function BreedingFields({ form, onChange, deepInputClass }: BreedingFieldsProps) {
  // 2026-10-19：父本/母本来源选择「种源库编码 / 种植批号」时，自动加载可选项（含作物品种）
  const plantings = usePlantingStore((s) => s.items)
  const [seedSources, setSeedSources] = useState<SeedSource[]>([])

  useEffect(() => {
    getSeedSources()
      .then(setSeedSources)
      .catch((error) => {
        // 加载失败不阻断录入，退化为自由填写；错误显式记录
        console.error('[BreedingFields] 加载种源列表失败:', error)
      })
  }, [])

  const seedSourceOptions: SourceOption[] = useMemo(
    () => seedSources.map((s) => ({
      code: s.seedCode,
      label: `${s.seedCode} - ${s.cropName || ''}${s.cropVariety ? `（${s.cropVariety}）` : ''}`,
    })),
    [seedSources],
  )

  // 2026-10-19：父本/母本来源选「种植批号」时，只显示种植中的批号，
  // 过滤已结束 / 已采收 / 已取消的行（endTime 非空也视为已结束）
  const plantingOptions: SourceOption[] = useMemo(() => {
    const activeStatuses = new Set<string>([
      PlantingStatus.PLANTED,
      PlantingStatus.GROWING,
      PlantingStatus.HARVESTING,
    ])
    return plantings
      .filter((p) => !p.endTime && activeStatuses.has(p.status))
      .map((p) => ({
        code: p.plantCode,
        label: `${p.plantCode} - ${p.cropName || ''}${p.cropVariety ? `（${p.cropVariety}）` : ''}`,
      }))
  }, [plantings])

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label className="text-gray-700">记录日期 <span className="text-red-500">*</span></Label>
          <DatePicker className="w-full"
            selected={form.recordDate ? new Date(form.recordDate) : undefined}
            onChange={(date) => onChange({ ...form, recordDate: todayLocal(date) })}
          />
        </div>
        <div>
          <Label className="text-gray-700">操作人</Label>
          <Select
            value={form.operator ?? ''}
            onValueChange={(v) => onChange({ ...form, operator: v })}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue placeholder="请选择操作人" />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-700">操作类型 <span className="text-red-500">*</span></Label>
          <Select
            value={form.operationType}
            onValueChange={(v) => onChange({ ...form, operationType: v as BreedingOperationType })}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEXUAL_OPERATION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{OPERATION_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-700">世代</Label>
          <Select
            value={form.generation ?? ''}
            onValueChange={(v) => onChange({ ...form, generation: v })}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue placeholder="请选择世代（如 F1 / F2 / BC1 / S3）" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {(() => {
                const groups = Array.from(new Set(SEXUAL_GENERATION_OPTIONS.map((o) => o.group)))
                return groups.map((g) => (
                  <div key={g}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                      {g}
                    </div>
                    {SEXUAL_GENERATION_OPTIONS.filter((o) => o.group === g).map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </div>
                ))
              })()}
            </SelectContent>
          </Select>
        </div>
        {/* 父本/母本（有性繁殖专用）：来源在前、编码在后；
            来源=种源库/种植批号时编码为可搜索下拉，来源=自由填写时手工输入 */}
        <div>
          <Label className="text-gray-700">父本来源</Label>
          <Select
            value={form.parentMaleSource ?? 'free'}
            onValueChange={(v) => onChange({ ...form, parentMaleSource: v as any })}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seed_source">种源库编码</SelectItem>
              <SelectItem value="planting">种植批号</SelectItem>
              <SelectItem value="free">自由填写</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-700">父本编码</Label>
          {form.parentMaleSource === 'seed_source' ? (
            <SourceCodePicker
              value={form.parentMaleCode ?? ''}
              onChange={(v) => onChange({ ...form, parentMaleCode: v })}
              options={seedSourceOptions}
              placeholder="搜索/选择种源库编码"
              deepInputClass={deepInputClass}
            />
          ) : form.parentMaleSource === 'planting' ? (
            <SourceCodePicker
              value={form.parentMaleCode ?? ''}
              onChange={(v) => onChange({ ...form, parentMaleCode: v })}
              options={plantingOptions}
              placeholder="搜索/选择种植批号"
              deepInputClass={deepInputClass}
            />
          ) : (
            <Input
              value={form.parentMaleCode ?? ''}
              onChange={(e) => onChange({ ...form, parentMaleCode: e.target.value })}
              placeholder="自由填写父本编码"
              className={deepInputClass}
            />
          )}
        </div>
        <div>
          <Label className="text-gray-700">母本来源</Label>
          <Select
            value={form.parentFemaleSource ?? 'free'}
            onValueChange={(v) => onChange({ ...form, parentFemaleSource: v as any })}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seed_source">种源库编码</SelectItem>
              <SelectItem value="planting">种植批号</SelectItem>
              <SelectItem value="free">自由填写</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-700">母本编码</Label>
          {form.parentFemaleSource === 'seed_source' ? (
            <SourceCodePicker
              value={form.parentFemaleCode ?? ''}
              onChange={(v) => onChange({ ...form, parentFemaleCode: v })}
              options={seedSourceOptions}
              placeholder="搜索/选择种源库编码"
              deepInputClass={deepInputClass}
            />
          ) : form.parentFemaleSource === 'planting' ? (
            <SourceCodePicker
              value={form.parentFemaleCode ?? ''}
              onChange={(v) => onChange({ ...form, parentFemaleCode: v })}
              options={plantingOptions}
              placeholder="搜索/选择种植批号"
              deepInputClass={deepInputClass}
            />
          ) : (
            <Input
              value={form.parentFemaleCode ?? ''}
              onChange={(e) => onChange({ ...form, parentFemaleCode: e.target.value })}
              placeholder="自由填写母本编码"
              className={deepInputClass}
            />
          )}
        </div>
        <div className="col-span-4">
          <Label className="text-gray-700">目标性状（多选）</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {TARGET_TRAIT_OPTIONS.map((trait) => {
              const selected = (form.targetTraits || []).includes(trait)
              return (
                <label
                  key={trait}
                  title={`目标性状：${trait}`}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded border cursor-pointer text-sm transition-colors ${
                    selected
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-medium'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5"
                    checked={selected}
                    onChange={(e) => {
                      const list = form.targetTraits || []
                      onChange({
                        ...form,
                        targetTraits: e.target.checked
                          ? [...list, trait]
                          : list.filter((t) => t !== trait),
                      })
                    }}
                  />
                  {trait}
                </label>
              )
            })}
          </div>
        </div>
        {/* 有性繁殖指标（结实率/种子数/授粉花数） */}
        <div>
          <Label className="text-gray-700" title="单株/单批成功坐果的数量（授粉花→果实的转化结果）">
            结实数（个）
          </Label>
          <Input
            type="number"
            min="0"
            value={form.fruitCount ?? 0}
            onChange={(e) => onChange({ ...form, fruitCount: e.target.value ? Number(e.target.value) : 0 })}
            placeholder="0"
            title="单株/单批成功坐果的数量"
            className={deepInputClass}
          />
          <div className="mt-1 text-xs text-gray-500 leading-relaxed">
            授粉后发育成果实的数量（去雄→授粉→坐果的成功计数）
          </div>
        </div>
        <div>
          <Label className="text-gray-700" title="从结实果实中实际采收的种子粒数">
            收获种子数（粒）
          </Label>
          <Input
            type="number"
            min="0"
            value={form.seedCount ?? 0}
            onChange={(e) => onChange({ ...form, seedCount: e.target.value ? Number(e.target.value) : 0 })}
            placeholder="0"
            title="从结实果实中实际采收的种子粒数"
            className={deepInputClass}
          />
          <div className="mt-1 text-xs text-gray-500 leading-relaxed">
            果实成熟后从果实中采收的种子总粒数
            <span className="ml-1 text-gray-400">（单果种子数 = 收获种子数 ÷ 结实数）</span>
          </div>
        </div>
        <div>
          <Label className="text-gray-700" title="本批授粉的花朵总数（计算结实率=结实数/授粉花数的基数）">
            授粉花数（朵）
          </Label>
          <Input
            type="number"
            min="0"
            value={form.pollinatedFlowerCount ?? 0}
            onChange={(e) => onChange({ ...form, pollinatedFlowerCount: e.target.value ? Number(e.target.value) : 0 })}
            placeholder="0"
            title="本批授粉的花朵总数"
            className={deepInputClass}
          />
          <div className="mt-1 text-xs text-gray-500 leading-relaxed">
            本批授粉的花朵总数（结实率的基数）
            <span className="ml-1 text-gray-400">（结实率 = 结实数 ÷ 授粉花数）</span>
          </div>
        </div>
        <div>
          <Label className="text-gray-700" title="结实率 = 结实数 ÷ 授粉花数，自动计算">
            结实率（派生）
          </Label>
          <div
            className={`px-4 py-3 border border-gray-300 rounded-lg text-sm shadow-inner flex items-center ${
              (form.pollinatedFlowerCount ?? 0) > 0 ? 'bg-emerald-50 text-emerald-700 font-medium' : 'bg-gray-50 text-gray-400'
            }`}
            title={`结实率 = 结实数 ÷ 授粉花数 = ${form.fruitCount ?? 0} ÷ ${form.pollinatedFlowerCount ?? 0}`}
          >
            {(() => {
              const flowers = form.pollinatedFlowerCount ?? 0
              const fruits = form.fruitCount ?? 0
              if (flowers <= 0) return <span>— （需先填授粉花数）</span>
              const rate = (fruits / flowers) * 100
              const color = getRateColor(rate, 'sexual')
              return (
                <span className={color}>
                  {rate.toFixed(1)}%
                  <span className="ml-2 text-xs text-gray-500 font-normal">
                    ({fruits} / {flowers})
                  </span>
                </span>
              )
            })()}
          </div>
          <div className="mt-1 text-xs text-gray-500 leading-relaxed">
            公式：结实率 = 结实数 ÷ 授粉花数 × 100%
            <span className="ml-1 text-gray-400">（≥ 50% 优良，20-50% 一般，&lt; 20% 偏低）</span>
          </div>
        </div>
        <div className="col-span-4">
          <Label className="text-gray-700">备注</Label>
          <TextArea
            value={form.remarks ?? ''}
            onChange={(e) => onChange({ ...form, remarks: e.target.value })}
            rows={2}
            placeholder="目标性状、过程记录等"
            className={deepInputClass}
          />
        </div>
      </div>
    </>
  )
}
