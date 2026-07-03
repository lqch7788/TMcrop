/**
 * 2026-07-03 v3：RecordModal 校验器
 * - 前端 BreedingFormState 校验
 * - 后端数据校验函数（被 server 端 import 也可以）
 */

import { ASEXUAL_OPERATION_TYPES } from './recordModalConstants'
import type { BreedingOperationType, PropagationMethod } from '@/services/apiPlantingSubRecordService'

/** 扩展 form 状态：包含繁殖模式 */
export type BreedingFormState = {
  recordDate: string
  operationType: BreedingOperationType
  parentMaleCode?: string | null
  parentFemaleCode?: string | null
  motherPlantCode?: string | null
  propagationMethod?: PropagationMethod | null
  inoculationCount?: number | null
  survivalCount?: number | null
  reproductionMode?: 'sexual' | 'asexual'
}

/**
 * 育种表单前端校验（与后端 server/src/routes/plantingRecords.ts 校验逻辑对齐）
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
  if (ASEXUAL_OPERATION_TYPES.includes(form.operationType) && !form.motherPlantCode) {
    return '无性繁殖时母株编码必填'
  }
  if (!ASEXUAL_OPERATION_TYPES.includes(form.operationType)) {
    if (form.motherPlantCode || form.propagationMethod || (form.inoculationCount && form.inoculationCount > 0) || (form.survivalCount && form.survivalCount > 0)) {
      return '有性繁殖不应填写无性字段（母株/繁殖方式/接种数/成活数）'
    }
  }
  return null
}
