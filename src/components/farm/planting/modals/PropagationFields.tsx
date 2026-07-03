/**
 * 2026-07-03 v3：繁殖记录表单字段（育苗 phase 5）
 * 8 个字段：日期/温度/湿度/母株数量/子苗产出/子苗状态/移栽位置/操作人/备注
 */

import { Label, Input, NumberInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DatePicker, TextArea } from '@/components/ui'
import { todayLocal } from '@/lib/dateUtils'
import type { PropagationRecordInput } from '@/services/apiSeedlingPropagationService'

interface PropagationFieldsProps {
  form: PropagationRecordInput
  onChange: (form: PropagationRecordInput) => void
  deepInputClass: string
}

export function PropagationFields({ form, onChange, deepInputClass }: PropagationFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <Label className="text-gray-700">记录日期 <span className="text-red-500">*</span></Label>
        <DatePicker className="w-full"
          selected={form.recordDate ? new Date(form.recordDate) : undefined}
          onChange={(date) => onChange({ ...form, recordDate: todayLocal(date) })}
        />
      </div>
      <div>
        <Label className="text-gray-700">温度（℃）</Label>
        <Input type="number" value={form.temperature ?? ''}
          onChange={(e) => onChange({ ...form, temperature: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="环境温度" className={deepInputClass} />
      </div>
      <div>
        <Label className="text-gray-700">湿度（%）</Label>
        <Input type="number" value={form.humidity ?? ''}
          onChange={(e) => onChange({ ...form, humidity: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="环境湿度" className={deepInputClass} />
      </div>
      <div>
        <Label className="text-gray-700">母株数量</Label>
        <NumberInput value={String(form.motherPlantCount ?? '')}
          onChange={(v) => onChange({ ...form, motherPlantCount: v ? parseInt(v, 10) : undefined })}
          placeholder="当前母株总数" className={deepInputClass} />
      </div>
      <div>
        <Label className="text-gray-700">子苗产出</Label>
        <NumberInput value={String(form.seedlingOutput ?? '')}
          onChange={(v) => onChange({ ...form, seedlingOutput: v ? parseInt(v, 10) : undefined })}
          placeholder="当日新产子苗数" className={deepInputClass} />
      </div>
      <div>
        <Label className="text-gray-700">子苗状态</Label>
        <Select value={form.seedlingStatus ?? 'healthy'}
          onValueChange={(v) => onChange({ ...form, seedlingStatus: v as PropagationRecordInput['seedlingStatus'] })}>
          <SelectTrigger className={deepInputClass}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="healthy">健康</SelectItem>
            <SelectItem value="weak">弱苗</SelectItem>
            <SelectItem value="diseased">病害</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-3">
        <Label className="text-gray-700">移栽位置</Label>
        <Input value={form.transplantPosition ?? ''}
          onChange={(e) => onChange({ ...form, transplantPosition: e.target.value })}
          placeholder="如温室B区 / 3号苗床" className={deepInputClass} />
      </div>
      <div>
        <Label className="text-gray-700">操作人</Label>
        <Input value={form.operator ?? ''}
          onChange={(e) => onChange({ ...form, operator: e.target.value })}
          placeholder="操作员姓名" className={deepInputClass} />
      </div>
      <div className="col-span-2">
        <Label className="text-gray-700">备注</Label>
        <TextArea value={form.remarks ?? ''}
          onChange={(e) => onChange({ ...form, remarks: e.target.value })}
          rows={1} placeholder="异常情况、病虫害等" className={deepInputClass} />
      </div>
    </div>
  )
}
