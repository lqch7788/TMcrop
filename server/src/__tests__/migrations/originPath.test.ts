/**
 * plantings.origin_path 两步迁移测试
 * 任务 2: Phase 1a 数据 schema 改造
 *
 * 验证 runAddOriginPathMigration 函数:
 * 1. 步骤 1: ALTER TABLE 加 origin_path 列 (无 DEFAULT)
 * 2. 步骤 2: UPDATE 历史数据 (source_type='育苗' → origin_path='via_seedling')
 * 3. dryRun 模式: 步骤 1 仍执行, 步骤 2 跳过
 * 4. 幂等: 重复执行不报错
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const mockDb = {
  run: vi.fn(),
  exec: vi.fn(),
  prepare: vi.fn(),
}

vi.mock('../../db/index', () => ({
  getDatabase: () => mockDb,
}))

vi.mock('../../lib/seedLogger', () => ({
  seedLog: {
    info: vi.fn(),
    skip: vi.fn(),
    error: vi.fn(),
  },
}))

import { runAddOriginPathMigration } from '../../db/migrations/originPath'

describe('plantings.origin_path 两步迁移', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.run.mockImplementation(() => {})
    mockDb.exec.mockReturnValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('步骤 1: ALTER TABLE 加列', () => {
    it('应执行 ALTER TABLE 添加 origin_path 列', () => {
      runAddOriginPathMigration(mockDb as any, { dryRun: false })

      const alterCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('ALTER TABLE plantings') && call[0].includes('origin_path')
      )
      expect(alterCalls.length).toBeGreaterThanOrEqual(1)

      const sql = alterCalls[0][0]
      expect(sql).toContain('ADD COLUMN origin_path TEXT')
    })

    it('应包含 CHECK 约束 (direct_from_seed, via_seedling)', () => {
      runAddOriginPathMigration(mockDb as any, { dryRun: false })

      const alterCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('ALTER TABLE plantings') && call[0].includes('origin_path')
      )
      const sql = alterCalls[0][0]
      expect(sql).toMatch(/CHECK\(origin_path IN \('direct_from_seed','via_seedling'\)\)/)
    })

    it('不应在 ALTER TABLE 中使用 DEFAULT (避免污染历史数据)', () => {
      runAddOriginPathMigration(mockDb as any, { dryRun: false })

      const alterCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('ALTER TABLE plantings') && call[0].includes('origin_path')
      )
      const sql = alterCalls[0][0]
      // 关键: 不应包含 DEFAULT 子句
      expect(sql).not.toMatch(/DEFAULT\s+'direct_from_seed'/)
    })
  })

  describe('步骤 2: UPDATE 历史回填', () => {
    it('应执行 UPDATE 历史数据 (source_type=育苗 → via_seedling)', () => {
      runAddOriginPathMigration(mockDb as any, { dryRun: false })

      const updateCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('UPDATE plantings') && call[0].includes('origin_path')
      )
      expect(updateCalls.length).toBeGreaterThanOrEqual(1)

      const sql = updateCalls[0][0]
      expect(sql).toContain("source_type = '育苗'")
      expect(sql).toContain("origin_path = 'via_seedling'")
      expect(sql).toContain('origin_path IS NULL')
    })
  })

  describe('dryRun 模式', () => {
    it('应跳过步骤 2 (UPDATE)', () => {
      runAddOriginPathMigration(mockDb as any, { dryRun: true })

      const updateCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('UPDATE plantings')
      )
      expect(updateCalls.length).toBe(0)
    })

    it('应仍执行步骤 1 (ALTER TABLE) - 因为 ALTER 自身幂等', () => {
      runAddOriginPathMigration(mockDb as any, { dryRun: true })

      const alterCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('ALTER TABLE plantings') && call[0].includes('origin_path')
      )
      expect(alterCalls.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('幂等性', () => {
    it('应能多次调用而不报错', () => {
      expect(() => runAddOriginPathMigration(mockDb as any, { dryRun: false })).not.toThrow()
      expect(() => runAddOriginPathMigration(mockDb as any, { dryRun: false })).not.toThrow()
    })
  })

  describe('默认 dryRun', () => {
    it('不传 dryRun 参数时默认 false (执行 UPDATE)', () => {
      runAddOriginPathMigration(mockDb as any)

      const updateCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('UPDATE plantings')
      )
      expect(updateCalls.length).toBeGreaterThanOrEqual(1)
    })
  })
})
