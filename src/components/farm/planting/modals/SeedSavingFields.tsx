/**
 * 2026-07-03 v3：留种记录表单字段
 * 7 个字段：日期/株号/部位/数量/单位/操作人/备注
 */

import { Label, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DatePicker, TextArea } from '@/components/ui'
import { todayLocal } from '@/lib/dateUtils'
import type { SeedSavingRecordInput, SeedSavingPart } from '@/services/apiPlantingSubRecordService'

const HARVEST_PART_LABELS: Record<SeedSavingPart, string> = {
  fruit: '果实',
  seed: '种子',
  whole_plant: '全株',
  root: '根',
  stem: '茎',
  leaf: '叶',
  other: '其他',
}

const HARVEST_PARTS: SeedSavingPart[] = ['fruit', 'seed', 'whole_plant', 'root', 'stem', 'leaf', 'other']

interface SeedSavingFieldsProps {
  form: SeedSavingRecordInput
  onChange: (form: SeedSavingRecordInput) => void
  deepInputClass: string
}

export function SeedSavingFields({ form, onChange, deepInputClass }: SeedSavingFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <Label className="text-gray-700">记录日期 <span className="text-red-500">*</span></Label>
        <DatePicker className="w-full"
          selected={form.recordDate ? new Date(form.recordDate) : undefined}
          onChange={(date) => onChange({ ...form, recordDate: todayLocal(date) })}
        />
      </div>
      <div className="col-span-2">
        <Label className="text-gray-700">留种株号 *</Label>
        <Input
          value={form.plantMarker}
          onChange={(e) => onChange({ ...form, plantMarker: e.target.value })}
          placeholder="例: A区第3排 #001-#050"
          className={deepInputClass}
        />
      </div>
      <div>
        <Label className="text-gray-700">采收部位</Label>
        <Select
          value={form.harvestPart ?? 'seed'}
          onValueChange={(v) => onChange({ ...form, harvestPart: v as SeedSavingPart })}
        >
          <SelectTrigger className={deepInputClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HARVEST_PARTS.map((p) => (
              <SelectItem key={p} value={p}>{HARVEST_PART_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-gray-700">数量</Label>
        <Input
          type="number"
          value={form.quantity ?? ''}
          onChange={(e) => onChange({ ...form, quantity: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="数量"
          className={deepInputClass}
        />
      </div>
      <div>
        <Label className="text-gray-700">单位</Label>
        <Input
          value={form.unit ?? ''}
          onChange={(e) => onChange({ ...form, unit: e.target.value })}
          placeholder="如 株 / 袋 / 克"
          className={deepInputClass}
        />
      </div>
      <div className="col-span-3">
        <Label className="text-gray-700">操作人</Label>
        <Input
          value={form.operator ?? ''}
          onChange={(e) => onChange({ ...form, operator: e.target.value })}
          placeholder="操作员姓名"
          className={deepInputClass}
        />
      </div>
      <div className="col-span-3">
        <Label className="text-gray-700">备注</Label>
        <TextArea
          value={form.remarks ?? ''}
          onChange={(e) => onChange({ ...form, remarks: e.target.value })}
          rows={1}
          placeholder="其他说明"
          className={deepInputClass}
        />
      </div>
    </div>
  )
}
