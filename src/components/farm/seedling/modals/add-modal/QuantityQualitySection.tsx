/**
 * 育苗新增弹窗 — 数量与品质区（单株育苗 / 扩繁育苗两种模式）
 * 2026-10-18：从 AddModal.tsx 拆出（纯移动，无逻辑变更）
 */
import type { Dispatch, SetStateAction } from 'react';
import {
  Input,
  NumberInput,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { DictSelect } from '../../../../common/settings/DictSelect';
import { SeedlingCalculateMode, type SeedSource } from '../../../../../types/crop';
import type { AddFormData } from './types';
import { deepInputClass } from './helpers';

interface QuantityQualitySectionProps {
  formData: AddFormData;
  setFormData: Dispatch<SetStateAction<AddFormData>>;
  OPERATORS: Array<{ value: string; label: string }>;
  propagationMultiples: Array<{ value: number; label: string }>;
  sourceRequiresExplicitConsumption: boolean;
  sourceAvailableCount: number;
  selectedSource: SeedSource | null;
  initialCountExceeds: boolean;
  motherCountExceeds: boolean;
  targetSurvivalCount: number;
  theoreticalYield: number;
  handlePropagationMultipleChange: (value: number) => void;
}

export function QuantityQualitySection({
  formData,
  setFormData,
  OPERATORS,
  propagationMultiples,
  sourceRequiresExplicitConsumption,
  sourceAvailableCount,
  selectedSource,
  initialCountExceeds,
  motherCountExceeds,
  targetSurvivalCount,
  theoreticalYield,
  handlePropagationMultipleChange,
}: QuantityQualitySectionProps) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">数量与品质</h3>

      {/* 2026-06-16: 育苗计算模式取消 UI 选择（propagationMode 自动联动，避免前后矛盾）
          字段保留在 state 中（calculateMode）以兼容 EditModal/apiSeedlingService/历史数据 */}

      {/* 单株育苗模式 */}
      {formData.calculateMode === SeedlingCalculateMode.SINGLE && (
        <div className="grid grid-cols-2 gap-4">
          {/* 2026-06-15: 数量体系重构 — 1:多 模式显示母株数量输入框 */}
          {formData.propagationMode === 'one_to_many' ? (
            /* 1:多 模式：母株数量 */
            <div>
              <Label className="text-gray-900">
                母株数量 <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 ml-2">（匍匐茎/组培/扦插/分株）</span>
              </Label>
              <NumberInput
                value={formData.motherPlantCount}
                onChange={(val) => setFormData({ ...formData, motherPlantCount: parseFloat(val) || 0 })}
                className={`${deepInputClass} ${motherCountExceeds ? 'border-red-500 ring-1 ring-red-300' : ''}`}
                placeholder="请输入母株数量（>0）"
                decimals={0}
              />
              <p className="text-xs text-gray-500 mt-1">
                子苗通过每日记录"新出苗数"累加；母株可继续产苗或一次性分出
              </p>
            </div>
          ) : (
            /* 1:1 模式：初始数量 */
            <div>
              <Label className="text-gray-900">
                初始数量 <span className="text-red-500">*</span>
              </Label>
              <NumberInput
                value={formData.initialCount}
                onChange={(val) => setFormData({ ...formData, initialCount: parseFloat(val) || 0 })}
                className={`${deepInputClass} ${initialCountExceeds ? 'border-red-500 ring-1 ring-red-300' : ''}`}
                placeholder="请输入播种数量（1:1 模式）"
                decimals={0}
              />
              {initialCountExceeds && (
                <p className="text-xs text-red-500 mt-1">
                  超过种源可用数量（{sourceAvailableCount}）
                </p>
              )}
            </div>
          )}

          {/* 2026-10-17：种源单位与育苗单位不同口径时，必须显式填写种源消耗量 */}
          {sourceRequiresExplicitConsumption && (
            <div>
              <Label className="text-gray-900">
                种源消耗量（{selectedSource?.unit}）<span className="text-red-500">*</span>
              </Label>
              <NumberInput
                value={formData.sourceConsumedQuantity}
                onChange={(val) => setFormData({ ...formData, sourceConsumedQuantity: parseFloat(val) || 0 })}
                className={`${deepInputClass} ${formData.sourceConsumedQuantity > sourceAvailableCount ? 'border-red-500 ring-1 ring-red-300' : ''}`}
                placeholder={`请输入本次领用的种源数量（${selectedSource?.unit}）`}
                decimals={3}
              />
              <p className="text-xs text-amber-600 mt-1">
                种源按「{selectedSource?.unit}」计量，与育苗单位「{formData.unit}」不同，
                不能按育苗数量自动扣减，请填写本次实际领用量
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                可用：{sourceAvailableCount} {selectedSource?.unit}
              </p>
            </div>
          )}

          {/* 目标成苗率 */}
          <div>
            <Label className="text-gray-900">
              目标成苗率（%）<span className="text-red-500">*</span>
            </Label>
            <NumberInput
              value={formData.targetSurvivalRate}
              onChange={(val) => setFormData({ ...formData, targetSurvivalRate: parseFloat(val) || 0 })}
              className={deepInputClass}
              placeholder="0-100%"
              decimals={2}
            />
          </div>

          {/* 目标成苗数（自动计算） */}
          <div>
            <Label className="text-gray-700">目标成苗数</Label>
            <Input
              type="text"
              value={targetSurvivalCount > 0 ? targetSurvivalCount.toLocaleString() : '—'}
              readOnly
              className={`${deepInputClass} bg-gray-100 text-gray-600 font-mono`}
            />
            <p className="text-xs text-gray-500 mt-1">初始数量 × 目标成苗率</p>
          </div>

          {/* 负责人（与目标成苗数配对，2 个一排） */}
          <div>
            <Label className="text-gray-900">负责人</Label>
            <Select
              value={formData.chargePerson}
              onValueChange={(val) => setFormData({ ...formData, chargePerson: val })}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map(op => (
                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 品质等级（2026-10-17 新增：此前只能在编辑弹窗补录） */}
          <div>
            <Label className="text-gray-900">品质等级</Label>
            <DictSelect
              category="quality_level"
              value={formData.qualityGrade}
              onChange={(value) => setFormData({ ...formData, qualityGrade: value })}
              placeholder="请选择品质等级"
            />
          </div>
        </div>
      )}

      {/* 扩繁育苗模式 */}
      {formData.calculateMode === SeedlingCalculateMode.PROPAGATION && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 母株数量 */}
            <div>
              <Label className="text-gray-900">
                母株数量 <span className="text-red-500">*</span>
              </Label>
              <NumberInput
                value={formData.motherPlantCount}
                onChange={(val) => setFormData({ ...formData, motherPlantCount: parseFloat(val) || 0 })}
                className={`${deepInputClass} ${motherCountExceeds ? 'border-red-500 ring-1 ring-red-300' : ''}`}
                placeholder="投入的基础种苗数量"
                decimals={0}
              />
              {motherCountExceeds && (
                <p className="text-xs text-red-500 mt-1">
                  超过种源可用数量（{sourceAvailableCount}）
                </p>
              )}
            </div>

            {/* 扩繁倍数 */}
            <div>
              <Label className="text-gray-900">
                扩繁倍数 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.propagationMultiple)}
                onValueChange={(val) => handlePropagationMultipleChange(Number(val))}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="请选择扩繁倍数" />
                </SelectTrigger>
                <SelectContent>
                  {propagationMultiples.map(p => (
                    // 2026-07-28 审核 M：propagationMultiple 字典项只有 value/label，没有 description，移除以避免 "undefined"
                    <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 自定义扩繁倍数输入（当选择"其他"时显示） */}
          {formData.propagationMultiple === 0 && (
            <div>
              <Label className="text-gray-900">
                自定义扩繁倍数 <span className="text-red-500">*</span>
              </Label>
              <NumberInput
                value={formData.customMultiple}
                onChange={(val) => setFormData({ ...formData, customMultiple: parseFloat(val) || 0 })}
                className={deepInputClass}
                placeholder="请输入扩繁倍数"
                decimals={2}
              />
            </div>
          )}

          {/* 理论产量（自动计算） */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700">理论产量</Label>
              <Input
                type="text"
                value={theoreticalYield > 0 ? theoreticalYield.toLocaleString() : '—'}
                readOnly
                className={`${deepInputClass} bg-gray-100 text-gray-600 font-mono`}
              />
              <p className="text-xs text-gray-500 mt-1">母株数量 × 扩繁倍数</p>
            </div>

            {/* 目标成苗率 */}
            <div>
              <Label className="text-gray-900">
                目标成苗率（%）<span className="text-red-500">*</span>
              </Label>
              <NumberInput
                value={formData.targetSurvivalRate}
                onChange={(val) => setFormData({ ...formData, targetSurvivalRate: parseFloat(val) || 0 })}
                className={deepInputClass}
                placeholder="0-100%"
                decimals={2}
              />
            </div>
          </div>

          {/* 目标成苗数（自动计算） */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700">目标成苗数</Label>
              <Input
                type="text"
                value={targetSurvivalCount > 0 ? targetSurvivalCount.toLocaleString() : '—'}
                readOnly
                className={`${deepInputClass} bg-gray-100 text-gray-600 font-mono`}
              />
              <p className="text-xs text-gray-500 mt-1">理论产量 × 目标成苗率</p>
            </div>

            {/* 负责人（与目标成苗数配对，2 个一排） */}
            <div>
              <Label className="text-gray-900">负责人</Label>
              <Select
                value={formData.chargePerson}
                onValueChange={(val) => setFormData({ ...formData, chargePerson: val })}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map(op => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 品质等级（2026-10-17 新增：此前只能在编辑弹窗补录） */}
            <div>
              <Label className="text-gray-900">品质等级</Label>
              <DictSelect
                category="quality_level"
                value={formData.qualityGrade}
                onChange={(value) => setFormData({ ...formData, qualityGrade: value })}
                placeholder="请选择品质等级"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2026-06-16: 负责人已迁移到"数量与品质"区与目标成苗数配对 */}
    </div>
  );
}
