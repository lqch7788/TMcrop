/**
 * crop_circulation_records 迁移测试
 * 验证 fixMissingSchema 中新增的 runCreateCropCirculationRecordsMigration 函数:
 * 1. 幂等性: 重复执行不报错
 * 2. CREATE TABLE 语句被调用
 * 3. CHECK 约束正确 (circulation_type + source_module)
 * 4. 索引创建语句被调用
 * 5. residue_type 和 disposition 可空列存在
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// 模拟 sql.js 数据库
const mockDb = {
  run: vi.fn(),
  exec: vi.fn(),
  prepare: vi.fn(),
}

// 模拟 getDatabase
vi.mock('../../db/index', () => ({
  getDatabase: () => mockDb,
}))

// 模拟 seedLogger
vi.mock('../../lib/seedLogger', () => ({
  seedLog: {
    info: vi.fn(),
    skip: vi.fn(),
    error: vi.fn(),
  },
}))

// 导入被测试的函数
import { runCreateCropCirculationRecordsMigration } from '../../db/migrations/cropCirculationRecords'

describe('crop_circulation_records 迁移', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.run.mockImplementation(() => {})
    mockDb.exec.mockReturnValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('幂等性测试', () => {
    it('应该能多次调用而不报错', () => {
      expect(() => runCreateCropCirculationRecordsMigration(mockDb as any)).not.toThrow()
      expect(() => runCreateCropCirculationRecordsMigration(mockDb as any)).not.toThrow()
    })
  })

  describe('CREATE TABLE 语句', () => {
    it('应该创建 crop_circulation_records 表', () => {
      runCreateCropCirculationRecordsMigration(mockDb as any)

      const createCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('crop_circulation_records')
      )
      expect(createCalls.length).toBe(1)

      const sql = createCalls[0][0]
      expect(sql).toContain('id TEXT PRIMARY KEY')
      expect(sql).toContain('circulation_type TEXT NOT NULL')
      expect(sql).toContain('source_module TEXT NOT NULL')
      expect(sql).toContain('source_id TEXT NOT NULL')
      expect(sql).toContain('parent_source_id TEXT NOT NULL')
      expect(sql).toContain('circulation_date TEXT NOT NULL')
    })

    it('应包含软删除字段 (is_revoked, revoked_at, revoked_by)', () => {
      runCreateCropCirculationRecordsMigration(mockDb as any)

      const createCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('crop_circulation_records')
      )
      const sql = createCalls[0][0]
      expect(sql).toContain('is_revoked INTEGER DEFAULT 0')
      expect(sql).toContain('revoked_at TEXT')
      expect(sql).toContain('revoked_by TEXT')
    })

    it('应包含残株 2 列 (residue_type, disposition)', () => {
      runCreateCropCirculationRecordsMigration(mockDb as any)

      const createCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('crop_circulation_records')
      )
      const sql = createCalls[0][0]
      expect(sql).toContain('residue_type TEXT')
      expect(sql).toContain('disposition TEXT')
    })
  })

  describe('CHECK 约束', () => {
    it('circulation_type 应仅允许 3 个枚举值', () => {
      runCreateCropCirculationRecordsMigration(mockDb as any)

      const createCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('crop_circulation_records')
      )
      const sql = createCalls[0][0]
      expect(sql).toMatch(/circulation_type IN \('PROPAGATION','QUANTITY','DISPOSAL'\)/)
    })

    it('source_module 应仅允许 3 个枚举值', () => {
      runCreateCropCirculationRecordsMigration(mockDb as any)

      const createCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('crop_circulation_records')
      )
      const sql = createCalls[0][0]
      expect(sql).toMatch(/source_module IN \('planting','harvest','seedling'\)/)
    })
  })

  describe('外键', () => {
    it('应引用 seed_sources 表 (parent_source_id, new_source_id)', () => {
      runCreateCropCirculationRecordsMigration(mockDb as any)

      const createCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('crop_circulation_records')
      )
      const sql = createCalls[0][0]
      expect(sql).toContain('FOREIGN KEY (parent_source_id) REFERENCES seed_sources(id)')
      expect(sql).toContain('FOREIGN KEY (new_source_id) REFERENCES seed_sources(id)')
    })
  })

  describe('索引创建', () => {
    it('应创建 idx_circ_parent 索引', () => {
      runCreateCropCirculationRecordsMigration(mockDb as any)

      const indexCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE INDEX') && call[0].includes('idx_circ_parent')
      )
      expect(indexCalls.length).toBeGreaterThanOrEqual(1)
    })

    it('应创建 idx_circ_source 索引', () => {
      runCreateCropCirculationRecordsMigration(mockDb as any)

      const indexCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE INDEX') && call[0].includes('idx_circ_source')
      )
      expect(indexCalls.length).toBeGreaterThanOrEqual(1)
    })
  })
})
