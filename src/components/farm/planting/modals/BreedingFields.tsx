/**
 * 2026-07-03 v5：育种表单字段（仅有性繁殖）
 * 无性繁殖（组培/扦插/嫁接/压条/分株）已迁移至育苗模块
 * 有性繁殖（杂交/自交/回交/选育/标记/其他）保留在种植模块
 * - 父本/母本编码 + 来源
 * - 世代/操作类型/目标性状
 * - 结实数/种子数/授粉花数/结实率
 */

import { Label, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DatePicker, TextArea } from '@/components/ui'
import { OPERATORS } from '@/data/cropData'
import { todayLocal } from '@/lib/dateUtils'
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

interface BreedingFieldsProps {
  form: BreedingFormState
  onChange: (form: BreedingFormState) => void
  deepInputClass: string
}

export function BreedingFields({ form, onChange, deepInputClass }: BreedingFieldsProps) {
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
                const groups = Array.from(new Set(GENERATION_OPTIONS.map((o) => o.group)))
                return groups.map((g) => (
                  <div key={g}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                      {g}
                    </div>
                    {GENERATION_OPTIONS.filter((o) => o.group === g).map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </div>
                ))
              })()}
            </SelectContent>
          </Select>
        </div>
        {/* 父本/母本编码（有性繁殖专用） */}
        <div>
          <Label className="text-gray-700">父本编码</Label>
          <Input
            value={form.parentMaleCode ?? ''}
            onChange={(e) => onChange({ ...form, parentMaleCode: e.target.value })}
            placeholder="父本编码（关联品种编码 / 父本种植编号 / 自由填写）"
            className={deepInputClass}
          />
        </div>
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
          <Label className="text-gray-700">母本编码</Label>
          <Input
            value={form.parentFemaleCode ?? ''}
            onChange={(e) => onChange({ ...form, parentFemaleCode: e.target.value })}
            placeholder="母本编码（默认本批种植，可填种源库编码）"
            className={deepInputClass}
          />
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
