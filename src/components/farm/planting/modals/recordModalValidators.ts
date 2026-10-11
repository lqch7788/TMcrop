/**
 * 2026-07-03 v5：RecordModal 校验器（仅有性繁殖）
 * 无性繁殖（组培/扦插/嫁接/压条/分株）已迁移至育苗模块
 */

import type { BreedingRecordInput } from '@/services/apiPlantingSubRecordService'

/**
 * 育种表单状态（v5 缩简：仅含有性字段）
 *
 * 2026-10-11：改为直接复用 Service 的 BreedingRecordInput —— 两者原先各写一份同名结构，
 *   parentMaleSource/parentFemaleSource（ParentSource vs string）、reproductionMode（含 null）
 *   的差异导致 RecordModal ↔ BreedingFields 之间双向赋值全部报 TS2345/TS2322。
 */
export type BreedingFormState = BreedingRecordInput

/**
 * 育种表单前端校验（仅有性繁殖）
 * @returns null = 通过；string = 错误信息
 */
export function validateBreedingForm(form: BreedingFormState): string | null {
  if (!form.recordDate) return '请选择记录日期'
  if (form.parentMaleCode && form.parentFemaleCode && form.parentMaleCode === form.parentFemaleCode) {
    return '父本编码不能与母本编码相同'
  }
  return null
}
