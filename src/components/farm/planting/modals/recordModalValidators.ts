/**
 * 2026-07-03 v5：RecordModal 校验器（仅有性繁殖）
 * 无性繁殖（组培/扦插/嫁接/压条/分株）已迁移至育苗模块
 */

import type { BreedingOperationType, PropagationMethod } from '@/services/apiPlantingSubRecordService'

/** 扩展 form 状态（v5 缩简：仅含有性字段） */
export type BreedingFormState = {
  recordDate: string
  operationType: BreedingOperationType
  generation?: string | null
  parentMaleCode?: string | null
  parentFemaleCode?: string | null
  parentMaleSource?: string | null
  parentFemaleSource?: string | null
  operator?: string | null
  remarks?: string | null
  targetTraits?: string[] | null
  fruitCount?: number | null
  seedCount?: number | null
  pollinatedFlowerCount?: number | null
  /** @deprecated v5：保留字段兼容历史数据，UI 不再使用 */
  motherPlantCode?: string | null
  propagationMethod?: PropagationMethod | null
  inoculationCount?: number | null
  survivalCount?: number | null
  reproductionMode?: 'sexual' | 'asexual'
}

/**
 * 育种表单前端校验（仅有性繁殖）
 * @returns null = 通过；string = 错误信息
 */
export function validateBreedingForm(form: BreedingFormState): string | null {
  if (!form.recordDate) return '请选择记录日期'
  if ((form.operationType === 'cross' || form.operationType === 'backcross') && !form.parentMaleCode) {
    return '杂交/回交时父本编码必填'
  }
  if (form.parentMaleCode && form.parentFemaleCode && form.parentMaleCode === form.parentFemaleCode) {
    return '父本编码不能与母本编码相同'
  }
  return null
}
