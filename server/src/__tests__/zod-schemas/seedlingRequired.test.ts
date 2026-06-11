/**
 * CreateSeedlingSchema Zod 必填校验测试
 * 任务 5: Phase 2 业务逻辑
 *
 * 验证:
 * 1. source_id 缺失 → 校验失败 (与 db 列名一致, snake_case)
 * 2. source_id 为空字符串 → 校验失败
 * 3. source_id 有效 → 校验通过
 * 4. 错误消息清晰
 */
import { describe, it, expect } from 'vitest'
import { CreateSeedlingSchema, validateCreateSeedling } from '../../services/seedling.service'

describe('CreateSeedlingSchema source_id 必填', () => {
  it('缺失 source_id 应校验失败', () => {
    const result = CreateSeedlingSchema.safeParse({
      crop_name: '番茄',
      crop_variety: '红果',
      quantity: 100,
    })
    expect(result.success).toBe(false)
  })

  it('source_id 为空字符串应校验失败', () => {
    const result = CreateSeedlingSchema.safeParse({
      source_id: '',
      crop_name: '番茄',
      crop_variety: '红果',
      quantity: 100,
    })
    expect(result.success).toBe(false)
  })

  it('source_id 有效时应通过', () => {
    const result = CreateSeedlingSchema.safeParse({
      source_id: 'ss-001',
      crop_name: '番茄',
      crop_variety: '红果',
      quantity: 100,
    })
    expect(result.success).toBe(true)
  })

  it('错误消息应包含中文字段说明 (空字符串场景触发 min(1) 自定义消息)', () => {
    const result = CreateSeedlingSchema.safeParse({
      source_id: '',
      crop_name: '番茄',
      crop_variety: '红果',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i: any) => i.message)
      expect(messages.some((m: string) => m.includes('种源'))).toBe(true)
    }
  })

  it('validateCreateSeedling 工具函数应返回解析后数据', () => {
    const data = validateCreateSeedling({
      source_id: 'ss-002',
      crop_name: '黄瓜',
      crop_variety: '水果',
      quantity: 50,
    })
    expect(data.source_id).toBe('ss-002')
    expect(data.crop_name).toBe('黄瓜')
  })

  it('validateCreateSeedling 校验失败应抛 ZodError', () => {
    expect(() => validateCreateSeedling({
      crop_name: '番茄',
      // 缺 source_id
    })).toThrow()
  })
})
