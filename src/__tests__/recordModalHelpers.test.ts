/**
 * 2026-07-03 v3：recordModal 工具函数单元测试
 * - validateBreedingForm 校验器
 * - getRateColor 颜色阈值
 * - OPERATION_TYPES/SEXUAL/ASEXUAL 分类
 */

import { describe, it, expect } from 'vitest'
import { validateBreedingForm, type BreedingFormState } from '@/components/farm/planting/modals/recordModalValidators'
import { getRateColor, OPERATION_TYPES, SEXUAL_OPERATION_TYPES, ASEXUAL_OPERATION_TYPES } from '@/components/farm/planting/modals/recordModalConstants'

// ============ validateBreedingForm 测试 ============

describe('validateBreedingForm', () => {
  const baseForm: BreedingFormState = {
    recordDate: '2026-07-03',
    operationType: 'cross',
  }

  it('通过：完整有性 cross 记录', () => {
    expect(validateBreedingForm({ ...baseForm, parentMaleCode: 'M1' })).toBeNull()
  })

  it('失败：缺记录日期', () => {
    expect(validateBreedingForm({ ...baseForm, recordDate: '', parentMaleCode: 'M1' })).toBe('请选择记录日期')
  })

  it('失败：cross 缺父本', () => {
    expect(validateBreedingForm({ ...baseForm, parentMaleCode: '' })).toBe('杂交/回交时父本编码必填')
  })

  it('失败：backcross 缺父本', () => {
    expect(validateBreedingForm({ ...baseForm, operationType: 'backcross' })).toBe('杂交/回交时父本编码必填')
  })

  it('通过：self 自交（无父本）', () => {
    expect(validateBreedingForm({ ...baseForm, operationType: 'self' })).toBeNull()
  })

  it('通过：marker 标记（无任何必填）', () => {
    expect(validateBreedingForm({ ...baseForm, operationType: 'marker' })).toBeNull()
  })

  it('失败：父本 = 母本', () => {
    expect(validateBreedingForm({ ...baseForm, parentMaleCode: 'M1', parentFemaleCode: 'M1' })).toBe('父本编码不能与母本编码相同')
  })

  it('失败：无性 asexual 缺母株', () => {
    expect(validateBreedingForm({ ...baseForm, operationType: 'cutting' })).toBe('无性繁殖时母株编码必填')
  })

  it('通过：无性 asexual cutting 含母株', () => {
    expect(validateBreedingForm({ ...baseForm, operationType: 'cutting', motherPlantCode: 'M_GRAPE_001' })).toBeNull()
  })

  it('通过：无性 asexual 6 种 op 全过', () => {
    for (const op of ['clonal', 'cutting', 'grafting', 'layering', 'tissue', 'division'] as const) {
      expect(validateBreedingForm({ ...baseForm, operationType: op, motherPlantCode: 'M1' })).toBeNull()
    }
  })

  it('失败：有性填了母株', () => {
    expect(validateBreedingForm({ ...baseForm, parentMaleCode: 'M1', motherPlantCode: 'BAD' })).toBe('有性繁殖不应填写无性字段（母株/繁殖方式/接种数/成活数）')
  })

  it('失败：有性填了接种数 > 0', () => {
    expect(validateBreedingForm({ ...baseForm, parentMaleCode: 'M1', inoculationCount: 10 })).toBe('有性繁殖不应填写无性字段（母株/繁殖方式/接种数/成活数）')
  })

  it('通过：有性 inoculationCount = 0 (不视为填了)', () => {
    expect(validateBreedingForm({ ...baseForm, parentMaleCode: 'M1', inoculationCount: 0 })).toBeNull()
  })
})

// ============ getRateColor 测试 ============

describe('getRateColor', () => {
  it('sexual: ≥ 50% 绿色', () => {
    expect(getRateColor(75, 'sexual')).toBe('text-emerald-700')
    expect(getRateColor(50, 'sexual')).toBe('text-emerald-700')
  })
  it('sexual: 20-50% 琥珀', () => {
    expect(getRateColor(30, 'sexual')).toBe('text-amber-600')
    expect(getRateColor(20, 'sexual')).toBe('text-amber-600')
  })
  it('sexual: < 20% 红色', () => {
    expect(getRateColor(19.9, 'sexual')).toBe('text-red-600')
    expect(getRateColor(0, 'sexual')).toBe('text-red-600')
  })
  it('asexual: ≥ 80% 绿色', () => {
    expect(getRateColor(95, 'asexual')).toBe('text-emerald-700')
    expect(getRateColor(80, 'asexual')).toBe('text-emerald-700')
  })
  it('asexual: 50-80% 琥珀', () => {
    expect(getRateColor(70, 'asexual')).toBe('text-amber-600')
    expect(getRateColor(50, 'asexual')).toBe('text-amber-600')
  })
  it('asexual: < 50% 红色', () => {
    expect(getRateColor(40, 'asexual')).toBe('text-red-600')
    expect(getRateColor(0, 'asexual')).toBe('text-red-600')
  })
})

// ============ 操作类型分类测试 ============

describe('operation type classification', () => {
  it('OPERATION_TYPES 包含 12 个枚举', () => {
    expect(OPERATION_TYPES.length).toBe(12)
  })
  it('SEXUAL_OPERATION_TYPES 包含 6 个有性 op', () => {
    expect(SEXUAL_OPERATION_TYPES.length).toBe(6)
    expect(SEXUAL_OPERATION_TYPES).toContain('cross')
    expect(SEXUAL_OPERATION_TYPES).toContain('self')
  })
  it('ASEXUAL_OPERATION_TYPES 包含 6 个无性 op', () => {
    expect(ASEXUAL_OPERATION_TYPES.length).toBe(6)
    expect(ASEXUAL_OPERATION_TYPES).toContain('cutting')
    expect(ASEXUAL_OPERATION_TYPES).toContain('grafting')
  })
  it('SEXUAL ∩ ASEXUAL = ∅', () => {
    const intersection = SEXUAL_OPERATION_TYPES.filter(x => ASEXUAL_OPERATION_TYPES.includes(x))
    expect(intersection.length).toBe(0)
  })
  it('SEXUAL ∪ ASEXUAL = OPERATION_TYPES', () => {
    const all = [...SEXUAL_OPERATION_TYPES, ...ASEXUAL_OPERATION_TYPES]
    expect(all.sort()).toEqual([...OPERATION_TYPES].sort())
  })
})
