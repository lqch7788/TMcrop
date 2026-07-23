/**
 * 2026-07-03 v4：留种记录工具函数单元测试
 * - validateSeedSavingForm 校验器
 * - getSeedSavingRateColor 颜色阈值
 * - VEGETATIVE_HARVEST_PARTS 分类
 */

import { describe, it, expect } from 'vitest'
import {
  validateSeedSavingForm,
  getSeedSavingRateColor,
  VEGETATIVE_HARVEST_PARTS,
  SEED_HARVEST_PARTS,
} from '@/components/farm/planting/modals/seedSavingConstants'
import type { SeedSavingFormState } from '@/components/farm/planting/modals/seedSavingConstants'

describe('validateSeedSavingForm', () => {
  const base: SeedSavingFormState = {
    recordDate: '2026-07-03',
    plantMarker: 'A区-001',
  }

  it('通过：完整记录', () => {
    expect(validateSeedSavingForm(base)).toBeNull()
  })

  it('失败：缺记录日期', () => {
    expect(validateSeedSavingForm({ ...base, recordDate: '' })).toBe('请选择记录日期')
  })

  it('失败：缺留种株号', () => {
    expect(validateSeedSavingForm({ ...base, plantMarker: '' })).toBe('请输入留种株号')
  })

  it('通过：种子模式 + 完整种子字段', () => {
    expect(validateSeedSavingForm({ ...base, preservationMode: 'seed', germinationRate: 92 })).toBeNull()
  })

  it('通过：营养体模式 + 完整营养体字段', () => {
    expect(validateSeedSavingForm({ ...base, preservationMode: 'vegetative', harvestPart: 'tuber', sizeGrade: 'large' })).toBeNull()
  })
})

describe('getSeedSavingRateColor', () => {
  it('≥ 80% 绿色', () => {
    expect(getSeedSavingRateColor(85)).toBe('text-emerald-700')
    expect(getSeedSavingRateColor(80)).toBe('text-emerald-700')
  })
  it('50-80% 琥珀', () => {
    expect(getSeedSavingRateColor(75)).toBe('text-amber-600')
    expect(getSeedSavingRateColor(50)).toBe('text-amber-600')
  })
  it('< 50% 红色', () => {
    expect(getSeedSavingRateColor(30)).toBe('text-red-600')
    expect(getSeedSavingRateColor(0)).toBe('text-red-600')
  })
})

describe('harvest part classification', () => {
  it('VEGETATIVE 含 10 个营养体部位', () => {
    expect(VEGETATIVE_HARVEST_PARTS.length).toBe(10)
    expect(VEGETATIVE_HARVEST_PARTS).toContain('tuber')
    expect(VEGETATIVE_HARVEST_PARTS).toContain('whole_plant')
  })
  it('SEED 含 2 个有性器官', () => {
    expect(SEED_HARVEST_PARTS.length).toBe(2)
    expect(SEED_HARVEST_PARTS).toContain('seed')
    expect(SEED_HARVEST_PARTS).toContain('fruit')
  })
})
