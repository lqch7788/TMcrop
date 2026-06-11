/**
 * CreatePlantingSchema Zod refine 互斥校验测试
 * 任务 6: Phase 2 业务逻辑
 *
 * 验证:
 * 1. origin_path=direct_from_seed 时 source_id 必填
 * 2. origin_path=via_seedling 时 source_id 可空 (V1.1 现状约束, 无 seedling_batch_id 字段)
 * 3. origin_path 必须是有效枚举
 * 4. 路径与字段错配应失败
 */
import { describe, it, expect } from 'vitest'
import { CreatePlantingSchema, validateCreatePlanting } from '../../services/planting.service'

describe('CreatePlantingSchema origin_path 互斥', () => {
  it('direct_from_seed 必须填 source_id', () => {
    const result = CreatePlantingSchema.safeParse({
      origin_path: 'direct_from_seed',
      // 缺 source_id
      planting_code: 'P-001',
    })
    expect(result.success).toBe(false)
  })

  it('direct_from_seed + source_id 应通过', () => {
    const result = CreatePlantingSchema.safeParse({
      origin_path: 'direct_from_seed',
      source_id: 'ss-001',
      planting_code: 'P-001',
    })
    expect(result.success).toBe(true)
  })

  it('via_seedling 暂不强校验 (V1.1 现状约束)', () => {
    const result = CreatePlantingSchema.safeParse({
      origin_path: 'via_seedling',
      // 不强校验 seedling_batch_id (V1.1 表无此字段)
      planting_code: 'P-002',
    })
    expect(result.success).toBe(true)
  })

  it('origin_path 必须是有效枚举', () => {
    const result = CreatePlantingSchema.safeParse({
      origin_path: 'invalid_path',
      source_id: 'ss-001',
    })
    expect(result.success).toBe(false)
  })

  it('origin_path 缺失应失败', () => {
    const result = CreatePlantingSchema.safeParse({
      source_id: 'ss-001',
      planting_code: 'P-003',
    })
    expect(result.success).toBe(false)
  })

  it('validateCreatePlanting 工具函数应返回解析后数据', () => {
    const data = validateCreatePlanting({
      origin_path: 'direct_from_seed',
      source_id: 'ss-002',
      planting_code: 'P-004',
    })
    expect(data.origin_path).toBe('direct_from_seed')
    expect(data.source_id).toBe('ss-002')
  })

  it('validateCreatePlanting 互斥校验失败应抛 ZodError', () => {
    expect(() => validateCreatePlanting({
      origin_path: 'direct_from_seed',
      // 缺 source_id
    })).toThrow()
  })
})
