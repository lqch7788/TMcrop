/**
 * 2026-07-03 v4：留种记录表单字段（支持种子保存/营养体保存双模式）
 * - 顶部保存模式切换 banner
 * - 模式自适应字段布局
 * - 共享字段（日期/株号/批次号/部位/数量/单位/用途/处理/存储/操作人）
 * - 模式特有指标（发芽率/千粒重/纯度/含水率 vs 规格/芽眼数/检疫/休眠）
 * - 派生指标（发芽率颜色阈值）
 */

import { useMemo } from 'react'
import { Label, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DatePicker, TextArea } from '@/components/ui'
import { OPERATORS } from '@/data/cropData'
import { useDictionaryStore, getDictItems } from '@/stores/useDictionaryStore'
import { todayLocal } from '@/lib/dateUtils'
import {
  HARVEST_PART_LABELS,
  VEGETATIVE_HARVEST_PARTS,
  PURPOSE_OPTIONS,
  PROCESSING_OPTIONS,
  SEED_TREATMENT_OPTIONS,
  MATURITY_OPTIONS,
  SIZE_GRADE_OPTIONS,
  HEALTH_STATUS_OPTIONS,
  DORMANCY_OPTIONS,
  CONTAINER_OPTIONS,
  getSeedSavingRateColor,
} from './seedSavingConstants'
import type { SeedSavingFormState } from './seedSavingConstants'
import type { SeedSavingPart } from '@/services/apiPlantingSubRecordService'

interface SeedSavingFieldsProps {
  form: SeedSavingFormState
  onChange: (form: SeedSavingFormState) => void
  deepInputClass: string
}

export function SeedSavingFields({ form, onChange, deepInputClass }: SeedSavingFieldsProps) {
  // 2026-07-03 v4：单位从数据词典读取
  const dictionaries = useDictionaryStore((s) => s.dictionaries)
  const loadDictionaries = useDictionaryStore((s) => s.loadDictionaries)
  if (dictionaries.length === 0) { loadDictionaries() } // 惰性加载
  const unitOptions = useMemo(
    () => getDictItems('unit').map((d) => ({ value: d.dictCode, label: d.dictLabel })),
    [dictionaries],
  )

  const mode: 'seed' | 'vegetative' = form.preservationMode || 'seed'
  const switchMode = (newMode: 'seed' | 'vegetative') => {
    if (newMode === mode) return
    onChange({
      ...form,
      preservationMode: newMode,
      harvestPart: newMode === 'vegetative' ? 'tuber' : 'seed',
      // 清空种子字段
      germinationRate: undefined, thousandSeedWeight: undefined, purity: undefined,
      moistureContent: undefined, seedTreatment: undefined, maturityStage: undefined,
      // 清空营养体字段
      sizeGrade: undefined, budNodeCount: undefined, healthStatus: undefined, dormancyState: undefined,
    })
  }

  return (
    <>
      {/* 保存模式切换 banner */}
      <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200 rounded-lg">
        <Label className="text-gray-700 mb-2 block">保存模式 <span className="text-red-500">*</span></Label>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="preservationMode" value="seed" checked={mode === 'seed'}
              onChange={() => switchMode('seed')} className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-gray-800">种子保存</span>
            <span className="text-xs text-gray-500">（种子/果实 — 干燥贮藏，适用于粮食/蔬菜/花卉种子）</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="preservationMode" value="vegetative" checked={mode === 'vegetative'}
              onChange={() => switchMode('vegetative')} className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-gray-800">营养体保存</span>
            <span className="text-xs text-gray-500">（块茎/鳞茎/插穗等 — 适用马铃薯/甘薯/大蒜/葡萄/草莓）</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 1：记录日期 | 留种批次号 | 留种株号 | 操作人 */}
        <div>
          <Label className="text-gray-700">记录日期 <span className="text-red-500">*</span></Label>
          <DatePicker className="w-full"
            selected={form.recordDate ? new Date(form.recordDate) : undefined}
            onChange={(date) => onChange({ ...form, recordDate: todayLocal(date) })}
          />
        </div>
        <div>
          <Label className="text-gray-700" title="同一批采收/处理/存储的编号，便于批次追踪">留种批次号</Label>
          <Input value={form.lotNumber ?? ''}
            onChange={(e) => onChange({ ...form, lotNumber: e.target.value })}
            placeholder="如 LOT-2026-001" className={deepInputClass}
            title="同一批采收/处理/存储的编号" />
        </div>
        <div>
          <Label className="text-gray-700">留种株号 <span className="text-red-500">*</span></Label>
          <Input value={form.plantMarker}
            onChange={(e) => onChange({ ...form, plantMarker: e.target.value })}
            placeholder="例: A区第3排 #001-#050" className={deepInputClass} />
        </div>
        <div>
          <Label className="text-gray-700">操作人</Label>
          <Select value={form.operator ?? ''} onValueChange={(v) => onChange({ ...form, operator: v })}>
            <SelectTrigger className={deepInputClass}><SelectValue placeholder="请选择操作人" /></SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (<SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 2：采收部位 | 数量 | 单位 | 成熟度/规格 */}
        <div>
          <Label className="text-gray-700">采收部位</Label>
          <Select value={form.harvestPart ?? 'seed'}
            onValueChange={(v) => onChange({ ...form, harvestPart: v as SeedSavingPart })}>
            <SelectTrigger className={deepInputClass}><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-80">
              {Object.entries(HARVEST_PART_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-700" title={mode === 'seed' ? '种子重量(g/kg) 或 粒数' : '个数 或 重量(kg)'}>数量</Label>
          <Input type="number" value={form.quantity ?? ''}
            onChange={(e) => onChange({ ...form, quantity: e.target.value ? Number(e.target.value) : undefined })}
            placeholder={mode === 'seed' ? '如 500（克）' : '如 200（个）'} className={deepInputClass} />
        </div>
        <div>
          <Label className="text-gray-700">单位</Label>
          <Select value={form.unit ?? ''}
            onValueChange={(v) => onChange({ ...form, unit: v })}>
            <SelectTrigger className={deepInputClass}>
              <SelectValue placeholder={mode === 'seed' ? '如 克 / 千克 / 粒' : '如 个 / 株 / 公斤'} />
            </SelectTrigger>
            <SelectContent>
              {unitOptions.length === 0 ? (
                <div className="px-2 py-4 text-sm text-gray-400 text-center">字典加载中...</div>
              ) : (
                unitOptions.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <div className="mt-1 text-xs text-gray-400 leading-relaxed">
            源自数据词典 · 如需新增请前往数据词典管理
          </div>
        </div>
        <div>
          {mode === 'seed' ? (
            <>
              <Label className="text-gray-700" title="采收时果实的成熟程度">成熟度</Label>
              <Select value={form.maturityStage ?? undefined}
                onValueChange={(v) => onChange({ ...form, maturityStage: v })}>
                <SelectTrigger className={deepInputClass}><SelectValue placeholder="选择成熟度" /></SelectTrigger>
                <SelectContent>
                  {MATURITY_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <>
              <Label className="text-gray-700" title="营养体的规格等级">规格等级</Label>
              <Select value={form.sizeGrade ?? undefined}
                onValueChange={(v) => onChange({ ...form, sizeGrade: v })}>
                <SelectTrigger className={deepInputClass}><SelectValue placeholder="选择规格" /></SelectTrigger>
                <SelectContent>
                  {SIZE_GRADE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* Row 3：用途 | 处理方式 | 存储位置 | 容器类型 */}
        <div>
          <Label className="text-gray-700" title="留种材料的最终用途/去向">用途/去向</Label>
          <Select value={form.purpose ?? undefined}
            onValueChange={(v) => onChange({ ...form, purpose: v })}>
            <SelectTrigger className={deepInputClass}><SelectValue placeholder="选择用途" /></SelectTrigger>
            <SelectContent>
              {PURPOSE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-700" title="采收后的加工处理方式">处理方式</Label>
          <Select value={form.processingMethod ?? undefined}
            onValueChange={(v) => onChange({ ...form, processingMethod: v })}>
            <SelectTrigger className={deepInputClass}><SelectValue placeholder="选择处理方式" /></SelectTrigger>
            <SelectContent>
              {PROCESSING_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-700" title="存储的具体位置（仓库编号/冰箱/冷库）">存储位置</Label>
          <Input value={form.storageLocation ?? ''}
            onChange={(e) => onChange({ ...form, storageLocation: e.target.value })}
            placeholder="如 冷库A-3 / 冰箱2号" className={deepInputClass} />
        </div>
        <div>
          <Label className="text-gray-700" title="存储容器的类型">容器类型</Label>
          <Select value={form.containerType ?? undefined}
            onValueChange={(v) => onChange({ ...form, containerType: v })}>
            <SelectTrigger className={deepInputClass}><SelectValue placeholder="选择容器" /></SelectTrigger>
            <SelectContent>
              {CONTAINER_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {/* 模式特有字段 */}
        {mode === 'seed' ? (
          <>
            <div>
              <Label className="text-gray-700" title="发芽率 = 发芽种子数 ÷ 测试种子数 × 100%">发芽率（%）</Label>
              <Input type="number" min="0" max="100" value={form.germinationRate ?? ''}
                onChange={(e) => onChange({ ...form, germinationRate: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="如 92.5" className={deepInputClass}
                title="发芽率 = 发芽种子数 ÷ 测试种子数 × 100%" />
              <div className="mt-1 text-xs text-gray-500 leading-relaxed">
                标准发芽试验中的发芽百分率
                <span className="ml-1 text-gray-400">（≥ 80% 优良，50-80% 一般，&lt; 50% 偏低）</span>
              </div>
            </div>
            <div>
              <Label className="text-gray-700" title="1000 粒种子的重量，反映种子饱满度">千粒重（g）</Label>
              <Input type="number" min="0" value={form.thousandSeedWeight ?? ''}
                onChange={(e) => onChange({ ...form, thousandSeedWeight: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="如 35.2" className={deepInputClass}
                title="1000 粒种子的重量，反映种子饱满度" />
              <div className="mt-1 text-xs text-gray-500 leading-relaxed">
                1000 粒净种子的重量（g）
                <span className="ml-1 text-gray-400">（反映种子饱满度和成熟度）</span>
              </div>
            </div>
            <div>
              <Label className="text-gray-700" title="净种子占总重量的百分比">纯度（%）</Label>
              <Input type="number" min="0" max="100" value={form.purity ?? ''}
                onChange={(e) => onChange({ ...form, purity: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="如 98.0" className={deepInputClass}
                title="净种子占总重量的百分比" />
              <div className="mt-1 text-xs text-gray-500 leading-relaxed">
                净种子重量 ÷ 样品总重 × 100%
              </div>
            </div>
            <div>
              <Label className="text-gray-700" title="种子中的水分含量百分比">含水率（%）</Label>
              <Input type="number" min="0" max="100" value={form.moistureContent ?? ''}
                onChange={(e) => onChange({ ...form, moistureContent: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="如 12.0" className={deepInputClass}
                title="种子中的水分含量百分比" />
              <div className="mt-1 text-xs text-gray-500 leading-relaxed">
                种子含水量（安全贮藏一般 &lt; 13%）
              </div>
            </div>
            <div className="col-span-2">
              <Label className="text-gray-700" title="种子贮藏前的处理方式">种子处理</Label>
              <Select value={form.seedTreatment ?? undefined}
                onValueChange={(v) => onChange({ ...form, seedTreatment: v })}>
                <SelectTrigger className={deepInputClass}><SelectValue placeholder="选择种子处理方式" /></SelectTrigger>
                <SelectContent>
                  {SEED_TREATMENT_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              {/* derived: 预估可存储月数（含水率越低越长） */}
              <Label className="text-gray-700" title="根据含水率推算的预估安全贮藏期（仅供参考）">预估贮藏期（派生）</Label>
              <div className={`px-4 py-3 border border-gray-300 rounded-lg text-sm shadow-inner flex items-center ${
                (form.moistureContent ?? 0) > 0 ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-gray-50 text-gray-400'
              }`}>
                {(() => {
                  const mc = form.moistureContent ?? 0
                  if (mc <= 0) return <span>— （需先填含水率）</span>
                  const months = mc < 5 ? 60 : mc < 8 ? 36 : mc < 10 ? 24 : mc < 13 ? 12 : mc < 15 ? 6 : 3
                  const color = months >= 24 ? 'text-emerald-700' : months >= 12 ? 'text-amber-600' : 'text-red-600'
                  return <span className={color}>约 {months} 个月（含水率 {mc}%）</span>
                })()}
              </div>
              <div className="mt-1 text-xs text-gray-500 leading-relaxed">
                含水率越低贮藏期越长（≤ 5%：5 年，≤ 8%：3 年，≤ 12%：1 年）
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="col-span-2">
              <Label className="text-gray-700" title="块茎/鳞茎/插穗上的芽眼数或节数">芽眼数 / 节数（个）</Label>
              <Input type="number" min="0" value={form.budNodeCount ?? ''}
                onChange={(e) => onChange({ ...form, budNodeCount: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="如 8" className={deepInputClass}
                title="块茎/鳞茎/插穗上的芽眼数或节数" />
              <div className="mt-1 text-xs text-gray-500 leading-relaxed">
                单株/单薯/单穗的芽眼或节数（直接影响繁殖潜力）
              </div>
            </div>
            <div>
              <Label className="text-gray-700" title="病虫害检疫状态">检疫状态</Label>
              <Select value={form.healthStatus ?? undefined}
                onValueChange={(v) => onChange({ ...form, healthStatus: v })}>
                <SelectTrigger className={deepInputClass}><SelectValue placeholder="选择检疫状态" /></SelectTrigger>
                <SelectContent>
                  {HEALTH_STATUS_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700" title="营养体的休眠/萌发状态">休眠状态</Label>
              <Select value={form.dormancyState ?? undefined}
                onValueChange={(v) => onChange({ ...form, dormancyState: v })}>
                <SelectTrigger className={deepInputClass}><SelectValue placeholder="选择休眠状态" /></SelectTrigger>
                <SelectContent>
                  {DORMANCY_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"></div>
          </>
        )}

        {/* 备注 */}
        <div className="col-span-4">
          <Label className="text-gray-700">备注</Label>
          <TextArea value={form.remarks ?? ''}
            onChange={(e) => onChange({ ...form, remarks: e.target.value })}
            rows={2} placeholder="品种特征、特殊处理、观察记录等" className={deepInputClass} />
        </div>
      </div>
    </>
  )
}
